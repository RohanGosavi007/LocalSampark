const logger = require('./logger.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure data directory exists
const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Overridable so the test harness can point at an isolated file. Without this
// the suite ran against the shared development database, where a divergent
// schema broke seeding and every run mutated real dev data.
const dbPath = process.env.SQLITE_DB_PATH || path.join(dbDir, 'localsampark.db');
const db = new sqlite3.Database(dbPath);

// Helper function to translate PG query to SQLite
function translateQuery(sql, params = []) {
  let cleanSql = sql;
  
  // Replace ST_GeomFromText('POINT(lng lat)', 4326) with 'POINT(lng lat)'
  cleanSql = cleanSql.replace(/ST_GeomFromText\(\s*'POINT\(([^)]+)\)'\s*,\s*4326\)/gi, "'POINT($1)'");
  
  // Replace next_delivery_date + INTERVAL '1 day' with date(next_delivery_date, '+1 day')
  cleanSql = cleanSql.replace(/(?:([\w]+)\.)?next_delivery_date\s*\+\s*INTERVAL\s*'1 day'/gi, (match, prefix) => {
    return prefix ? `date(${prefix}.next_delivery_date, '+1 day')` : `date(next_delivery_date, '+1 day')`;
  });

  // Remove FOR UPDATE (unsupported in SQLite)
  cleanSql = cleanSql.replace(/\s+FOR\s+UPDATE\b/gi, "");

  // Replace PostgreSQL NOW() with SQLite datetime('now')
  cleanSql = cleanSql.replace(/\bNOW\(\)/gi, "datetime('now')");

  // Replace PostgreSQL INTERVAL patterns: NOW() - INTERVAL '30 days' -> datetime('now', '-30 days')
  cleanSql = cleanSql.replace(/datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s+(\w+)'/gi, (match, n, unit) => {
    return `datetime('now', '-${n} ${unit}')`;
  });
  cleanSql = cleanSql.replace(/datetime\('now'\)\s*\+\s*INTERVAL\s*'(\d+)\s+(\w+)'/gi, (match, n, unit) => {
    return `datetime('now', '+${n} ${unit}')`;
  });

  // If no params, return as is
  if (!params || params.length === 0) {
    return { sql: cleanSql, params: [] };
  }

  const paramRegex = /\$([0-9]+)/g;
  const newParams = [];

  cleanSql = cleanSql.replace(paramRegex, (match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    newParams.push(params[idx]);
    return '?';
  });

  return { sql: cleanSql, params: newParams };
}

// Intercept INSERT statements to inject UUIDs if necessary
// This is because SQLite doesn't automatically generate UUIDs for PKs unless configured,
// and we want to ensure inserting rows generates valid UUIDs in JS
/**
 * Does this table declare `id INTEGER PRIMARY KEY`?
 *
 * Such an id is SQLite's rowid: it is assigned automatically and rejects a
 * string. Read from sqlite_master and cached, so the decision follows the real
 * schema instead of a hand-maintained list that silently goes stale whenever a
 * table is added.
 */
const integerPkCache = new Map();
function hasIntegerPrimaryKey(tableName) {
  if (integerPkCache.has(tableName)) return integerPkCache.get(tableName);

  let result = false;
  try {
    // Synchronous read against the cached schema snapshot; falls back to false
    // (previous behaviour) if it cannot be determined.
    const row = schemaSnapshot.get(tableName);
    // The name may be quoted: a table that has been rebuilt (see
    // migrations/lib/sqliteRebuild.js) is stored as `"id" INTEGER PRIMARY KEY`.
    // Matching only the bare form took those tables for UUID-keyed ones, and
    // every INSERT into them was handed a UUID for an integer rowid —
    // SQLITE_MISMATCH on adding a catalogue item, among others.
    if (row) result = /(^|[(,\s])["`[]?id["`\]]?\s+INTEGER\s+PRIMARY\s+KEY/i.test(row);
  } catch (_e) { /* keep false */ }

  integerPkCache.set(tableName, result);
  return result;
}

/**
 * Does this table have a column called `id` at all?
 *
 * prepareInsert used to add one to every INSERT that did not name it, whatever
 * the table. Eight tables in live use are keyed on something else — a user_id,
 * a config key, a pair of ids — and have no `id` column, so each of those
 * statements failed with "table loyalty_accounts has no column named id":
 * opening a loyalty account, adding an emergency contact, saving a platform
 * setting, taking a queue token.
 *
 * Answered from PRAGMA table_info where that loaded, and from the CREATE TABLE
 * text otherwise. A table the snapshot has never heard of answers true, which
 * is the behaviour the shim had before it could tell the difference.
 */
function hasIdColumn(tableName) {
  if (idColumnTables !== null) {
    if (idColumnTables.has(tableName)) return true;
    if (schemaSnapshot.has(tableName)) return false;
    return true;
  }
  const ddl = schemaSnapshot.get(tableName);
  if (!ddl) return true;
  return /[(,]\s*["`[]?id["`\]]?\s+[A-Za-z]/i.test(ddl) || /[(,]\s*["`[]?id["`\]]?\s*[,)]/i.test(ddl);
}

/**
 * table -> CREATE TABLE text, loaded at startup and reloaded when query() meets
 * a table it does not know. prepareInsert runs synchronously inside query(), so
 * it cannot await an introspection call of its own.
 */
const schemaSnapshot = new Map();
/** Tables that have an `id` column, or null when table_info could not be read. */
let idColumnTables = null;
let schemaReady = null;

function loadSchemaSnapshot(force = false) {
  // Kicked off at module load and awaited by query(), so it is populated before
  // the first INSERT regardless of entry point. Tying it to connectDB() alone
  // was not enough: the test suite and the CLI scripts call query() directly,
  // and with an empty snapshot every table looked like a UUID table again.
  if (schemaReady && !force) return schemaReady;
  schemaReady = new Promise((resolve) => {
    try {
      db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err || !rows) return resolve();

        schemaSnapshot.clear();
        for (const r of rows) schemaSnapshot.set(String(r.name).toLowerCase(), r.sql || '');
        integerPkCache.clear();

        // The table-valued pragma joins once across every table. If this build
        // of SQLite lacks it, hasIdColumn falls back to reading the DDL text.
        db.all(
          `SELECT m.name AS tbl
             FROM sqlite_master m
             JOIN pragma_table_info(m.name) p
            WHERE m.type = 'table' AND lower(p.name) = 'id'`,
          (infoErr, infoRows) => {
            idColumnTables = infoErr || !infoRows
              ? null
              : new Set(infoRows.map((r) => String(r.tbl).toLowerCase()));
            resolve();
          }
        );
      });
    } catch (_e) {
      resolve(); // fall back to previous behaviour rather than blocking queries
    }
  });
  return schemaReady;
}

/** The table an INSERT writes to, lower-cased, or null for any other statement. */
function insertTarget(sql) {
  const m = typeof sql === 'string' && sql.match(/^\s*INSERT\s+(?:OR\s+\w+\s+)?INTO\s+["`]?(\w+)/i);
  return m ? m[1].toLowerCase() : null;
}

// Start immediately; query() awaits it.
loadSchemaSnapshot();

/**
 * Foreign-key enforcement.
 *
 * SQLite ships with this OFF, so every REFERENCES clause in the schema was
 * decorative: a shop could be inserted owned by user 999999999 and nothing
 * complained. The database had accumulated 9 orphaned rows as a result.
 *
 * It could not simply be switched on before now. 13 tables declared
 * `id INTEGER PRIMARY KEY` while PostgreSQL declared UUID/TEXT, so foreign keys
 * holding UUID-shaped values could never match an integer key — enforcement
 * would have rejected almost everything. Those tables were converted to TEXT
 * ids first (scripts/migrate-pk-types.js) and the orphans cleared.
 *
 * The pragma is per-connection, so it belongs here rather than in a migration.
 */
db.run('PRAGMA foreign_keys = ON', (err) => {
  if (err) console.error('[db] could not enable foreign key enforcement:', err.message);
});

/**
 * Index just past the parenthesis that closes the group opened before `from`,
 * or -1 if it never closes. Parentheses inside single-quoted strings are text.
 */
function closingParen(sql, from) {
  let depth = 1;
  let inString = false;
  for (let i = from; i < sql.length; i += 1) {
    const ch = sql[i];
    if (inString) {
      if (ch === "'") {
        if (sql[i + 1] === "'") i += 1; // '' is an escaped quote, not the end
        else inString = false;
      }
      continue;
    }
    if (ch === "'") inString = true;
    else if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Gives an INSERT a generated id when it names none, as a PostgreSQL column
 * default of uuid_generate_v4() would.
 *
 * Only for tables whose id is actually a text/UUID key. This used to be decided
 * by a hardcoded list of three exceptions, so every other table with
 * `id INTEGER PRIMARY KEY` — local_shops among them — received a UUID string
 * into an integer column and every such INSERT failed with SQLITE_MISMATCH. The
 * schema is the authority on this, not a literal list.
 *
 * The rewrite itself was two regular expressions, which is correct for
 * `INSERT INTO t (a, b) VALUES ($1, $2)` and for nothing more involved:
 *
 *   - It renumbered $n only inside the first run of text up to a ')'. A
 *     placeholder anywhere after that kept its old number while the parameter
 *     list had grown by one, so it bound the value before the one intended.
 *     `... ON CONFLICT (config_key) DO UPDATE SET config_value = $1` wrote the
 *     generated UUID as the setting — toggling maintenance mode a second time
 *     stored a random id in place of true/false — and
 *     `VALUES ((SELECT id FROM wallets WHERE user_id = $1), $2, ...)` recorded
 *     the user's id as the transaction amount.
 *   - It added the column to INSERT ... SELECT, which has no VALUES list to add
 *     a value to, and to tables that have no id column.
 *
 * Every placeholder in the statement is now renumbered, the VALUES group is
 * found by matching parentheses, and the shapes that cannot be given an id
 * this way — INSERT ... SELECT, several rows at once — are left exactly as
 * written rather than half-rewritten.
 */
function prepareInsert(sql, params) {
  if (!params || typeof sql !== 'string') return { sql, params };

  const head = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+["`]?(\w+)["`]?\s*\(([^)]+)\)\s*VALUES\s*\(/i);
  if (!head) return { sql, params };

  const tableName = head[1].toLowerCase();
  const columns = head[2].split(',').map((c) => c.trim().replace(/["`]/g, '').toLowerCase());
  if (columns.includes('id')) return { sql, params };
  if (hasIntegerPrimaryKey(tableName) || !hasIdColumn(tableName)) return { sql, params };

  const valuesStart = head.index + head[0].length; // just inside "VALUES ("
  const valuesEnd = closingParen(sql, valuesStart);
  if (valuesEnd === -1) return { sql, params };
  if (/^\s*,\s*\(/.test(sql.slice(valuesEnd))) return { sql, params }; // several rows

  const columnsStart = head.index + head[0].indexOf('(') + 1;
  const shift = (text) => text.replace(/\$([0-9]+)/g, (_m, n) => `$${parseInt(n, 10) + 1}`);

  const newSql =
    shift(sql.slice(0, columnsStart)) +
    'id, ' +
    shift(sql.slice(columnsStart, valuesStart)) +
    '$1, ' +
    shift(sql.slice(valuesStart));

  return { sql: newSql, params: [uuidv4(), ...params] };
}

async function connectDB() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check database connection
      loadSchemaSnapshot();
      db.get('SELECT 1', (err) => {
        if (err) {
          console.error('❌ SQLite connection failed:', err.message);
          return reject(err);
        }
        
        db.run("PRAGMA journal_mode = WAL;", (err1) => {
          db.run("ALTER TABLE local_shops ADD COLUMN is_featured INTEGER DEFAULT 0", (err2) => {
            db.run("ALTER TABLE local_shops ADD COLUMN rating REAL DEFAULT 4.5", (err3) => {
              db.run("ALTER TABLE local_shops ADD COLUMN commission_override_percent REAL DEFAULT NULL", (err4) => {
                logger.info(`📂 SQLite connected. Database location: ${dbPath}`);
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

// Standard query execution helper
async function query(text, params = []) {
  // prepareInsert decides whether to inject a UUID id, which depends on the
  // table's primary-key type. Awaiting here makes that decision correct from
  // the very first query instead of only after connectDB() has run.
  await loadSchemaSnapshot();
  // The snapshot is taken when this module loads, which for a migration run is
  // before any table exists: the runner applies DDL through pool.exec, not
  // through here. An INSERT into a table the snapshot has not seen means it is
  // out of date, so it is retaken once before deciding how to rewrite.
  const target = insertTarget(text);
  if (target && !schemaSnapshot.has(target)) await loadSchemaSnapshot(true);
  let { sql, params: processedParams } = prepareInsert(text, params);
  const translated = translateQuery(sql, processedParams);

  // DDL issued through query() changes what the snapshot should say, so it is
  // discarded once the statement has run and retaken by the next query.
  const changesSchema = /^\s*(CREATE|ALTER|DROP)\s+(TABLE|VIRTUAL)/i.test(text);
  const settle = (fn) => (value) => {
    if (changesSchema) schemaReady = null;
    fn(value);
  };

  return new Promise((resolvePromise, rejectPromise) => {
    const resolve = settle(resolvePromise);
    const reject = settle(rejectPromise);
    // Row-returning statements must go through db.all(); db.run() executes them
    // but discards the result set. This previously only recognised SELECT and
    // RETURNING, so PRAGMA table_info(...) silently resolved to zero rows —
    // which made schema introspection impossible and sent the migration-audit
    // tooling down a long detour of unreliable DDL text-parsing. CTEs and
    // EXPLAIN had the same problem.
    const head = translated.sql.trim().toUpperCase();
    const isSelect =
      head.startsWith('SELECT') ||
      head.startsWith('PRAGMA') ||
      head.startsWith('WITH') ||
      head.startsWith('EXPLAIN') ||
      head.startsWith('VALUES') ||
      /\bRETURNING\b/i.test(translated.sql);
    
    if (isSelect) {
      db.all(translated.sql, translated.params, (err, rows) => {
        if (err) {
          console.error(`❌ SQLite Select Query Error:`, translated.sql, err.message);
          reject(err);
        } else {
          resolve({ rows, rowCount: rows.length });
        }
      });
    } else {
      db.run(translated.sql, translated.params, function(err) {
        if (err) {
          if (!err.message.includes('duplicate column name')) {
            console.error(`❌ SQLite Run Query Error:`, translated.sql, err.message);
          }
          reject(err);
        } else {
          resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
        }
      });
    }
  });
}

async function queryOne(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

async function queryMany(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

// Transaction helper
/**
 * Transactions, one at a time.
 *
 * This driver has a single connection, and SQLite has one transaction per
 * connection. withTransaction used to issue BEGIN straight away, so a second
 * request arriving while the first was mid-transaction failed with "cannot
 * start a transaction within a transaction" — any two users checking out at
 * the same moment, in development or in CI, and one of them got a 500.
 *
 * They now queue: each transaction starts when the one before it has
 * committed or rolled back. A withTransaction called from inside a
 * transaction's own callback joins that transaction rather than waiting for
 * it, which would never end.
 *
 * What this cannot give is isolation from statements issued outside any
 * transaction: those share the connection and run inside whichever
 * transaction is open. PostgreSQL, where each transaction has its own
 * connection, has no such limit; this engine is for development and tests.
 */
const { AsyncLocalStorage } = require('async_hooks');
const transactionScope = new AsyncLocalStorage();
let transactionQueue = Promise.resolve();

const runStatement = (sql) => new Promise((resolve, reject) => {
  db.run(sql, (err) => (err ? reject(err) : resolve()));
});

const transactionClient = {
  query: (text, params = []) => query(text, params),
  queryOne: async (text, params = []) => (await query(text, params)).rows[0] || null,
  queryMany: async (text, params = []) => (await query(text, params)).rows,
};

async function withTransaction(callback) {
  if (transactionScope.getStore()) return callback(transactionClient);

  const run = () => transactionScope.run({ open: true }, async () => {
    await runStatement('BEGIN IMMEDIATE');
    try {
      const result = await callback(transactionClient);
      await runStatement('COMMIT');
      return result;
    } catch (error) {
      try {
        await runStatement('ROLLBACK');
      } catch (rollbackError) {
        console.error('[db] ROLLBACK failed after transaction error:', rollbackError.message);
      }
      throw error;
    }
  });

  // Runs after the previous transaction settles, whichever way it went.
  const mine = transactionQueue.then(run, run);
  transactionQueue = mine.catch(() => {});
  return mine;
}


// Transaction compatibility function matching Postgres transaction signature
async function transaction(callback) {
  return withTransaction(callback);
}

let connectionQueue = Promise.resolve();

const poolCompat = {
  query: query,
  exec: (sql, callback) => {
    db.exec(sql, callback);
  },
  connect: async () => {
    let releaseLock;
    const currentLock = new Promise((resolve) => {
      releaseLock = resolve;
    });

    const previousQueue = connectionQueue;
    connectionQueue = connectionQueue.then(() => currentLock);

    await previousQueue;

    return {
      query: query,
      release: () => {
        releaseLock();
      }
    };
  },
  end: async () => {
    return new Promise((resolve) => {
      db.close(() => resolve());
    });
  }
};

/**
 * Schema introspection, shared shape with the PostgreSQL driver.
 *
 * Exists so tooling can ask the database what columns a table actually has
 * instead of parsing DDL text. Parsing was tried first and was wrong four
 * times over — inline `--` comments, ALTER statements applied later, and
 * init.sql's execution order all defeated it in turn.
 */
async function listTables() {
  const res = await query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return (res.rows || []).map((r) => r.name);
}

async function getTableColumns(table) {
  // Table name cannot be bound as a parameter in PRAGMA; allow only an
  // identifier so this can never become an injection point.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  const res = await query(`PRAGMA table_info(${table})`);
  return (res.rows || []).map((r) => ({
    name: r.name,
    type: (r.type || '').toUpperCase(),
    notNull: !!r.notnull,
    defaultValue: r.dflt_value,
    primaryKey: !!r.pk,
  }));
}

module.exports = {
  pool: poolCompat,
  connectDB,
  query,
  queryOne,
  queryMany,
  withTransaction,
  transaction,
  listTables,
  getTableColumns,
};

// Trigger nodemon restart

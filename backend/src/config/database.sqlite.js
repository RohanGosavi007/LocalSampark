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
    if (row) result = /\bid\s+INTEGER\s+PRIMARY\s+KEY/i.test(row);
  } catch (_e) { /* keep false */ }

  integerPkCache.set(tableName, result);
  return result;
}

/**
 * table -> CREATE TABLE text, loaded once at startup. prepareInsert runs
 * synchronously inside query(), so it cannot await an introspection call.
 */
const schemaSnapshot = new Map();
let schemaReady = null;

function loadSchemaSnapshot() {
  // Kicked off at module load and awaited by query(), so it is populated before
  // the first INSERT regardless of entry point. Tying it to connectDB() alone
  // was not enough: the test suite and the CLI scripts call query() directly,
  // and with an empty snapshot every table looked like a UUID table again.
  if (schemaReady) return schemaReady;
  schemaReady = new Promise((resolve) => {
    try {
      db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (!err && rows) {
          for (const r of rows) schemaSnapshot.set(String(r.name).toLowerCase(), r.sql || '');
          integerPkCache.clear();
        }
        resolve();
      });
    } catch (_e) {
      resolve(); // fall back to previous behaviour rather than blocking queries
    }
  });
  return schemaReady;
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

function prepareInsert(sql, params) {
  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/i);
  if (insertMatch && params) {
    const tableName = insertMatch[1].toLowerCase();
    const columns = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
    
    // If the table has an id primary key, and 'id' is not in the columns being inserted,
    // we can prepend a generated UUID to the params and insert it.
    //
    // Only for tables whose id is actually a text/UUID key. This used to be
    // decided by a hardcoded list of three exceptions, so every other table
    // with `id INTEGER PRIMARY KEY` — local_shops among them — received a UUID
    // string into an integer column and every such INSERT failed with
    // SQLITE_MISMATCH. The schema is the authority on this, not a literal list.
    if (!columns.includes('id') && !hasIntegerPrimaryKey(tableName)) {
      const id = uuidv4();
      const newSql = sql
        .replace(/(INSERT\s+INTO\s+\w+\s*\()([^)]+\))/i, `$1id, $2`)
        .replace(/VALUES\s*\(([^)]+)\)/i, (m, valGroup) => {
          // Re-index all existing $1, $2 to $2, $3...
          const newValGroup = valGroup.replace(/\$([0-9]+)/g, (m, n) => `$${parseInt(n, 10) + 1}`);
          return `VALUES ($1, ${newValGroup})`;
        });

      return { sql: newSql, params: [id, ...params] };
    }
  }
  return { sql, params };
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
                console.log(`📂 SQLite connected. Database location: ${dbPath}`);
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
  let { sql, params: processedParams } = prepareInsert(text, params);
  const translated = translateQuery(sql, processedParams);
  
  return new Promise((resolve, reject) => {
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
async function withTransaction(callback) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', async (err) => {
        if (err) return reject(err);
        
        const client = {
          query: async (text, params = []) => {
            const res = await query(text, params);
            return res;
          },
          queryOne: async (text, params = []) => {
            const res = await query(text, params);
            return res.rows[0] || null;
          },
          queryMany: async (text, params = []) => {
            const res = await query(text, params);
            return res.rows;
          }
        };

        try {
          const result = await callback(client);
          db.run('COMMIT', (commitErr) => {
            if (commitErr) reject(commitErr);
            else resolve(result);
          });
        } catch (error) {
          db.run('ROLLBACK', () => {
            reject(error);
          });
        }
      });
    });
  });
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

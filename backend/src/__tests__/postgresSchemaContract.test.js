/**
 * What production's database would look like, checked without one.
 *
 * Production runs PostgreSQL; this suite, and every developer, runs SQLite.
 * The two are built from separate migration sets, and nothing made them agree.
 * A statement tested here says nothing about PostgreSQL unless the tables it
 * touches are the same there, so these compare the schema the migrations just
 * built against a model of the one the PostgreSQL migrations would build
 * (scripts/pg-schema-model.js), and then check the application's SQL against
 * that model too.
 *
 * Every case is something that was true of this codebase and that no test
 * could have shown:
 *
 *   - four auth tables and users.password_hash existed only on SQLite, so on a
 *     fresh production database registration, password reset and every admin
 *     login failed;
 *   - about fifty columns on the carpool and jobs tables likewise;
 *   - the shop loyalty tables existed only on PostgreSQL;
 *   - ninety-six flag literals — `is_active = true` against an INTEGER column,
 *     `is_approved = 1` against a BOOLEAN one — that SQLite accepts and
 *     PostgreSQL has no operator for.
 *
 * The model is a parser's reading of the migration files, not a database. A
 * pass means nothing known is wrong, not that the migrations run; only a real
 * PostgreSQL can say that.
 */

process.env.USE_SQLITE = 'true';

const fs = require('fs');
const db = require('../config/database');
const { buildPgModel } = require('../../scripts/pg-schema-model');
const { applicationFiles, label, sqlView, lineOf } = require('./helpers/liveSource');

// SQLite's own bookkeeping for full-text and R-tree indexes, and the scratch
// names table rebuilds use.
const SQLITE_INTERNAL = /(_rtree($|_)|^shop_search_index($|_)|__rebuild_|^sqlite_)/;

/**
 * Differences that are understood and intended. Each needs its reason; an entry
 * with none is a difference somebody stopped looking at.
 */
const TABLES_ONLY_ON_POSTGRES = new Set([
  // Created by 068 as a mirror of a table that, on SQLite, exists only for the
  // length of migration 063 before being renamed. Unused on both engines.
  'universal_orders_new',
]);
const COLUMNS_ONLY_ON_POSTGRES = new Set([
  // A tsvector for full-text search; SQLite uses the shop_search_index FTS
  // table for the same purpose.
  'local_shops.search_vector',
]);

/**
 * Foreign keys SQLite declares and the PostgreSQL model does not show.
 */
const FOREIGN_KEYS_ONLY_ON_SQLITE = new Set([
  // Added on PostgreSQL by migration 116, inside a DO block that guards each
  // one on the catalog. The model reads DDL written out literally and cannot
  // see a statement assembled by format(), so these look absent to it.
  'shop_categories.parent_category_id',
  'carpool_group_members.group_id',
  'marketplace_auction_bids.auction_id',
  'job_assessment_attempts.assessment_id',
  'job_referrals.job_id',
  // Cannot be declared on PostgreSQL as things stand: the column is TEXT or
  // INTEGER and the key it points at is UUID. Making them real means retyping
  // the column, which is a data migration. See 116_fk_index_parity.sql.
  'admin_roles.granted_by',
  'carpool_live_locations.ride_id',
  'marketplace_escrow.listing_id',
  'marketplace_auctions.listing_id',
  'shop_analytics_snapshots.shop_id',
]);

/**
 * Foreign keys PostgreSQL declares and SQLite does not. Each would need the
 * table rebuilt on SQLite, and a rebuild that adds a constraint fails on any
 * development database holding a row that already breaks it. They are left
 * until someone needs them enforced locally.
 */
const FOREIGN_KEYS_ONLY_ON_POSTGRES = new Set([
  'universal_orders.shop_id',
  'universal_orders.user_id',
  'universal_orders.rider_id',
  'universal_leads.user_id',
  'equipment_listings.owner_id',
  'volunteer_tasks.poster_id',
  'volunteer_tasks.volunteer_id',
]);

let pg;
let pgIndexes;
let sqlite;
let sqliteForeignKeys;
let sqliteIndexes;

beforeAll(async () => {
  const model = buildPgModel();
  pg = model.tables;
  pgIndexes = model.indexes;

  sqlite = {};
  sqliteForeignKeys = {};
  const tables = await db.query("SELECT name FROM sqlite_master WHERE type = 'table'");
  for (const { name } of tables.rows) {
    if (SQLITE_INTERNAL.test(name)) continue;
    const info = await db.query(`PRAGMA table_info("${name}")`);
    sqlite[name.toLowerCase()] = info.rows.map((c) => c.name.toLowerCase());

    const keys = await db.query(`PRAGMA foreign_key_list("${name}")`);
    sqliteForeignKeys[name.toLowerCase()] = keys.rows.map((k) => ({
      column: k.from.toLowerCase(),
      table: k.table.toLowerCase(),
      onDelete: String(k.on_delete || 'NO ACTION').toUpperCase(),
    }));
  }

  const indexes = await db.query("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'");
  sqliteIndexes = indexes.rows.filter((r) => !SQLITE_INTERNAL.test(r.tbl_name));
});

test('the model is reading the migrations', () => {
  expect(Object.keys(pg).length).toBeGreaterThan(350);
  expect(Object.keys(sqlite).length).toBeGreaterThan(350);
});

test('every table exists on both engines', () => {
  const missingOnPostgres = Object.keys(sqlite).filter((t) => !pg[t]).sort();
  const missingOnSqlite = Object.keys(pg).filter((t) => !sqlite[t] && !TABLES_ONLY_ON_POSTGRES.has(t)).sort();

  expect({ missingOnPostgres, missingOnSqlite }).toEqual({ missingOnPostgres: [], missingOnSqlite: [] });
});

test('every column exists on both engines', () => {
  const differences = [];
  for (const table of Object.keys(sqlite).filter((t) => pg[t]).sort()) {
    const onPostgres = new Set(pg[table].cols.map((c) => c.name));
    const onSqlite = new Set(sqlite[table]);
    const missingOnPostgres = [...onSqlite].filter((c) => !onPostgres.has(c));
    const missingOnSqlite = [...onPostgres].filter((c) => !onSqlite.has(c) && !COLUMNS_ONLY_ON_POSTGRES.has(`${table}.${c}`));
    if (missingOnPostgres.length) differences.push(`${table}: PostgreSQL lacks ${missingOnPostgres.join(', ')}`);
    if (missingOnSqlite.length) differences.push(`${table}: SQLite lacks ${missingOnSqlite.join(', ')}`);
  }
  expect(differences).toEqual([]);
});

test('a foreign key points at the same table and does the same thing on delete', () => {
  // What happens to a child row when its parent is deleted is behaviour, not
  // decoration. Three keys used to cascade or null out on PostgreSQL and refuse
  // the delete on SQLite, so the same DELETE succeeded on one engine and raised
  // on the other.
  const differences = [];

  for (const table of Object.keys(sqlite).filter((t) => pg[t]).sort()) {
    const onPostgres = new Map(pg[table].fks.map((fk) => [fk.column, fk]));
    const onSqlite = new Map(sqliteForeignKeys[table].map((fk) => [fk.column, fk]));

    for (const [column, fk] of onSqlite) {
      const other = onPostgres.get(column);
      if (!other) {
        if (!FOREIGN_KEYS_ONLY_ON_SQLITE.has(`${table}.${column}`)) {
          differences.push(`${table}.${column} -> ${fk.table}: declared on SQLite only`);
        }
      } else if (other.table !== fk.table) {
        differences.push(`${table}.${column}: -> ${fk.table} on SQLite, -> ${other.table} on PostgreSQL`);
      } else if (other.onDelete !== fk.onDelete) {
        differences.push(`${table}.${column} -> ${fk.table}: ON DELETE ${fk.onDelete} on SQLite, ${other.onDelete} on PostgreSQL`);
      }
    }
    for (const [column, fk] of onPostgres) {
      if (!onSqlite.has(column) && !FOREIGN_KEYS_ONLY_ON_POSTGRES.has(`${table}.${column}`)) {
        differences.push(`${table}.${column} -> ${fk.table}: declared on PostgreSQL only`);
      }
    }
  }

  expect(differences).toEqual([]);
});

test('every index SQLite has, PostgreSQL has too', () => {
  // One-directional on purpose. PostgreSQL carries a few hundred more — on
  // every foreign key, for joins a production dataset makes expensive — and
  // SQLite does not need them. The reverse is the bug: an index written for a
  // query during development that production then runs without.
  const missing = sqliteIndexes
    .filter((index) => !pgIndexes[index.name.toLowerCase()])
    .map((index) => `${index.name} ON ${index.tbl_name}`);

  expect(missing).toEqual([]);
});

// ── the application's SQL, read against the PostgreSQL model ────────────────

const isBoolean = (type) => /^BOOL/i.test(type || '');
const isInteger = (type) => /^(INT|INTEGER|SMALLINT|BIGINT|SERIAL)/i.test(type || '');
const NOT_A_TABLE = new Set(['select', 'where', 'set', 'values', 'on', 'and', 'or', 'left', 'right', 'inner', 'outer', 'join', 'group', 'order', 'limit', 'as', 'using', 'only', 'conflict', 'returning', 'do', 'nothing', 'update']);

/** String literals in a file that read as SQL statements. */
function sqlStrings(text) {
  const found = [];
  const literal = /`([^`]*)`|'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  let match;
  while ((match = literal.exec(text))) {
    const body = match[1] ?? match[2] ?? match[3] ?? '';
    if (/\b(SELECT|UPDATE|DELETE FROM|INSERT INTO)\b/i.test(body) && /\b(FROM|SET|INTO)\b/i.test(body)) {
      found.push({ body, index: match.index });
    }
  }
  return found;
}

/** alias or name -> table, for the tables a statement names. */
function tablesIn(sql) {
  const names = new Map();
  const reference = /\b(?:FROM|JOIN|UPDATE|INTO)\s+(?:ONLY\s+)?"?([a-z_][a-z0-9_]*)"?(?:\s+(?:AS\s+)?([a-z_][a-z0-9_]*))?/gi;
  let match;
  while ((match = reference.exec(sql))) {
    const table = match[1].toLowerCase();
    if (NOT_A_TABLE.has(table) || table === '__js__') continue;
    names.set(table, table);
    const alias = match[2] && match[2].toLowerCase();
    if (alias && !NOT_A_TABLE.has(alias)) names.set(alias, table);
  }
  return names;
}

function columnType(table, column) {
  const found = pg[table] && pg[table].cols.find((c) => c.name === column);
  return found ? found.type : null;
}

/** PostgreSQL has no operator for boolean = integer, in either direction. */
function mismatched(types, literal) {
  if (types.length === 0) return false;
  return /^(true|false)$/i.test(literal) ? types.every(isInteger) : types.every(isBoolean);
}

test("flag literals are quoted wherever the column's type would reject a bare one", () => {
  // `'1'` and `'0'` are the spelling both engines accept for both column
  // types: an untyped literal takes the column's type in PostgreSQL, and
  // SQLite converts it to the column's numeric affinity.
  const problems = [];

  for (const file of applicationFiles()) {
    const text = sqlView(fs.readFileSync(file, 'utf8'));
    for (const { body, index } of sqlStrings(text)) {
      const names = tablesIn(body);
      const at = (offset) => `${label(file)}:${lineOf(text, index + offset)}`;

      const comparison = /(?:\b([a-z_][a-z0-9_]*)\.)?\b([a-z_][a-z0-9_]*)\s*(=|!=|<>)\s*(true|false|1|0)\b(?!\s*[.\d])/gi;
      let match;
      while ((match = comparison.exec(body))) {
        const qualifier = match[1] && match[1].toLowerCase();
        const column = match[2].toLowerCase();
        const candidates = (qualifier ? [names.get(qualifier)].filter(Boolean) : [...new Set(names.values())])
          .filter((t) => columnType(t, column));
        const types = candidates.map((t) => columnType(t, column));
        if (mismatched(types, match[4])) {
          problems.push(`${at(match.index)}  ${candidates.join('/')}.${column} ${match[3]} ${match[4]}  (column is ${types[0]} on PostgreSQL)`);
        }
      }

      const insert = /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+"?([a-z_][a-z0-9_]*)"?\s*\(([^)]*)\)\s*VALUES\s*\(([^()]*)\)/gi;
      while ((match = insert.exec(body))) {
        const table = match[1].toLowerCase();
        const columns = match[2].split(',').map((c) => c.trim().replace(/["`]/g, '').toLowerCase());
        const values = match[3].split(',').map((v) => v.trim());
        if (!pg[table] || columns.length !== values.length) continue;
        values.forEach((value, position) => {
          if (!/^(true|false|1|0)$/i.test(value)) return;
          const type = columnType(table, columns[position]);
          if (type && mismatched([type], value)) {
            problems.push(`${at(match.index)}  INSERT ${table}.${columns[position]} <- ${value}  (column is ${type} on PostgreSQL)`);
          }
        });
      }
    }
  }

  expect(problems).toEqual([]);
});

test('every INSERT fits the PostgreSQL table as well', () => {
  // The SQLite half of this is insertSchemaContract.test.js, against the real
  // schema. A missing id is not reported: migration 112 gives text primary
  // keys a generated default.
  const problems = [];
  const insert = /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+"?(\w+)"?\s*\(([^)]*)\)\s*(?:VALUES|SELECT)/gi;

  for (const file of applicationFiles()) {
    const text = sqlView(fs.readFileSync(file, 'utf8'));
    insert.lastIndex = 0;
    let match;
    while ((match = insert.exec(text))) {
      const table = match[1].toLowerCase();
      const named = match[2].split(',').map((c) => c.trim().replace(/["`]/g, '').toLowerCase()).filter(Boolean);
      if (table === '__js__' || named.some((c) => !/^\w+$/.test(c) || c.includes('__js__'))) continue;

      const where = `${label(file)}:${lineOf(text, match.index)}`;
      if (!pg[table]) {
        problems.push(`${where}  no such table on PostgreSQL: ${table}`);
        continue;
      }
      const known = new Set(pg[table].cols.map((c) => c.name));
      const unknown = named.filter((c) => !known.has(c));
      if (unknown.length) problems.push(`${where}  ${table} has no column on PostgreSQL: ${unknown.join(', ')}`);

      const given = new Set(named);
      const required = pg[table].cols
        .filter((c) => c.notnull && !c.hasDefault && !c.pk && !given.has(c.name))
        .map((c) => c.name);
      if (required.length) problems.push(`${where}  ${table} requires on PostgreSQL: ${required.join(', ')}`);
    }
  }

  expect(problems).toEqual([]);
});

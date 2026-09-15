/**
 * Every table the running code queries must exist in the migrations.
 *
 * This codebase runs two schemas over one domain. The migrations define
 * `local_shops`, `shop_products`, `shop_services`, `shop_appointments`; the
 * Prisma schema defines `shops`, `products`, `service_slots`, `appointments`.
 * Handlers drifted between them, and the failure is always silent — a query
 * against a table that does not exist throws at request time, in a route nobody
 * had exercised, so it looked like working software.
 *
 * Real defects this would have caught:
 *   - `fleet_assets`, `rental_bookings`, `fleet_asset_logs` — the entire rentals
 *     archetype was mounted at /api/v1/fleet-assets and every endpoint 500'd,
 *     because no migration created any of the three tables.
 *   - `appointments` — the merchant appointment book and the appointment status
 *     transitions both queried it; bookings are written to `shop_appointments`.
 *   - `service_slots` — adding a bookable service returned 201 and wrote to a
 *     table that does not exist.
 *
 * The check is static so it needs no database, and therefore cannot be satisfied
 * by a test fixture whose schema has drifted from the migrations.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');
const MIGRATIONS = path.join(SRC, 'migrations');

// ─── tables the migrations create ────────────────────────────────────────────
function migrationTables() {
  const tables = new Set();

  for (const file of fs.readdirSync(MIGRATIONS)) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');

    // VIRTUAL covers SQLite's FTS5 indexes. shop_search_index is declared
    // `CREATE VIRTUAL TABLE ... USING fts5(...)` in 049, and without this the
    // scan does not see it — so any code querying the full-text index was
    // reported as querying a table that does not exist, which is the opposite
    // of what this file is for. TEMP/TEMPORARY is accepted for completeness.
    for (const m of sql.matchAll(
      /CREATE\s+(?:TEMP(?:ORARY)?\s+|VIRTUAL\s+)?TABLE\s+(?:IF NOT EXISTS\s+)?["`]?([a-z_][a-z0-9_]*)/gi
    )) {
      tables.add(m[1].toLowerCase());
    }
    // A rename makes the new name available too.
    for (const m of sql.matchAll(/ALTER TABLE\s+["`]?([a-z_][a-z0-9_]*)["`]?\s+RENAME TO\s+["`]?([a-z_][a-z0-9_]*)/gi)) {
      tables.add(m[2].toLowerCase());
    }
    for (const m of sql.matchAll(/CREATE\s+(?:MATERIALIZED\s+)?VIEW\s+(?:IF NOT EXISTS\s+)?["`]?([a-z_][a-z0-9_]*)/gi)) {
      tables.add(m[1].toLowerCase());
    }
  }
  return tables;
}

/**
 * Several controllers run `CREATE TABLE IF NOT EXISTS` at request time instead
 * of declaring the table in a migration. That is its own problem — the schema
 * then depends on which endpoint happened to be called first — but those tables
 * do come into existence, so they are not what this test is looking for.
 */
function runtimeCreatedTables(files) {
  const tables = new Set();
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?([a-z_][a-z0-9_]*)/gi)) {
      tables.add(m[1].toLowerCase());
    }
  }
  return tables;
}

/** Driver internals, not application tables. */
const SYSTEM_TABLES = new Set([
  'information_schema', 'sqlite_master', 'pg_catalog', 'pg_tables', 'pg_stat_activity',
]);

/**
 * Tables the running code queries that no migration creates.
 *
 * This started at 39. Six were name drift onto the Prisma half of the old dual
 * schema and were fixed by repointing the query — `shops` to `local_shops`,
 * `products` to `shop_products`, `appointments` to `shop_appointments`,
 * `notifications` to `shop_notifications`, `franchises` to
 * `franchise_partners`, `delivery_routes` to `orders`. The other 33 were
 * genuinely absent and are created by migrations 091, 092 and 093, each of which
 * was executed against a scratch database before being committed.
 *
 * The set is empty and should stay that way. An entry appearing here means an
 * endpoint that fails on every fresh deployment, silently, until someone calls
 * it.
 */
const KNOWN_MISSING = new Set([]);

// ─── tables the running code queries ─────────────────────────────────────────
const SKIP_DIRS = new Set(['migrations', '__tests__', 'node_modules']);

// Seeds and one-off maintenance scripts are allowed to reference tables they
// create themselves, and are not part of the request path.
const SKIP_FILE = /[\\/](seeds|scripts)[\\/]/;

function runtimeFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) runtimeFiles(full, out);
    } else if (entry.name.endsWith('.js') && !SKIP_FILE.test(full)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Comments have to be stripped before looking for string literals, or an
 * apostrophe in prose ("the shop's pincode") opens a phantom string that runs
 * on until the next apostrophe, swallowing code and English alike. That is how
 * an earlier version of this reported `the`, `a`, `client` and `req` as missing
 * tables.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[^\S\n]*\/\/[^\n]*/gm, '');
}

/** SQL string literals only — scanning raw source reads JS identifiers as SQL. */
function sqlLiterals(source) {
  const re = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  return [...stripComments(source).matchAll(re)]
    .map((m) => m[0].slice(1, -1))
    // A SQL statement always has one of these keywords; prose that happens to
    // contain the word "from" almost never has a SELECT/INSERT/UPDATE/DELETE
    // with it.
    .filter((lit) => /\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i.test(lit))
    .filter((lit) => /\b(FROM|JOIN|INTO|UPDATE)\s+[a-z_]/i.test(lit));
}

// SQL keywords and shapes that follow FROM/JOIN but are not table names.
const NOT_A_TABLE = new Set([
  'select', 'where', 'set', 'values', 'as', 'on', 'and', 'or', 'lateral',
  'unnest', 'generate_series', 'dual', 'only',
]);

/**
 * Each pattern requires the surrounding SQL shape, not just the keyword. A
 * message like "Failed to update asset status" contains "update asset" and was
 * otherwise reported as a query against a table named `asset`.
 *
 * A subquery opens with "(" right after FROM/JOIN, so those are skipped — the
 * inner FROM is matched on its own pass.
 */
const TABLE_PATTERNS = [
  /\bFROM\s+(?!\()["`]?([a-z_][a-z0-9_]*)["`]?\s*(?:["`]?[a-z]\w*\s*)?(?:\bWHERE\b|\bJOIN\b|\bLEFT\b|\bRIGHT\b|\bINNER\b|\bGROUP\b|\bORDER\b|\bLIMIT\b|\bON\b|\)|,|$)/gi,
  /\bJOIN\s+(?!\()["`]?([a-z_][a-z0-9_]*)["`]?\s+(?:["`]?[a-z]\w*\s+)?\bON\b/gi,
  /\bINSERT\s+INTO\s+["`]?([a-z_][a-z0-9_]*)["`]?\s*[(]/gi,
  /\bUPDATE\s+["`]?([a-z_][a-z0-9_]*)["`]?\s+SET\b/gi,
  /\bDELETE\s+FROM\s+["`]?([a-z_][a-z0-9_]*)["`]?\s*(?:\bWHERE\b|$)/gi,
];

function referencedTables(literal) {
  const tables = new Set();

  // Common table expressions are named in the query itself, not in the schema:
  // `WITH threads AS (...) SELECT ... FROM threads` is not a missing table.
  const ctes = new Set(
    [...literal.matchAll(/\b(?:WITH|,)\s+([a-z_][a-z0-9_]*)\s+AS\s*\(/gi)].map((m) => m[1].toLowerCase())
  );

  for (const re of TABLE_PATTERNS) {
    for (const m of literal.matchAll(re)) {
      const name = m[1].toLowerCase();
      if (!NOT_A_TABLE.has(name) && !ctes.has(name)) tables.add(name);
    }
  }
  return tables;
}

describe('runtime SQL only queries tables that exist', () => {
  const known = migrationTables();

  it('parses a non-trivial set of tables from the migrations', () => {
    // Guards against a silently broken parser making every assertion vacuous.
    expect(known.size).toBeGreaterThan(50);
    for (const t of ['users', 'local_shops', 'shop_products', 'orders', 'order_items']) {
      expect([...known]).toContain(t);
    }
  });

  it('flags a table that does not exist', () => {
    // Regression injection: proves the extractor is looking.
    const found = referencedTables('SELECT * FROM fleet_assets WHERE shop_id = $1');
    expect([...found]).toContain('fleet_assets');
  });

  it('does not mistake a subquery for a table', () => {
    const found = referencedTables('SELECT * FROM (SELECT id FROM users) t');
    expect([...found]).toContain('users');
    expect([...found]).not.toContain('select');
  });

  function missingTables() {
    const files = runtimeFiles(SRC);
    const runtimeCreated = runtimeCreatedTables(files);
    const found = new Map();

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');

      for (const literal of sqlLiterals(source)) {
        for (const table of referencedTables(literal)) {
          if (known.has(table) || runtimeCreated.has(table) || SYSTEM_TABLES.has(table)) continue;
          const rel = path.relative(SRC, file).split(path.sep).join('/');
          if (!found.has(table)) found.set(table, []);
          found.get(table).push(rel);
        }
      }
    }
    return found;
  }

  it('no table is missing beyond the known list', () => {
    const found = missingTables();
    const unexpected = [...found.keys()]
      .filter((t) => !KNOWN_MISSING.has(t))
      .sort()
      .map((t) => `${t} (${[...new Set(found.get(t))].join(', ')})`);

    expect(unexpected).toEqual([]);
  });

  it('the known-missing list only shrinks', () => {
    // A table that no longer appears has been created; delete it from
    // KNOWN_MISSING so the gap cannot silently reopen. The set is empty now, so
    // this asserts nobody re-adds an entry rather than fixing the schema.
    const found = missingTables();
    const stale = [...KNOWN_MISSING].filter((t) => !found.has(t)).sort();
    expect(stale).toEqual([]);
  });

  it('every table the code queries exists', () => {
    // The plain statement of the invariant, now that it holds.
    expect([...missingTables().keys()].sort()).toEqual([]);
  });
});

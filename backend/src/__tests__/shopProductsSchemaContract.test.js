/**
 * shop_products schema contract.
 *
 * The cart's stock check ran `SELECT stock_qty FROM shop_products` — a column
 * that exists in no migration and no schema. SQLite answers that with
 * "no such column", so every add-to-cart on the SQLite path returned 500 before
 * an item could be added, and nothing caught it: the ecommerce integration
 * suite's cart test asserted `expect(true).toBe(true)`.
 *
 * This test derives the real column set from the migrations and checks it
 * against every column the running code names in a single-table shop_products
 * statement. It is a static check on purpose — it needs no database, so it
 * cannot be satisfied by a test fixture whose schema has drifted from the
 * migrations (the fixture in setup/testDb.js has: it declares shop_products
 * with an INTEGER id and no inventory_count or track_inventory at all).
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');
const MIGRATIONS = path.join(SRC, 'migrations');

// ─── the authoritative column set ────────────────────────────────────────────
function migrationColumns() {
  const cols = new Set();

  for (const file of fs.readdirSync(MIGRATIONS)) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');

    const create = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?shop_products\s*\(([\s\S]*?)\n\s*\);/i);
    if (create) {
      for (const line of create[1].split('\n')) {
        const m = line.trim().match(/^([a-z_][a-z0-9_]*)\s+[A-Z]/i);
        if (m && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)$/i.test(m[1])) {
          cols.add(m[1].toLowerCase());
        }
      }
    }

    for (const m of sql.matchAll(
      /ALTER TABLE shop_products\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?([a-z_][a-z0-9_]*)/gi
    )) {
      cols.add(m[1].toLowerCase());
    }
  }
  return cols;
}

// ─── columns the running code names ──────────────────────────────────────────
const SKIP_DIRS = new Set(['migrations', '__tests__', 'seeds', 'node_modules']);

function runtimeFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) runtimeFiles(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith('.js')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const SQL_WORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'null', 'is', 'in', 'set', 'update',
  'insert', 'into', 'values', 'delete', 'order', 'by', 'group', 'having', 'limit',
  'offset', 'as', 'on', 'join', 'left', 'right', 'inner', 'outer', 'distinct', 'count',
  'sum', 'avg', 'min', 'max', 'coalesce', 'case', 'when', 'then', 'else', 'end',
  'asc', 'desc', 'true', 'false', 'current_timestamp', 'now', 'returning', 'like',
  'between', 'exists', 'union', 'all', 'shop_products', 'default', 'conflict', 'do',
  'nothing', 'cast', 'integer', 'text', 'real', 'total',
]);

/**
 * Extract SQL string literals, then look only at the region of each literal that
 * actually belongs to shop_products. Scanning raw file text instead runs off the
 * end of the SQL and starts reading surrounding JavaScript identifiers as column
 * names — exactly the kind of false alarm that gets a guard switched off.
 */
function sqlLiterals(source) {
  const re = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  return [...source.matchAll(re)]
    .map((m) => m[0].slice(1, -1))
    .filter((lit) => /shop_products/i.test(lit));
}

const SELECT_STOP = /\)|\bORDER BY\b|\bGROUP BY\b|\bLIMIT\b|\bRETURNING\b|\bUNION\b/i;

function referencedColumns(literal) {
  const cols = new Set();

  const add = (tok) => {
    const t = String(tok).trim().toLowerCase();
    // Bare identifiers only. A qualified name like `s.owner_id` inside a joined
    // statement belongs to whichever table that alias points at, and guessing
    // wrong produces exactly the false alarms that get a guard switched off.
    if (!/^[a-z_][a-z0-9_]*$/.test(t)) return;
    if (SQL_WORDS.has(t)) return;
    cols.add(t);
  };

  const addWhere = (text) => {
    for (const m of text.matchAll(/(?<![.\w])([a-z_][a-z0-9_]*)\s*(?:=|<|>|<=|>=|!=|\bIS\b)/gi)) {
      add(m[1]);
    }
  };

  // INSERT INTO shop_products (a, b, c)
  for (const m of literal.matchAll(/INSERT INTO shop_products\s*\(([^)]*)\)/gi)) {
    for (const part of m[1].split(',')) add(part);
  }

  // UPDATE shop_products SET a = $1, b = $2 WHERE ...  (single table by definition)
  for (const m of literal.matchAll(/UPDATE shop_products\s+SET\s+([\s\S]*)$/gi)) {
    const body = m[1];
    const whereAt = body.search(/\bWHERE\b/i);
    const setClause = whereAt === -1 ? body : body.slice(0, whereAt);
    for (const part of setClause.split(',')) {
      const lhs = part.split('=')[0];
      // Skip interpolated fragments — those are built from a whitelist in code.
      if (!/[${}]/.test(lhs)) add(lhs);
    }
    if (whereAt !== -1) addWhere(body.slice(whereAt));
  }

  // SELECT <list> FROM shop_products [WHERE ...]
  for (const m of literal.matchAll(/\bFROM\s+shop_products\b/gi)) {
    const before = literal.slice(0, m.index);
    const selectAt = before.toUpperCase().lastIndexOf('SELECT');
    if (selectAt !== -1) {
      const list = before.slice(selectAt + 'SELECT'.length);
      if (!list.includes('*') && !/\bJOIN\b/i.test(list)) {
        for (const part of list.split(',')) {
          add(part.replace(/\bDISTINCT\b/gi, '').trim().split(/\s+/)[0]);
        }
      }
    }

    let after = literal.slice(m.index + m[0].length);
    const stop = after.search(SELECT_STOP);
    if (stop !== -1) after = after.slice(0, stop);
    // Another table in scope makes a bare identifier ambiguous.
    if (/\bJOIN\b/i.test(after)) continue;
    const whereAt = after.search(/\bWHERE\b/i);
    if (whereAt !== -1) addWhere(after.slice(whereAt));
  }

  return cols;
}

describe('shop_products schema contract', () => {
  const known = migrationColumns();

  it('derives the column set from the migrations', () => {
    // Sanity check: if the parser silently matched nothing, every assertion
    // below would pass vacuously.
    expect(known.size).toBeGreaterThan(15);
    for (const c of ['id', 'shop_id', 'name', 'price', 'is_available', 'inventory_count', 'track_inventory']) {
      expect([...known]).toContain(c);
    }
  });

  it('never had a stock_qty column', () => {
    expect([...known]).not.toContain('stock_qty');
  });

  it('flags a column that does not exist', () => {
    // Regression-injection: proves the extractor is actually looking, rather
    // than returning an empty set and passing by accident.
    const injected = referencedColumns('SELECT stock_qty FROM shop_products WHERE id = $1');
    expect([...injected]).toContain('stock_qty');
    expect(known.has('stock_qty')).toBe(false);

    // The other half of the guard: a joined statement must not attribute the
    // other table's columns to shop_products.
    const joined = referencedColumns(
      'SELECT p.id, s.owner_id FROM shop_products p LEFT JOIN local_shops s ON p.shop_id = s.id WHERE p.id = $1'
    );
    expect([...joined]).not.toContain('owner_id');
  });

  it('runtime SQL only names columns that exist', () => {
    const offenders = [];

    for (const file of runtimeFiles(SRC)) {
      const source = fs.readFileSync(file, 'utf8');
      if (!source.includes('shop_products')) continue;

      for (const literal of sqlLiterals(source)) {
        for (const col of referencedColumns(literal)) {
          if (!known.has(col)) {
            offenders.push(`${path.relative(SRC, file).split(path.sep).join('/')}: shop_products.${col}`);
          }
        }
      }
    }

    expect([...new Set(offenders)].sort()).toEqual([]);
  });
});

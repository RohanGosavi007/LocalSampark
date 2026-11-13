/**
 * Boolean literals against non-boolean columns.
 *
 * `col = true` is fine on SQLite (true is 1) and on a PostgreSQL BOOLEAN
 * column, but on a PostgreSQL INTEGER or TEXT column it is a type error
 * ("operator does not exist: integer = boolean") — the route answers 500 in
 * production while every SQLite run passes. regions.is_active and
 * territories.is_active are INTEGER on PostgreSQL; seed_regions.js compared
 * the first with `= true` (fixed 2026-11-13).
 *
 * The repository's engine-neutral form is `col = '1'` / `col = '0'`.
 *
 * Column types are read from the live PostgreSQL schema rather than parsed
 * from migrations: parsing CREATE/ALTER statements got several final types
 * wrong (a later migration, or the runner's order, decides them). So this
 * suite checks on the PostgreSQL run (G3) and is skipped on SQLite.
 */
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

const usePg = process.env.TEST_USE_POSTGRES === '1' || process.env.TEST_USE_POSTGRES === 'true';
const SRC = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['__tests__', 'node_modules', 'migrations', 'seeds']);

function* sourceFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* sourceFiles(p); } else if (p.endsWith('.js')) yield p;
  }
}

/** `alias.col = true|false` / `col IS [NOT] TRUE|FALSE` on lines that read as SQL. */
function findComparisons(file) {
  const out = [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return; // comments
    if (!/\b(WHERE|AND|OR|SET|ON|WHEN)\b/.test(line)) return; // SQL keywords are upper case here
    const re = /(?:\b(\w+)\.)?\b(\w+)\s*(?:=|<>|!=)\s*(true|false)\b|(?:\b(\w+)\.)?\b(\w+)\s+IS\s+(?:NOT\s+)?(TRUE|FALSE)\b/g;
    let m;
    while ((m = re.exec(line))) {
      out.push({ line: i + 1, alias: (m[1] || m[4] || '').toLowerCase(), col: (m[2] || m[5]).toLowerCase(), text: m[0] });
    }
  });
  return out;
}

const TABLE_RE = /\b(?:FROM|JOIN|UPDATE|INTO)\s+"?(\w+)"?(?:\s+(?:AS\s+)?(\w+))?/g;
const tablesIn = (text) => [...text.matchAll(TABLE_RE)].map((x) => ({ table: x[1].toLowerCase(), alias: (x[2] || '').toLowerCase() }));

/**
 * Tables the statement on this line uses. The line itself first — a
 * one-line query names its table there, and looking further back attributes
 * it to the query before it. Only when the line names none (a multi-line
 * statement) is the statement searched upwards, stopping at the first lines
 * that name a table.
 */
function tablesNear(file, lineNo) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const own = tablesIn(lines[lineNo - 1]);
  if (own.length) return own;
  for (let i = lineNo - 2; i >= Math.max(0, lineNo - 30); i -= 1) {
    const found = tablesIn(lines[i]);
    if (found.length) return found;
  }
  return [];
}

/** Every table named within 40 lines above and 10 below: the statement's aliases. */
function statementTables(file, lineNo) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  return tablesIn(lines.slice(Math.max(0, lineNo - 40), lineNo + 10).join('\n'));
}

(usePg ? describe : describe.skip)('SQL boolean literals match PostgreSQL column types', () => {
  test('no `col = true/false` against an INTEGER or TEXT column', async () => {
    const r = await query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'");
    const types = {};
    for (const row of r.rows || r) (types[row.table_name] = types[row.table_name] || {})[row.column_name] = row.data_type;

    const offenders = [];
    for (const file of sourceFiles(SRC)) {
      for (const hit of findComparisons(file)) {
        let cands;
        if (hit.alias) {
          // An alias (`s.is_active`) is defined wherever its FROM/JOIN is,
          // often lines above: resolve it through the whole statement window.
          cands = statementTables(file, hit.line).filter((t) => t.alias === hit.alias || t.table === hit.alias);
        } else {
          cands = tablesNear(file, hit.line);
        }
        cands = cands.filter((t) => types[t.table] && types[t.table][hit.col]);
        for (const c of cands) {
          const type = types[c.table][hit.col];
          if (type !== 'boolean') {
            offenders.push(`${path.relative(SRC, file)}:${hit.line}  ${hit.text}  (${c.table}.${hit.col} is ${type} on PostgreSQL; use '1'/'0')`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

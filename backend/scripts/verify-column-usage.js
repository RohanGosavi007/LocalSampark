#!/usr/bin/env node
/**
 * Find columns that SQL references but the live table does not have.
 *
 * Precision is the whole point. A bare \bcolumn\b grep is useless — `status`
 * matches 196 files and tells you nothing about which table. An earlier version
 * of this script attributed columns per statement but still harvested every
 * identifier it saw, so JS leaking out of template interpolations produced
 * "columns" like local_shops.await and admin_audit_log.query.
 *
 * This version:
 *   - blanks ${...} interpolations before reading a statement, since their
 *     contents are JavaScript, not SQL;
 *   - takes identifiers only from positions where SQL can only mean a column
 *     (INSERT column lists, SET clauses, WHERE/AND/OR comparisons, ORDER BY,
 *     GROUP BY, and qualified alias.column references);
 *   - resolves table aliases, so `WHERE ls.is_active` is attributed to
 *     local_shops rather than discarded;
 *   - checks against real column metadata from PRAGMA table_info /
 *     information_schema, never parsed DDL.
 *
 * A reported hit is a statement that would genuinely fail against the live
 * schema.
 *
 *   node scripts/verify-column-usage.js              # all tables
 *   node scripts/verify-column-usage.js local_shops  # one table
 *   node scripts/verify-column-usage.js --json
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');

// SQL words and function names that can appear where a column would.
const NON_COLUMNS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'null', 'is', 'as', 'on', 'join', 'left', 'right',
  'inner', 'outer', 'full', 'cross', 'group', 'by', 'order', 'having', 'limit', 'offset', 'insert',
  'into', 'values', 'update', 'set', 'delete', 'distinct', 'case', 'when', 'then', 'else', 'end',
  'true', 'false', 'like', 'ilike', 'in', 'exists', 'between', 'union', 'all', 'asc', 'desc',
  'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'nullif', 'greatest', 'least', 'cast', 'convert',
  'current_timestamp', 'current_date', 'now', 'datetime', 'date', 'strftime', 'julianday',
  'returning', 'conflict', 'do', 'nothing', 'excluded', 'interval', 'extract', 'epoch',
  'json', 'json_extract', 'jsonb', 'length', 'lower', 'upper', 'substr', 'substring', 'trim',
  'replace', 'round', 'abs', 'random', 'over', 'partition', 'row_number', 'rank', 'dense_rank',
  'with', 'recursive', 'using', 'natural', 'default', 'primary', 'key', 'foreign', 'references',
  'cascade', 'constraint', 'unique', 'check', 'collate', 'nocase', 'desc', 'ifnull', 'iif',
  // JavaScript methods and properties. The qualified-reference rule reads
  // `x.y` as alias.column, which also matches `rows.map(...)` and
  // `result.length` when they sit inside a template literal alongside SQL.
  'map', 'filter', 'foreach', 'reduce', 'push', 'pop', 'shift', 'slice', 'splice', 'concat',
  'indexof', 'includes', 'find', 'some', 'every', 'sort', 'reverse', 'tostring', 'valueof',
  'then', 'catch', 'finally', 'tofixed', 'tolowercase', 'touppercase', 'padstart', 'padend',
  'stringify', 'parse', 'keys', 'entries', 'assign', 'freeze', 'prototype', 'constructor',
]);

/**
 * Aliases introduced by the statement itself (`... AS day_of_week`) are not
 * columns of any table, so they must not be reported as missing.
 */
function selectAliases(sql) {
  const out = new Set();
  const re = /\bAS\s+"?([a-z_][a-z0-9_]*)"?/gi;
  let m;
  while ((m = re.exec(sql))) out.add(m[1].toLowerCase());
  return out;
}

function sourceFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['migrations', 'seeds', '__tests__', 'node_modules'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, out);
    else if (e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/**
 * Pull statements out of string literals, blanking ${...} first.
 *
 * An interpolation's contents are JavaScript — `${await getId()}`,
 * `${cols.join(',')}` — and reading identifiers out of them is what produced
 * bogus columns named `await`, `const` and `query`.
 */
function extractStatements(text) {
  const out = [];
  const re = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m;
  while ((m = re.exec(text))) {
    let sql = m[2];
    if (!/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql)) continue;
    if (!/\b(FROM|INTO|UPDATE|JOIN)\b/i.test(sql)) continue;
    // Blank interpolations and parameter markers; keep length roughly stable.
    sql = sql.replace(/\$\{[\s\S]*?\}/g, ' ? ').replace(/\$\d+/g, ' ? ').replace(/'[^']*'/g, " '' ");
    out.push(sql);
  }
  return out;
}

/** table -> Set(aliases), plus the default table when only one is present. */
function tableAliases(sql) {
  const map = new Map();
  const re = /\b(?:FROM|JOIN|INTO|UPDATE)\s+"?([a-z_][a-z0-9_]*)"?(?:\s+(?:AS\s+)?"?([a-z_][a-z0-9_]*)"?)?/gi;
  let m;
  while ((m = re.exec(sql))) {
    const table = m[1].toLowerCase();
    const alias = m[2] && !NON_COLUMNS.has(m[2].toLowerCase()) ? m[2].toLowerCase() : null;
    if (!map.has(table)) map.set(table, new Set());
    if (alias) map.get(table).add(alias);
  }
  return map;
}

/**
 * Column references, as [alias|null, column] pairs, taken only from positions
 * where SQL cannot mean anything but a column.
 */
function columnRefs(sql) {
  const refs = [];
  const push = (alias, col) => {
    const c = (col || '').toLowerCase();
    if (!c || NON_COLUMNS.has(c) || /^\d/.test(c)) return;
    refs.push([alias ? alias.toLowerCase() : null, c]);
  };

  // alias.column — unambiguous wherever it appears.
  let m;
  const qualified = /\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/gi;
  while ((m = qualified.exec(sql))) push(m[1], m[2]);

  // INSERT INTO t (a, b, c)
  const insert = /INSERT\s+INTO\s+"?[a-z_][a-z0-9_]*"?\s*\(([^)]*)\)/gi;
  while ((m = insert.exec(sql))) {
    for (const raw of m[1].split(',')) push(null, raw.trim().replace(/"/g, ''));
  }

  // SET a = ?, b = ?
  const setClause = /\bSET\s+([\s\S]*?)(?:\bWHERE\b|\bRETURNING\b|$)/gi;
  while ((m = setClause.exec(sql))) {
    const assignRe = /([a-z_][a-z0-9_]*)\s*=/gi;
    let a;
    while ((a = assignRe.exec(m[1]))) push(null, a[1]);
  }

  // WHERE/AND/OR <col> <operator>
  const predicate = /\b(?:WHERE|AND|OR)\s+"?([a-z_][a-z0-9_]*)"?\s*(?:=|!=|<>|>=|<=|>|<|\bIS\b|\bLIKE\b|\bIN\b|\bBETWEEN\b)/gi;
  while ((m = predicate.exec(sql))) push(null, m[1]);

  // ORDER BY / GROUP BY lists
  const byClause = /\b(?:ORDER|GROUP)\s+BY\s+([\s\S]*?)(?:\bLIMIT\b|\bOFFSET\b|\bHAVING\b|$)/gi;
  while ((m = byClause.exec(sql))) {
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/\s+(ASC|DESC)$/i, '').replace(/"/g, '');
      if (/^[a-z_][a-z0-9_]*$/i.test(t)) push(null, t);
    }
  }

  return refs;
}

async function main() {
  const db = require('../src/config/database');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const only = args[0] ? args[0].toLowerCase() : null;

  const liveTables = new Set((await db.listTables()).map((t) => t.toLowerCase()));
  const schema = new Map();
  for (const t of liveTables) {
    schema.set(t, new Set((await db.getTableColumns(t)).map((c) => c.name.toLowerCase())));
  }

  const findings = new Map(); // "table.col" -> Set(file)

  /**
   * References that look like mismatches but are correct as written.
   *
   * Keep this list short and justified. Every other entry that once appeared
   * here turned out to be a real bug; these two did not.
   */
  const ACCEPTED = new Set([
    // A tsvector column that exists only on PostgreSQL. The query using it sits
    // in a try/catch whose fallback is the wildcard search that actually serves
    // SQLite, so its absence here is by design rather than an oversight.
    'local_shops.search_vector',

    // admin-partition.middleware.js builds ` AND region_id IN (SELECT ... FROM
    // legacy_region_territory_map ...)` as a fragment appended to other queries.
    // region_id belongs to whichever table that fragment is attached to, not to
    // legacy_region_territory_map, which the extractor cannot tell from here.
    'legacy_region_territory_map.region_id',
  ]);
  let statementsScanned = 0;

  for (const file of sourceFiles(SRC)) {
    // Strip commented-out code before extracting statements. A disabled UPDATE
    // in engagement.routes.js was being reported as a live reference to
    // local_shops.total_ratings, which is a column nobody actually queries.
    // Only whole-line // comments are removed, so a trailing comment cannot
    // truncate the statement on the same line.
    const text = fs.readFileSync(file, 'utf8')
      .replace(/^[ \t]*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const rel = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');

    for (const sql of extractStatements(text)) {
      const aliases = tableAliases(sql);
      const derived = selectAliases(sql);
      const known = [...aliases.keys()].filter((t) => liveTables.has(t));
      if (!known.length) continue;
      statementsScanned++;

      // alias -> table, for qualified references.
      const aliasTo = new Map();
      for (const [table, set] of aliases) {
        for (const a of set) aliasTo.set(a, table);
        aliasTo.set(table, table); // table name used as its own qualifier
      }

      for (const [alias, col] of columnRefs(sql)) {
        let table;
        if (alias) {
          table = aliasTo.get(alias);
          if (!table) continue;               // unknown qualifier — skip
        } else if (known.length === 1) {
          table = known[0];                   // unqualified is safe only here
        } else {
          continue;                           // ambiguous across a join
        }
        if (!liveTables.has(table)) continue;
        if (only && table !== only) continue;
        if (schema.get(table).has(col)) continue;
        if (derived.has(col)) continue; // an alias this statement defines

        const key = `${table}.${col}`;
        if (ACCEPTED.has(key)) continue;
        if (!findings.has(key)) findings.set(key, new Set());
        findings.get(key).add(rel);
      }
    }
  }

  const rows = [...findings.entries()]
    .map(([key, files]) => ({ key, files: [...files] }))
    .sort((a, b) => b.files.length - a.files.length || a.key.localeCompare(b.key));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log('\nColumns referenced by SQL but missing from the live table');
  console.log('='.repeat(78));
  console.log(`Statements analysed: ${statementsScanned}`);
  console.log(`Attributable mismatches: ${rows.length}\n`);

  const byTable = new Map();
  for (const r of rows) {
    const t = r.key.split('.')[0];
    if (!byTable.has(t)) byTable.set(t, []);
    byTable.get(t).push(r);
  }

  for (const [table, items] of [...byTable.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
    console.log(`  ${table}  (${items.length})`);
    for (const i of items.slice(0, 6)) {
      console.log(`      ${i.key.split('.')[1].padEnd(28)} ${String(i.files.length).padStart(2)} file(s)  ${i.files[0]}`);
    }
    if (items.length > 6) console.log(`      ... and ${items.length - 6} more`);
  }
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });

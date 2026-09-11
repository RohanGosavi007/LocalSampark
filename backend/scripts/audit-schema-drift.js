#!/usr/bin/env node
/**
 * Compare the SQLite and PostgreSQL schema definitions table by table.
 *
 * The two are maintained as separate DDL sets (src/migrations/init.sqlite.sql
 * plus 0NN_*.sqlite.sql, versus init.sql plus 0NN_*.sql). Nothing enforces that
 * they agree, and they have drifted: marketplace_listings carries
 * `zone TEXT` and a TEXT `coordinate` on SQLite but only a
 * `GEOGRAPHY(Point,4326)` coordinate on Postgres, while application code reads
 * `latitude`/`longitude` columns that exist in neither.
 *
 * Code written and tested against one driver is therefore not trustworthy on
 * the other, which is the condition that has to be fixed before any
 * multi-tenant scoping migration can be designed.
 *
 *   node scripts/audit-schema-drift.js
 *   node scripts/audit-schema-drift.js marketplace_listings local_shops
 */
const fs = require('fs');
const path = require('path');

const MIG = path.resolve(__dirname, '..', 'src', 'migrations');

/** Collect CREATE TABLE bodies plus ALTER TABLE ADD COLUMN from a DDL set. */
function collectSchema(files) {
  const tables = {};

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIG, file), 'utf8');

    const createRe = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
    let m;
    while ((m = createRe.exec(sql))) {
      const name = m[1].toLowerCase();
      tables[name] = tables[name] || new Set();
      for (const line of m[2].split('\n')) {
        const col = line.trim().match(/^"?(\w+)"?\s+[A-Za-z]/);
        if (!col) continue;
        const kw = col[1].toUpperCase();
        if (['PRIMARY', 'FOREIGN', 'UNIQUE', 'CONSTRAINT', 'CHECK', 'INDEX'].includes(kw)) continue;
        tables[name].add(col[1].toLowerCase());
      }
    }

    const alterRe = /ALTER TABLE\s+"?(\w+)"?\s+ADD COLUMN(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?/gi;
    while ((m = alterRe.exec(sql))) {
      const name = m[1].toLowerCase();
      tables[name] = tables[name] || new Set();
      tables[name].add(m[2].toLowerCase());
    }
  }
  return tables;
}

const all = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort();
const sqliteFiles = all.filter((f) => f.includes('.sqlite.'));
const pgFiles = all.filter((f) => !f.includes('.sqlite.'));

const sqlite = collectSchema(sqliteFiles);
const pg = collectSchema(pgFiles);

const wanted = process.argv.slice(2).map((s) => s.toLowerCase());
const names = (wanted.length ? wanted : [...new Set([...Object.keys(sqlite), ...Object.keys(pg)])]).sort();

let drifted = 0;
let onlySqlite = 0;
let onlyPg = 0;
const rows = [];

for (const t of names) {
  const a = sqlite[t];
  const b = pg[t];
  if (!a && !b) continue;
  if (!a) { onlyPg++; rows.push({ t, kind: 'postgres only' }); continue; }
  if (!b) { onlySqlite++; rows.push({ t, kind: 'sqlite only' }); continue; }

  const missingInPg = [...a].filter((c) => !b.has(c));
  const missingInSqlite = [...b].filter((c) => !a.has(c));
  if (missingInPg.length || missingInSqlite.length) {
    drifted++;
    rows.push({ t, kind: 'drift', missingInPg, missingInSqlite });
  }
}

console.log('\nSQLite vs PostgreSQL schema drift');
console.log('='.repeat(78));
console.log(`sqlite DDL files: ${sqliteFiles.length}   postgres DDL files: ${pgFiles.length}`);
console.log(`tables: ${Object.keys(sqlite).length} sqlite / ${Object.keys(pg).length} postgres\n`);

const driftRows = rows.filter((r) => r.kind === 'drift');
if (wanted.length) {
  for (const r of rows) {
    console.log(`  ${r.t}`);
    if (r.kind !== 'drift') { console.log(`      ${r.kind}`); continue; }
    if (r.missingInPg.length) console.log(`      missing in postgres : ${r.missingInPg.join(', ')}`);
    if (r.missingInSqlite.length) console.log(`      missing in sqlite   : ${r.missingInSqlite.join(', ')}`);
  }
} else {
  console.log(`Tables with column drift: ${drifted}`);
  console.log(`Defined only in sqlite  : ${onlySqlite}`);
  console.log(`Defined only in postgres: ${onlyPg}\n`);
  console.log('Worst 20 by column difference:');
  driftRows
    .sort((x, y) => (y.missingInPg.length + y.missingInSqlite.length) - (x.missingInPg.length + x.missingInSqlite.length))
    .slice(0, 20)
    .forEach((r) => {
      console.log(`  ${r.t.padEnd(30)} +${r.missingInSqlite.length} pg-only  +${r.missingInPg.length} sqlite-only`);
    });
  console.log('\nRun with table names for per-column detail.');
}
console.log('');
process.exit(driftRows.length ? 1 : 0);

#!/usr/bin/env node
/**
 * Which SQLite-only tables are actually reachable in production?
 *
 * The SQLite and PostgreSQL DDL sets are maintained separately and have
 * drifted: 44 tables are created by the .sqlite.sql migrations and by no
 * PostgreSQL migration at all. Production runs PostgreSQL, so any route
 * querying one of them fails there while passing every local test.
 *
 * This cross-references those tables against route handlers to separate the
 * ones that would actually 500 in production from the ones that are only
 * defined and never used.
 *
 *   node scripts/audit-missing-pg-tables.js
 *   node scripts/audit-missing-pg-tables.js --json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src');
const MIG = path.join(ROOT, 'migrations');

function createdTables(files) {
  const t = new Set();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIG, f), 'utf8');
    const re = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?/gi;
    let m;
    while ((m = re.exec(sql))) t.add(m[1].toLowerCase());
  }
  return t;
}

const allMig = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql'));
const sqliteOnly = [...createdTables(allMig.filter((f) => f.includes('.sqlite.')))]
  .filter((t) => !createdTables(allMig.filter((f) => !f.includes('.sqlite.'))).has(t))
  .sort();

// Walk application source, skipping migrations and scripts.
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'migrations' || e.name === 'seeds' || e.name === '__tests__') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const sources = walk(ROOT);
const report = [];

for (const table of sqliteOnly) {
  // Word-boundary match against SQL usage, not bare mentions in comments.
  const re = new RegExp(`(FROM|JOIN|INTO|UPDATE)\\s+${table}\\b`, 'i');
  const hits = [];

  for (const file of sources) {
    const src = fs.readFileSync(file, 'utf8');
    if (!re.test(src)) continue;
    const rel = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
    hits.push({ file: rel, isRoute: /routes?[\\/]|\.routes\.js$|controllers?[\\/]/.test(rel) });
  }

  report.push({
    table,
    referenced: hits.length > 0,
    inRouteLayer: hits.some((h) => h.isRoute),
    files: hits.map((h) => h.file),
  });
}

const live = report.filter((r) => r.inRouteLayer);
const referencedElsewhere = report.filter((r) => r.referenced && !r.inRouteLayer);
const unused = report.filter((r) => !r.referenced);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ live, referencedElsewhere, unused }, null, 2));
  process.exit(live.length ? 1 : 0);
}

console.log('\nSQLite-only tables vs live route usage');
console.log('='.repeat(78));
console.log(`${sqliteOnly.length} tables exist in the SQLite schema and in no PostgreSQL migration.\n`);

console.log(`WOULD BREAK IN PRODUCTION — queried from the route layer: ${live.length}`);
for (const r of live) {
  console.log(`  ${r.table.padEnd(34)} ${r.files.slice(0, 2).join(', ')}`);
}

console.log(`\nReferenced outside routes (jobs, services, sockets): ${referencedElsewhere.length}`);
for (const r of referencedElsewhere) console.log(`  ${r.table.padEnd(34)} ${r.files.slice(0, 2).join(', ')}`);

console.log(`\nDefined but never queried — no production impact: ${unused.length}`);
console.log('  ' + unused.map((r) => r.table).join(', '));

console.log('\n' + '='.repeat(78));
console.log('Tables in the first group need a PostgreSQL migration before launch.');
console.log('The last group can wait, or be dropped from the SQLite schema.\n');

process.exit(live.length ? 1 : 0);

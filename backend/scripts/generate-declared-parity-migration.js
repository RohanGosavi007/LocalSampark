#!/usr/bin/env node
/**
 * Find columns the migrations declare but no database actually has.
 *
 * Migration 076 reconciled the development database against a freshly-migrated
 * one. That cannot catch a column both are missing, and there is a whole class
 * of those: when two migrations declare the same table with CREATE TABLE IF NOT
 * EXISTS, the earlier one wins and the later, richer definition silently does
 * nothing -- in *every* database, so there is nothing to diff against.
 *
 * medical_doctors is the clear example. 024 creates it with 11 columns; 026
 * declares 17, including geohash, latitude, longitude and license_no. 026's
 * statement has never once executed, so 026's own `CREATE INDEX ... (geohash)`
 * fails on every migration run -- which is the only reason anybody noticed.
 *
 * This reads every CREATE TABLE in the migration set, unions the columns
 * declared for each table, and compares that against the live schema. Anything
 * declared but absent is emitted as an ALTER. The union is additive, so a table
 * that was deliberately redesigned keeps both shapes rather than losing either.
 *
 *   node scripts/generate-declared-parity-migration.js
 */
const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');
const MIG = path.join(BACKEND, 'src', 'migrations');

const NON_COLUMN = /^(CONSTRAINT|UNIQUE|PRIMARY|FOREIGN|CHECK|INDEX|KEY)\b/i;

/** Split a CREATE TABLE body into top-level column definitions. */
function splitDefs(body) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/** table -> { column -> type }, unioned across every CREATE TABLE in `files`. */
function declaredColumns(files) {
  const out = {};
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIG, f), 'utf8');
    // Strip line comments so a commented-out column is not picked up.
    const clean = sql.replace(/--[^\n]*/g, '');
    const re = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
    let m;
    while ((m = re.exec(clean))) {
      const table = m[1].toLowerCase();
      out[table] = out[table] || {};
      for (const raw of splitDefs(m[2])) {
        const line = raw.trim().replace(/\s+/g, ' ');
        if (!line || NON_COLUMN.test(line)) continue;
        const cm = line.match(/^"?(\w+)"?\s+([A-Za-z][\w]*(?:\s*\([^)]*\))?)/);
        if (!cm) continue;
        const name = cm[1].toLowerCase();
        if (!out[table][name]) out[table][name] = cm[2].toUpperCase().replace(/\s+/g, '');
      }
    }
  }
  return out;
}

function main() {
  const all = fs.readdirSync(MIG);
  const sqliteFiles = all.filter((f) => f.endsWith('.sqlite.sql'));
  const pgFiles = all.filter((f) => f.endsWith('.sql') && !f.includes('.sqlite.'));

  const declaredSqlite = declaredColumns(sqliteFiles);
  const declaredPg = declaredColumns(pgFiles);

  const db = require('../src/config/database');

  (async () => {
    const liveTables = await db.listTables();
    const sqliteLines = [];
    const pgLines = [];
    let count = 0;
    const touched = [];

    for (const table of liveTables.slice().sort()) {
      const declared = declaredSqlite[table.toLowerCase()];
      if (!declared) continue;

      const actual = new Set((await db.getTableColumns(table)).map((c) => c.name.toLowerCase()));
      const missing = Object.entries(declared).filter(([n]) => !actual.has(n));
      if (!missing.length) continue;

      touched.push(`${table} (+${missing.length})`);
      sqliteLines.push('', `-- ${table}: ${missing.length} column(s) declared by a migration that never ran`);
      for (const [name, type] of missing) {
        sqliteLines.push(`ALTER TABLE ${table} ADD COLUMN ${name} ${type};`);
        count++;
      }

      // Mirror on PostgreSQL using that engine's own declared type where known,
      // since the same stub-wins-over-full problem exists there too.
      const pgDeclared = declaredPg[table.toLowerCase()] || {};
      const pgMissing = missing.map(([n]) => [n, pgDeclared[n] || 'TEXT']);
      pgLines.push('', `-- ${table}: ${pgMissing.length} column(s) declared by a migration that never ran`);
      for (const [name, type] of pgMissing) {
        pgLines.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${name} ${type};`);
      }
    }

    const header = `-- Migration 079: columns declared by migrations that never executed
--
-- When two migrations declare the same table with CREATE TABLE IF NOT EXISTS,
-- the earlier one wins and the later, richer definition silently does nothing.
-- Unlike the drift repaired in 076, this affects every database equally, so
-- there was no working copy to compare against and nothing looked wrong.
--
-- medical_doctors is the clearest case: 024 creates it with 11 columns and 026
-- declares 17. 026's definition has never executed, so its own
-- CREATE INDEX ... (geohash) failed on every migration run -- the only visible
-- symptom of a table missing nine columns the application queries.
--
-- Generated by scripts/generate-declared-parity-migration.js, by unioning every
-- CREATE TABLE in the migration set and diffing against the live schema. The
-- union is additive: a table that was deliberately reshaped keeps both sets of
-- columns rather than losing either.
`;

    fs.writeFileSync(path.join(MIG, '079_declared_column_parity.sqlite.sql'), header + sqliteLines.join('\n') + '\n');
    fs.writeFileSync(path.join(MIG, '079_declared_column_parity.sql'), header + pgLines.join('\n') + '\n');

    console.log('\nDeclared-but-absent column parity');
    console.log('='.repeat(78));
    console.log(`Columns declared by a migration that never ran: ${count}`);
    console.log(`Tables affected: ${touched.length}\n`);
    for (const t of touched.slice(0, 25)) console.log('  ' + t);
    if (touched.length > 25) console.log(`  ... and ${touched.length - 25} more`);
    console.log('\nWritten: 079_declared_column_parity.sql / .sqlite.sql\n');
    process.exit(0);
  })();
}

main();

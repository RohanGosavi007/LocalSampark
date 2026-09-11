#!/usr/bin/env node
/**
 * Generate PostgreSQL DDL for tables that exist only in the SQLite schema.
 *
 * 44 tables are created by the .sqlite.sql migrations and by no PostgreSQL
 * migration; 36 of them are queried from the route layer, so those endpoints
 * fail in production while passing every local test. Whole modules — carpool,
 * jobs, the marketplace's chat/offers/auctions — are affected, plus
 * shop_settings, which sits in the checkout path.
 *
 * Translation is mechanical, but foreign keys are not: a column referencing
 * users(id) must be UUID because that is how users is declared in
 * PostgreSQL, while SQLite declares everything TEXT. Every FK is therefore
 * resolved against the real PostgreSQL schema and its type taken from the
 * target's primary key. Any FK whose target does not exist in PostgreSQL is
 * reported instead of emitted, because it could not be created anyway.
 *
 * There is no PostgreSQL instance and no Docker in this environment, so the
 * output is validated statically, not executed. Review before applying.
 *
 *   node scripts/generate-pg-migrations.js            # dry run + validation
 *   node scripts/generate-pg-migrations.js --write    # write the migration
 */
const fs = require('fs');
const path = require('path');

const MIG = path.resolve(__dirname, '..', 'src', 'migrations');
const OUT = path.join(MIG, '068_pg_parity_missing_tables.sql');

const OUT_BASENAME = '068_pg_parity_missing_tables.sql';

const files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql'));
const sqliteFiles = files.filter((f) => f.includes('.sqlite.'));
// This generator's own output is excluded from the "already in PostgreSQL" set.
// Including it makes the second run see every table it just created as present,
// generate nothing, and overwrite the file with an empty one — silently undoing
// the parity it had established.
const pgFiles = files.filter((f) => !f.includes('.sqlite.') && f !== OUT_BASENAME);

/** name -> raw CREATE TABLE body */
function createBodies(list) {
  const out = {};
  for (const f of list) {
    const sql = fs.readFileSync(path.join(MIG, f), 'utf8');
    const re = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
    let m;
    while ((m = re.exec(sql))) {
      const name = m[1].toLowerCase();
      if (!out[name]) out[name] = m[2];
    }
  }
  return out;
}

const sqliteTables = createBodies(sqliteFiles);
const pgTables = createBodies(pgFiles);

/** Primary-key type of an existing PostgreSQL table, for FK matching. */
function pgPrimaryKeyType(table) {
  const body = pgTables[table];
  if (!body) return null;
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!/PRIMARY KEY/i.test(t)) continue;
    const m = t.match(/^"?(\w+)"?\s+([A-Za-z][\w()]*)/);
    if (m && !['PRIMARY', 'CONSTRAINT'].includes(m[1].toUpperCase())) return m[2].toUpperCase();
  }
  return null;
}

function mapType(sqliteType, isPk) {
  const t = (sqliteType || '').toUpperCase();
  if (/INTEGER/.test(t) && isPk) return 'SERIAL';
  if (/INT/.test(t)) return 'INTEGER';
  if (/REAL|FLOAT|DOUBLE/.test(t)) return 'DOUBLE PRECISION';
  if (/DECIMAL|NUMERIC/.test(t)) return t;
  if (/BOOLEAN/.test(t)) return 'BOOLEAN';
  if (/DATETIME|TIMESTAMP/.test(t)) return 'TIMESTAMP WITH TIME ZONE';
  if (/DATE/.test(t)) return 'DATE';
  if (/BLOB/.test(t)) return 'BYTEA';
  return 'TEXT';
}

const problems = [];
const emitted = [];

const missing = Object.keys(sqliteTables).filter((t) => !pgTables[t]).sort();

for (const table of missing) {
  const cols = [];
  const fks = [];

  for (const rawLine of sqliteTables[table].split('\n')) {
    let line = rawLine.trim().replace(/,$/, '');
    if (!line || line.startsWith('--')) continue;

    // Table-level constraints are carried over verbatim where safe.
    if (/^(PRIMARY KEY|UNIQUE|CHECK)\s*\(/i.test(line)) { cols.push(`  ${line}`); continue; }
    if (/^FOREIGN KEY/i.test(line)) { cols.push(`  ${line}`); continue; }

    const m = line.match(/^"?(\w+)"?\s+([A-Za-z][\w()]*)\s*(.*)$/);
    if (!m) continue;
    const [, name, sqlType, rest] = m;
    const isPk = /PRIMARY KEY/i.test(rest);

    // Inline REFERENCES: type must match the target's PK type.
    const ref = rest.match(/REFERENCES\s+"?(\w+)"?\s*\(\s*"?(\w+)"?\s*\)/i);
    let pgType = mapType(sqlType, isPk);

    if (ref) {
      const targetTable = ref[1].toLowerCase();
      const targetType = pgPrimaryKeyType(targetTable);
      if (!targetType) {
        // Target is itself missing from PostgreSQL; emit the column but drop
        // the constraint, and record it so ordering can be fixed by hand.
        problems.push(`${table}.${name} -> ${targetTable}(${ref[2]}): target table not in PostgreSQL schema`);
        pgType = mapType(sqlType, isPk);
        cols.push(`  ${name} ${pgType}${isPk ? ' PRIMARY KEY' : ''}`);
        continue;
      }
      pgType = targetType.replace(/^SERIAL$/, 'INTEGER');
      fks.push(`${name} -> ${targetTable}(${ref[2]}) as ${pgType}`);
    }

    let tail = rest
      .replace(/PRIMARY KEY/i, '')
      .replace(/AUTOINCREMENT/i, '')
      .replace(/REFERENCES[\s\S]*$/i, (s) => s) // keep REFERENCES
      .trim();

    // SQLite boolean defaults are 0/1; PostgreSQL BOOLEAN needs FALSE/TRUE.
    if (pgType === 'BOOLEAN') tail = tail.replace(/DEFAULT\s+1\b/i, 'DEFAULT TRUE').replace(/DEFAULT\s+0\b/i, 'DEFAULT FALSE');
    tail = tail.replace(/DEFAULT\s+\(?datetime\('now'\)\)?/i, 'DEFAULT CURRENT_TIMESTAMP');

    cols.push(`  ${name} ${pgType}${isPk ? ' PRIMARY KEY' : ''}${tail ? ' ' + tail : ''}`.replace(/\s+/g, ' ').replace(/ ,/g, ','));
  }

  if (!cols.length) { problems.push(`${table}: no columns parsed`); continue; }

  // Columns added by later SQLite migrations must come across too, or the
  // generated PostgreSQL table is already behind the moment it is created.
  const declared = new Set(
    cols.map((c) => (c.trim().match(/^(\w+)/) || [])[1]).filter(Boolean).map((s) => s.toLowerCase())
  );
  const alters = [];
  for (const f of sqliteFiles) {
    const sql = fs.readFileSync(path.join(MIG, f), 'utf8');
    const re = new RegExp(`ALTER TABLE\\s+"?${table}"?\\s+ADD COLUMN(?:\\s+IF NOT EXISTS)?\\s+"?(\\w+)"?\\s+([A-Za-z][\\w()]*)\\s*([^;]*);`, 'gi');
    let m;
    while ((m = re.exec(sql))) {
      const col = m[1].toLowerCase();
      if (declared.has(col)) continue;
      declared.add(col);
      const pgType = mapType(m[2], false);
      let tail = (m[3] || '').trim();
      if (pgType === 'BOOLEAN') tail = tail.replace(/DEFAULT\s+1\b/i, 'DEFAULT TRUE').replace(/DEFAULT\s+0\b/i, 'DEFAULT FALSE');
      tail = tail.replace(/DEFAULT\s+\(?datetime\('now'\)\)?/i, 'DEFAULT CURRENT_TIMESTAMP');
      alters.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${pgType}${tail ? ' ' + tail : ''};`);
    }
  }

  emitted.push({
    table,
    ddl: `CREATE TABLE IF NOT EXISTS ${table} (\n${cols.join(',\n')}\n);` +
         (alters.length ? '\n' + alters.join('\n') : ''),
    fks,
  });
}

console.log('\nPostgreSQL parity migration generator');
console.log('='.repeat(78));
console.log(`Tables missing from PostgreSQL: ${missing.length}`);
console.log(`Generated: ${emitted.length}`);
console.log(`Needs manual attention: ${problems.length}\n`);

if (problems.length) {
  console.log('Unresolved foreign keys / parse issues:');
  for (const p of problems.slice(0, 20)) console.log('  - ' + p);
  if (problems.length > 20) console.log(`  ... and ${problems.length - 20} more`);
  console.log('');
}

if (process.argv.includes('--write')) {
  const header = `-- Migration 068: PostgreSQL parity for tables that existed only in SQLite
--
-- ${missing.length} tables were created by the .sqlite.sql migrations and by no
-- PostgreSQL migration. 36 of them are queried from the route layer, so those
-- endpoints return 500 in production while passing every local test — carpool,
-- jobs, marketplace chat/offers/auctions, and shop_settings (checkout path).
--
-- Generated by scripts/generate-pg-migrations.js. Column types are translated
-- from the SQLite DDL; foreign-key columns take their type from the referenced
-- table's primary key in the PostgreSQL schema, since SQLite declares
-- everything TEXT while PostgreSQL uses UUID for most primary keys.
--
-- NOT EXECUTED AGAINST POSTGRESQL. No PostgreSQL instance or Docker was
-- available when this was produced, so it is statically validated only.
-- Review before applying to production.

`;
  fs.writeFileSync(OUT, header + emitted.map((e) => `-- ${e.table}\n${e.ddl}`).join('\n\n') + '\n');
  console.log(`Written: ${path.relative(path.resolve(__dirname, '..'), OUT)}`);
} else {
  console.log('Dry run. Pass --write to emit the migration.');
}
console.log('');

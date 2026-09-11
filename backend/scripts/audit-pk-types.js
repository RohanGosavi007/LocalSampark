#!/usr/bin/env node
/**
 * Compare primary-key types between the live SQLite schema and the PostgreSQL DDL.
 *
 * local_shops.id is INTEGER PRIMARY KEY AUTOINCREMENT in SQLite and
 * UUID PRIMARY KEY in PostgreSQL. That is a type divergence, not a naming one,
 * and it is more damaging than a missing column: every foreign key pointing at
 * such a table has to match the referenced type, so a column declared
 * `shop_id UUID REFERENCES local_shops(id)` cannot work on an engine where that
 * id is an integer. Application code is affected too — anything generating
 * crypto.randomUUID() for a row id fails against an integer key.
 *
 * This exists because migrations 067-074 added foreign keys, and any of them
 * pointing at a divergent table would be wrong on one engine.
 *
 *   node scripts/audit-pk-types.js
 *   node scripts/audit-pk-types.js --fks    # also list affected foreign keys
 */
const fs = require('fs');
const path = require('path');

const MIG = path.resolve(__dirname, '..', 'src', 'migrations');
const GENERATED = new Set(['068_pg_parity_missing_tables.sql']);

/** PostgreSQL CREATE TABLE bodies, first declaration wins. */
function pgTableBodies() {
  const out = {};
  const files = fs.readdirSync(MIG)
    .filter((f) => f.endsWith('.sql') && !f.includes('.sqlite.') && !GENERATED.has(f));
  const init = files.filter((f) => /^init\./.test(f)).sort();
  const rest = files.filter((f) => !/^init\./.test(f)).sort();

  for (const f of [...init, ...rest]) {
    const sql = fs.readFileSync(path.join(MIG, f), 'utf8');
    const re = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
    let m;
    while ((m = re.exec(sql))) {
      const t = m[1].toLowerCase();
      if (!out[t]) out[t] = m[2];
    }
  }
  return out;
}

function pgPkType(body) {
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!/PRIMARY KEY/i.test(line)) continue;
    const m = line.match(/^"?(\w+)"?\s+([A-Za-z][\w()]*)/);
    if (!m) continue;
    if (['PRIMARY', 'CONSTRAINT', 'UNIQUE'].includes(m[1].toUpperCase())) continue;
    return { column: m[1].toLowerCase(), type: m[2].toUpperCase() };
  }
  return null;
}

/** Broad family so VARCHAR/TEXT/UUID are not reported as differences. */
function family(type) {
  const t = (type || '').toUpperCase();
  if (/SERIAL|INT/.test(t)) return 'integer';
  if (/UUID/.test(t)) return 'uuid';
  if (/CHAR|TEXT|CLOB/.test(t)) return 'text';
  return t.toLowerCase();
}

async function main() {
  const db = require('../src/config/database');
  const pg = pgTableBodies();
  const liveTables = await db.listTables();

  const diverged = [];
  const uuidInSqlite = [];
  let compared = 0;

  for (const table of liveTables) {
    const body = pg[table.toLowerCase()];
    if (!body) continue;

    const cols = await db.getTableColumns(table);
    const pkCol = cols.find((c) => c.primaryKey);
    if (!pkCol) continue;

    const pgPk = pgPkType(body);
    if (!pgPk) continue;

    compared++;
    const sqliteFamily = family(pkCol.type);
    const pgFamily = family(pgPk.type);

    // SQLite stores UUID strings in a TEXT column, so text vs uuid is the same
    // thing in practice. integer vs either is not.
    const equivalent =
      sqliteFamily === pgFamily ||
      (sqliteFamily === 'text' && pgFamily === 'uuid') ||
      (sqliteFamily === 'uuid' && pgFamily === 'text');

    if (!equivalent) {
      diverged.push({
        table,
        sqlite: `${pkCol.name} ${pkCol.type}`,
        postgres: `${pgPk.column} ${pgPk.type}`,
      });
    }
    if (sqliteFamily === 'text' && pgFamily === 'uuid') uuidInSqlite.push(table);
  }

  console.log('\nPrimary-key type divergence: live SQLite vs PostgreSQL DDL');
  console.log('='.repeat(78));
  console.log(`Tables present in both and compared: ${compared}`);
  console.log(`Divergent: ${diverged.length}\n`);

  if (diverged.length) {
    console.log('  table                          sqlite                    postgres');
    console.log('  ' + '-'.repeat(74));
    for (const d of diverged) {
      console.log(`  ${d.table.padEnd(30)} ${d.sqlite.padEnd(25)} ${d.postgres}`);
    }
  } else {
    console.log('  none — every shared table agrees on its primary-key family.');
  }

  console.log(`\n  (${uuidInSqlite.length} tables use TEXT in SQLite for a PostgreSQL UUID key — equivalent, not a problem.)`);

  if (process.argv.includes('--fks') && diverged.length) {
    console.log('\nForeign keys pointing at a divergent table:');
    const names = new Set(diverged.map((d) => d.table.toLowerCase()));
    const files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql'));
    const hits = [];
    for (const f of files) {
      const sql = fs.readFileSync(path.join(MIG, f), 'utf8');
      const re = /"?(\w+)"?\s+([A-Za-z][\w()]*)[^,\n]*REFERENCES\s+"?(\w+)"?/gi;
      let m;
      while ((m = re.exec(sql))) {
        if (names.has(m[3].toLowerCase())) hits.push(`${f}: ${m[1]} ${m[2]} -> ${m[3]}`);
      }
    }
    for (const h of [...new Set(hits)].slice(0, 30)) console.log('  ' + h);
    if (hits.length > 30) console.log(`  ... and ${hits.length - 30} more`);
  }
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });

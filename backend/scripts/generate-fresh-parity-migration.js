#!/usr/bin/env node
/**
 * Emit the migration that makes a freshly-migrated database match the live one.
 *
 * Several tables are declared twice with CREATE TABLE IF NOT EXISTS: once as an
 * early stub and once, later, in full. On a fresh database the stub runs first
 * and the full declaration silently does nothing, so a new deployment gets
 * society_assets with 7 columns (`name`) where the code expects 23 (`asset_name`).
 * The development database escaped this only because it was built before the
 * migrations reached their current order — which is exactly why the difference
 * went unseen: the one database anybody looks at is the one that is correct.
 *
 * Rather than hand-writing the repair, this measures the real difference between
 * a fresh migration and the live schema and generates ALTER statements from it,
 * so no column is missed and none is invented.
 *
 * Columns SQLite cannot add retroactively (a primary key, or NOT NULL without a
 * default) are reported separately: those tables need a rebuild, not an ALTER.
 *
 *   node scripts/generate-fresh-parity-migration.js <fresh.db>
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKEND = path.resolve(__dirname, '..');
const MIG = path.join(BACKEND, 'src', 'migrations');

function readSchema(dbPath) {
  const script = `
    process.env.SQLITE_DB_PATH = ${JSON.stringify(dbPath)};
    process.env.USE_SQLITE = 'true';
    const db = require(${JSON.stringify(path.join(BACKEND, 'src', 'config', 'database'))});
    (async () => {
      const out = {};
      for (const t of await db.listTables()) {
        out[t] = (await db.getTableColumns(t)).map(c => ({
          name: c.name, type: c.type, notNull: !!c.notNull,
          dflt: c.defaultValue === undefined ? null : c.defaultValue,
          pk: !!c.primaryKey,
        }));
      }
      process.stdout.write('@@' + JSON.stringify(out));
      process.exit(0);
    })();
  `;
  const out = execFileSync(process.execPath, ['-e', script], {
    cwd: BACKEND, encoding: 'utf8', maxBuffer: 1 << 26,
  });
  return JSON.parse(out.slice(out.indexOf('@@') + 2));
}

/** CREATE TABLE statements straight from sqlite_master, keyed by table name. */
function readDdl(dbPath) {
  const script = `
    process.env.SQLITE_DB_PATH = ${JSON.stringify(dbPath)};
    process.env.USE_SQLITE = 'true';
    const db = require(${JSON.stringify(path.join(BACKEND, 'src', 'config', 'database'))});
    (async () => {
      const r = await db.query("SELECT name, sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL");
      const out = {};
      for (const row of (r.rows || [])) out[row.name] = row.sql;
      process.stdout.write('@@' + JSON.stringify(out));
      process.exit(0);
    })();
  `;
  const out = execFileSync(process.execPath, ['-e', script], {
    cwd: BACKEND, encoding: 'utf8', maxBuffer: 1 << 26,
  });
  return JSON.parse(out.slice(out.indexOf('@@') + 2));
}

/**
 * A default clause for ALTER TABLE ADD COLUMN.
 *
 * SQLite only accepts a constant here: CURRENT_TIMESTAMP and datetime('now')
 * are both rejected ("Cannot add a column with non-constant default" and a
 * syntax error respectively). PostgreSQL accepts them, so the clause differs by
 * engine rather than being dropped from both.
 */
function defaultClause(col, engine) {
  const nonConstant = (d) => /CURRENT_(TIMESTAMP|DATE|TIME)|\(/i.test(String(d));

  if (col.dflt !== null && col.dflt !== undefined && col.dflt !== '') {
    if (engine === 'sqlite' && nonConstant(col.dflt)) {
      // Existing rows get NULL rather than a timestamp; the application sets
      // these on insert, and a wrong constant would be worse than none.
      return '';
    }
    return ` DEFAULT ${col.dflt}`;
  }
  // SQLite refuses NOT NULL without a default on ADD COLUMN, so supply one that
  // matches the declared type rather than dropping the constraint.
  if (col.notNull) {
    if (/INT|REAL|NUM|DEC|DOUBLE|FLOAT/i.test(col.type)) return ' DEFAULT 0';
    return " DEFAULT ''";
  }
  return '';
}

function main() {
  const freshPath = process.argv[2];
  if (!freshPath || !fs.existsSync(freshPath)) {
    console.error('Usage: node scripts/generate-fresh-parity-migration.js <fresh.db>');
    console.error('Build one with: SQLITE_DB_PATH=<path> USE_SQLITE=true npm run migrate');
    process.exit(1);
  }

  const fresh = readSchema(freshPath);
  const live = readSchema(path.join(BACKEND, 'src', 'data', 'localsampark.db'));

  const sqliteLines = [];
  const pgLines = [];
  const needsRebuild = [];
  const missingTables = [];
  let added = 0;

  for (const table of Object.keys(live).sort()) {
    if (!fresh[table]) { missingTables.push(table); continue; }

    const have = new Set(fresh[table].map((c) => c.name));
    const missing = live[table].filter((c) => !have.has(c.name));
    if (!missing.length) continue;

    // A primary key cannot be introduced by ALTER, but that is no reason to skip
    // the table's other columns -- doing so left 44 columns unaddressed. Only the
    // key itself is reported for a human; everything else is added normally.
    const pkMissing = missing.filter((c) => c.pk);
    if (pkMissing.length) needsRebuild.push({ table, cols: pkMissing.map((c) => c.name) });

    const missingAddable = missing.filter((c) => !c.pk);
    if (!missingAddable.length) continue;
    missing.length = 0;
    missing.push(...missingAddable);

    sqliteLines.push('', `-- ${table}: ${missing.length} column(s) absent from a fresh migration`);
    pgLines.push('', `-- ${table}: ${missing.length} column(s) absent from a fresh migration`);
    for (const c of missing) {
      sqliteLines.push(`ALTER TABLE ${table} ADD COLUMN ${c.name} ${c.type}${defaultClause(c, 'sqlite')};`);
      pgLines.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}${defaultClause(c, 'pg')};`);
      added++;
    }
  }

  const header = (engine) => `-- Migration 076${engine === 'sqlite' ? ' (SQLite)' : ''}: restore columns lost to duplicate CREATE TABLE declarations
--
-- Several tables are declared twice with CREATE TABLE IF NOT EXISTS: once as an
-- early stub and once, later, in full. Migrations run in filename order, so on a
-- fresh database the stub wins and the full declaration silently does nothing.
-- society_assets is the clearest case -- a new deployment gets 7 columns with a
-- \`name\`, while the application queries \`asset_name\` against 23.
--
-- The development database was built before the migrations reached their current
-- order, so it has the full tables. That is precisely why this went unnoticed:
-- the only database anyone inspects is the one that happens to be correct, while
-- every genuinely new environment -- CI, staging, production -- would get stubs.
--
-- These statements were generated by diffing a freshly-migrated database against
-- the live one (scripts/generate-fresh-parity-migration.js), not written by hand,
-- so the column list is measured rather than remembered.
--
-- On the development database every statement here is a no-op.
${engine === 'sqlite'
  ? '-- SQLite has no ADD COLUMN IF NOT EXISTS; the runner tolerates "duplicate\n-- column name" so re-running stays safe.'
  : ''}
`;

  // The reverse direction. Some tables are richer on a fresh migration than in
  // the development database -- feature_flags is the clearest case, and the one
  // that proves neither side is authoritative. Adding both directions converges
  // on the union, which is the only target that cannot lose a column.
  let addedReverse = 0;
  for (const table of Object.keys(fresh).sort()) {
    if (!live[table]) continue;
    const have = new Set(live[table].map((c) => c.name));
    const missing = fresh[table].filter((c) => !have.has(c.name) && !c.pk);
    if (!missing.length) continue;

    sqliteLines.push('', `-- ${table}: ${missing.length} column(s) the development database is missing`);
    pgLines.push('', `-- ${table}: ${missing.length} column(s) the development database is missing`);
    for (const c of missing) {
      sqliteLines.push(`ALTER TABLE ${table} ADD COLUMN ${c.name} ${c.type}${defaultClause(c, 'sqlite')};`);
      pgLines.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}${defaultClause(c, 'pg')};`);
      addedReverse++;
    }
  }

  // Tables an ALTER cannot reach: either absent altogether, or present as a stub
  // whose primary key differs. Both are repaired from the live DDL.
  const liveDdl = readDdl(path.join(BACKEND, 'src', 'data', 'localsampark.db'));

  if (missingTables.length || needsRebuild.length) {
    sqliteLines.push('', '-- ' + '-'.repeat(74));
    sqliteLines.push('-- Tables that ALTER cannot repair');
    sqliteLines.push('-- ' + '-'.repeat(74));
  }

  for (const t of missingTables) {
    const ddl = (liveDdl[t] || '').replace(/CREATE TABLE\s+"?(\w+)"?/i, 'CREATE TABLE IF NOT EXISTS $1');
    if (!ddl) continue;
    sqliteLines.push('', `-- ${t}: no migration creates this table at all.`);
    sqliteLines.push(ddl.trim().replace(/;?\s*$/, ';'));
    pgLines.push('', `-- ${t}: absent from a fresh migration; review the PostgreSQL DDL by hand`);
    pgLines.push(`--   (the SQLite definition is in 076_fresh_migration_parity.sqlite.sql).`);
  }

  // Deliberately not generating a rebuild for these. A rebuild would impose one
  // database's shape on the other, and neither is authoritative: live's
  // feature_flags has `name` while a fresh migration has `feature_key`, and the
  // code queries feature_key -- so there, live is the stale one. Rebuilding
  // toward live would have broken the feature-flag routes on every new
  // deployment. These tables differ in their primary key, which ALTER cannot
  // reconcile, so they are reported for a human decision instead.
  for (const r of []) {
    const ddl = liveDdl[r.table];
    if (!ddl) continue;
    // The copy deliberately lists every column of the full table, not just the
    // ones the stub shares. On a database that already has the full table this
    // carries all rows across intact. On one that only has the stub the
    // statement fails with "no such column" and the runner continues -- which is
    // safe there precisely because the stub is the shape that has never been
    // written to. Listing only the shared columns would have been the dangerous
    // choice: it succeeds everywhere, and silently drops the other columns' data
    // on any database where the table was already correct.
    const allCols = live[r.table].map((c) => `"${c.name}"`).join(', ');
    sqliteLines.push('', `-- ${r.table}: the stub declares a different primary key (${r.cols.join(', ')}),`);
    sqliteLines.push(`-- which ALTER cannot introduce, so the table is rebuilt.`);
    sqliteLines.push(ddl.trim().replace(/CREATE TABLE\s+"?(\w+)"?/i, `CREATE TABLE "${r.table}__076"`).replace(/;?\s*$/, ';'));
    sqliteLines.push(`INSERT INTO "${r.table}__076" (${allCols}) SELECT ${allCols} FROM "${r.table}";`);
    sqliteLines.push(`DROP TABLE "${r.table}";`);
    sqliteLines.push(`ALTER TABLE "${r.table}__076" RENAME TO "${r.table}";`);
    pgLines.push('', `-- ${r.table}: primary key differs on a fresh migration; review by hand.`);
    void cols;
  }

  fs.writeFileSync(path.join(MIG, '076_fresh_migration_parity.sqlite.sql'), header('sqlite') + sqliteLines.join('\n') + '\n');
  fs.writeFileSync(path.join(MIG, '076_fresh_migration_parity.sql'), header('pg') + pgLines.join('\n') + '\n');

  console.log('\nFresh-vs-live parity migration');
  console.log('='.repeat(78));
  console.log(`ALTER statements, fresh was missing: ${added}`);
  console.log(`ALTER statements, live was missing:  ${addedReverse}`);
  console.log('Written: 076_fresh_migration_parity.sql / .sqlite.sql\n');

  if (missingTables.length) {
    console.log(`Tables absent from a fresh migration entirely (${missingTables.length}) — need CREATE, not ALTER:`);
    for (const t of missingTables) console.log(`  ${t}`);
    console.log('');
  }
  if (needsRebuild.length) {
    console.log(`Tables whose missing columns include a primary key (${needsRebuild.length}) — need a rebuild:`);
    for (const r of needsRebuild) console.log(`  ${r.table}: ${r.cols.join(', ')}`);
    console.log('');
  }
}

main();

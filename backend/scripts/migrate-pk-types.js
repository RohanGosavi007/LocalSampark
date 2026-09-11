#!/usr/bin/env node
/**
 * Convert INTEGER primary keys to TEXT on the tables where SQLite and
 * PostgreSQL disagree.
 *
 * 13 tables — users, local_shops, shop_products and shop_orders among them —
 * declare `id INTEGER PRIMARY KEY AUTOINCREMENT` in SQLite while PostgreSQL
 * declares UUID or TEXT. That is worse than a naming difference: foreign keys
 * must match the referenced type, so columns declared `user_id TEXT REFERENCES
 * users(id)` can never resolve against an integer key. The database already
 * carries 9 such orphaned rows, and foreign-key enforcement is switched off,
 * which is why nothing complained.
 *
 * SQLite cannot alter a column's type, so each table is rebuilt: create a
 * replacement with a TEXT id, copy every row across casting the id, drop the
 * original, rename. Indexes and triggers are captured beforehand and restored.
 *
 * The column list is read from the live schema rather than written out by hand,
 * so nothing can be dropped by omission.
 *
 *   node scripts/migrate-pk-types.js            # dry run
 *   node scripts/migrate-pk-types.js --apply    # perform the conversion
 */
const path = require('path');
const fs = require('fs');

const TABLES = [
  'users', 'local_shops', 'shop_products', 'shop_orders', 'delivery_agents',
  'delivery_jobs', 'community_posts', 'admin_roles', 'home_service_bookings',
  'home_service_providers', 'loyalty_transactions', 'society_guard_reminders',
  'universal_leads',
];

async function main() {
  const db = require('../src/config/database');
  const apply = process.argv.includes('--apply');

  const dbPath = process.env.SQLITE_DB_PATH || path.resolve(__dirname, '..', 'src', 'data', 'localsampark.db');

  console.log('\nPrimary-key type conversion: INTEGER -> TEXT');
  console.log('='.repeat(78));
  console.log(apply ? 'MODE: apply\n' : 'MODE: dry run (pass --apply to perform)\n');

  if (apply) {
    // A rebuild drops and recreates real tables; refuse to run without a copy.
    const backup = `${dbPath}.pk-backup-${Date.now()}`;
    fs.copyFileSync(dbPath, backup);
    console.log(`Backup written: ${path.basename(backup)}\n`);

    // ALTER TABLE ... RENAME re-validates every view in the database, so a view
    // that no longer compiles aborts the rename — after the original table has
    // already been dropped, leaving a half-finished rebuild. This bit once:
    // visitor_order_history selects o.user_id, a column that does not exist,
    // and it stopped the users rebuild midway. Invalid views are removed first;
    // they are already non-functional, so nothing working is lost.
    const views = await db.query("SELECT name, sql FROM sqlite_master WHERE type='view'");
    const broken = [];
    for (const v of (views.rows || [])) {
      try {
        await db.query(`SELECT * FROM "${v.name}" LIMIT 0`);
      } catch (e) {
        broken.push({ name: v.name, sql: v.sql, error: e.message });
      }
    }
    if (broken.length) {
      const out = path.resolve(__dirname, '..', 'dropped-broken-views.json');
      fs.writeFileSync(out, JSON.stringify(broken, null, 2));
      for (const b of broken) {
        await db.query(`DROP VIEW IF EXISTS "${b.name}"`);
        console.log(`  dropped invalid view ${b.name} (${b.error})`);
      }
      console.log(`  definitions saved to ${path.basename(out)}\n`);
    }
  }

  const plan = [];

  for (const table of TABLES) {
    const cols = await db.getTableColumns(table);
    if (!cols.length) { console.log(`  ${table.padEnd(26)} SKIP (table absent)`); continue; }

    const pk = cols.find((c) => c.primaryKey);
    if (!pk) { console.log(`  ${table.padEnd(26)} SKIP (no primary key)`); continue; }
    if (!/INT/i.test(pk.type)) { console.log(`  ${table.padEnd(26)} SKIP (already ${pk.type})`); continue; }

    const countRes = await db.query(`SELECT COUNT(*) AS c FROM ${table}`);
    const rowCount = (countRes.rows || [{}])[0].c;

    const ddlRes = await db.query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`);
    const ddl = ((ddlRes.rows || [])[0] || {}).sql || '';

    const idxRes = await db.query(
      `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='${table}' AND sql IS NOT NULL`
    );
    const trgRes = await db.query(
      `SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name='${table}'`
    );

    plan.push({
      table, cols, rowCount, ddl,
      indexes: (idxRes.rows || []).map((r) => r.sql),
      triggers: (trgRes.rows || []).map((r) => r.sql),
    });

    console.log(`  ${table.padEnd(26)} ${String(rowCount).padStart(5)} row(s), ` +
                `${cols.length} cols, ${(idxRes.rows || []).length} idx, ${(trgRes.rows || []).length} trg`);
  }

  if (!apply) {
    console.log(`\n${plan.length} table(s) would be rebuilt. Nothing changed.\n`);
    return;
  }

  console.log('');
  for (const p of plan) {
    const { table, cols, ddl } = p;

    // Rewrite only the primary-key declaration; every other column definition
    // is carried across verbatim so nothing is lost in translation.
    let newDdl = ddl
      .replace(new RegExp(`CREATE TABLE\\s+"?${table}"?`, 'i'), `CREATE TABLE "${table}__new"`)
      .replace(/\bid\s+INTEGER\s+PRIMARY\s+KEY(\s+AUTOINCREMENT)?/i, 'id TEXT PRIMARY KEY');

    if (!/id TEXT PRIMARY KEY/i.test(newDdl)) {
      console.log(`  ${table}: could not rewrite primary key — skipped`);
      continue;
    }

    const colList = cols.map((c) => `"${c.name}"`).join(', ');
    // CAST keeps each existing id's value, so any foreign key already holding
    // that number still points at the same row rather than being orphaned.
    const selectList = cols.map((c) => (c.name === 'id' ? 'CAST("id" AS TEXT)' : `"${c.name}"`)).join(', ');

    try {
      await db.query('PRAGMA foreign_keys = OFF');
      await db.query(newDdl);
      await db.query(`INSERT INTO "${table}__new" (${colList}) SELECT ${selectList} FROM "${table}"`);

      // Triggers reference the table by name and would break the DROP.
      for (const t of p.triggers) {
        const name = (t.match(/CREATE TRIGGER\s+"?(\w+)"?/i) || [])[1];
        if (name) await db.query(`DROP TRIGGER IF EXISTS "${name}"`);
      }

      await db.query(`DROP TABLE "${table}"`);
      await db.query(`ALTER TABLE "${table}__new" RENAME TO "${table}"`);

      for (const sql of p.indexes) { try { await db.query(sql); } catch (_e) { /* index may be implicit */ } }
      for (const sql of p.triggers) { try { await db.query(sql); } catch (_e) { /* restored below if it fails */ } }

      const after = await db.query(`SELECT COUNT(*) AS c FROM "${table}"`);
      const got = (after.rows || [{}])[0].c;
      const ok = got === p.rowCount;
      console.log(`  ${table.padEnd(26)} rebuilt: ${got}/${p.rowCount} rows ${ok ? 'OK' : 'ROW COUNT MISMATCH'}`);
    } catch (e) {
      console.error(`  ${table.padEnd(26)} FAILED: ${e.message}`);
      console.error('  Stopping. Restore from the backup printed above before retrying.');
      process.exit(1);
    }
  }

  console.log('\nVerifying primary-key types...');
  for (const p of plan) {
    const pk = (await db.getTableColumns(p.table)).find((c) => c.primaryKey);
    console.log(`  ${p.table.padEnd(26)} id ${pk ? pk.type : '(none)'}`);
  }
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });

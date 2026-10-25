/**
 * 109 (SQLite only): let admin_audit_log.ip_address default to ''.
 *
 * init.sqlite.sql declares `ip_address TEXT NOT NULL` with no default. The
 * Postgres definition that actually applies on a fresh database (077) declares
 * `ip_address TEXT DEFAULT ''`, and the application is written against that
 * one: 28 of the 29 statements that insert into this table name
 * (id, admin_id, action, target_type, target_id, details) and nothing else.
 *
 * On SQLite every one of those fails with "NOT NULL constraint failed:
 * admin_audit_log.ip_address". The audit write usually follows the change it
 * records, inside the same try block, so the admin sees a 500 for an action
 * that has in fact already been applied — and applies it a second time on
 * retry — while the audit trail records neither.
 *
 * Written as JavaScript for the same reason as 098: SQLite cannot relax a
 * constraint in place, so the table is rebuilt, and the column list is read
 * from the live schema rather than transcribed, so a column this file has never
 * heard of is carried across instead of dropped.
 *
 * Idempotent: once ip_address is nullable the table is left alone.
 */

const TABLE = 'admin_audit_log';

/** Quotes an identifier for SQLite. */
function q(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

async function run() {
  const db = require('../config/database');

  if (process.env.USE_SQLITE !== 'true') {
    return { skipped: 'not SQLite — 109_admin_audit_log_ip_default.sql covers Postgres' };
  }

  const info = await db.queryMany(`PRAGMA table_info(${q(TABLE)})`);
  if (!info || info.length === 0) return { results: [{ table: TABLE, skipped: 'missing' }] };

  const ip = info.find((c) => c.name === 'ip_address');
  if (!ip) return { results: [{ table: TABLE, skipped: 'no ip_address column' }] };
  if (!ip.notnull) return { results: [{ table: TABLE, skipped: 'already nullable' }] };

  const indexes = await db.queryMany(
    `SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = '${TABLE}' AND sql IS NOT NULL`
  );
  const foreignKeys = await db.queryMany(`PRAGMA foreign_key_list(${q(TABLE)})`);

  const columnDefs = info.map((col) => {
    let def = `${q(col.name)} ${col.type || 'TEXT'}`;
    if (col.pk) def += ' PRIMARY KEY';
    if (col.name === 'ip_address') return `${def} DEFAULT ''`;
    if (col.notnull && !col.pk) def += ' NOT NULL';
    if (col.dflt_value !== null && col.dflt_value !== undefined) def += ` DEFAULT ${col.dflt_value}`;
    return def;
  });
  for (const fk of foreignKeys || []) {
    let def = `FOREIGN KEY (${q(fk.from)}) REFERENCES ${q(fk.table)}(${q(fk.to)})`;
    if (fk.on_delete && fk.on_delete !== 'NO ACTION') def += ` ON DELETE ${fk.on_delete}`;
    columnDefs.push(def);
  }

  const tmp = `${TABLE}__rebuild_109`;
  const columnList = info.map((c) => q(c.name)).join(', ');

  // Foreign keys off for the swap, as in 098: dropping a referenced table
  // trips constraint checks mid-rebuild even though the end state is sound.
  await db.query('PRAGMA foreign_keys = OFF');
  try {
    await db.query(`DROP TABLE IF EXISTS ${q(tmp)}`);
    await db.query(`CREATE TABLE ${q(tmp)} (\n  ${columnDefs.join(',\n  ')}\n)`);
    await db.query(`INSERT INTO ${q(tmp)} (${columnList}) SELECT ${columnList} FROM ${q(TABLE)}`);

    // The copy is verified before the original is dropped. This runner has no
    // transaction around a JavaScript migration, so a short copy followed by
    // DROP would lose audit history with nothing to roll back to.
    const before = await db.queryMany(`SELECT COUNT(*) AS n FROM ${q(TABLE)}`);
    const after = await db.queryMany(`SELECT COUNT(*) AS n FROM ${q(tmp)}`);
    if (Number(before[0].n) !== Number(after[0].n)) {
      await db.query(`DROP TABLE IF EXISTS ${q(tmp)}`);
      throw new Error(`copy mismatch: ${before[0].n} row(s) in ${TABLE}, ${after[0].n} copied`);
    }

    await db.query(`DROP TABLE ${q(TABLE)}`);
    await db.query(`ALTER TABLE ${q(tmp)} RENAME TO ${q(TABLE)}`);

    for (const idx of indexes || []) {
      try {
        await db.query(idx.sql);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`   ⚠️ could not recreate index on ${TABLE}: ${err.message}`);
      }
    }
  } finally {
    await db.query('PRAGMA foreign_keys = ON');
  }

  return { results: [{ table: TABLE, rebuilt: true, columns: info.length }] };
}

if (require.main === module) {
  process.env.USE_SQLITE = process.env.USE_SQLITE || 'true';
  run()
    .then((out) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(out, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('❌ 109 failed: ' + err.message);
      process.exit(1);
    });
}

module.exports = { run };

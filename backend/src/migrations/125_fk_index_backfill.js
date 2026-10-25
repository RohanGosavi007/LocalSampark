/**
 * 125 (SQLite only): index every foreign-key column that has no index.
 * 125_fk_index_backfill.sql is the PostgreSQL half and carries the reasoning.
 *
 * This half reads the live schema instead of carrying a list, for two reasons.
 *
 * It has to run after the JS migrations that rebuild tables (098, 109, 114,
 * 116, 120). A rebuild creates a new table and copies the rows over, so an
 * index made by a .sql file earlier in the run is gone from every table those
 * touched; a first version of this as a .sql file left 21 foreign keys
 * unindexed on a database built from scratch, while looking complete on one
 * that had been migrated twice. The JS migrations run last, in number order.
 *
 * And a list goes stale: a table added by a later migration has foreign keys
 * this would not know about. Reading PRAGMA foreign_key_list on every run
 * indexes those too.
 *
 * It also restates five indexes that 026, 064, 065 and 073 declare but that do
 * not exist on a database built from scratch: each names a column a later
 * migration adds, so the statement failed ("no such column") when it ran and
 * was skipped.
 *
 * Idempotent: CREATE INDEX IF NOT EXISTS, and a column that already leads an
 * index (or is the primary key) is skipped.
 */

const { q } = require('./lib/sqliteRebuild');

const RESTATED = [
  ['idx_doctors_geohash', 'medical_doctors', 'geohash'],
  ['idx_marketplace_listings_geo', 'marketplace_listings', 'latitude, longitude'],
  ['idx_file_uploads_module', 'file_uploads', 'module, entity_id'],
  ['idx_file_uploads_user', 'file_uploads', 'user_id'],
  ['idx_hsb_customer', 'home_service_bookings', 'customer_id, status'],
];

// Scratch tables left behind by an interrupted rebuild; not part of the schema.
const SCRATCH = /(_rebuilt|__rebuild_\w+)$/;

async function run() {
  const db = require('../config/database');
  if (process.env.USE_SQLITE !== 'true') {
    return { skipped: 'not SQLite — 125_fk_index_backfill.sql covers PostgreSQL' };
  }

  const tables = (await db.queryMany(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  )).map((t) => t.name).filter((n) => !SCRATCH.test(n));

  let created = 0;
  const failed = [];
  const make = async (name, table, columns) => {
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${q(table)} (${columns})`);
      created += 1;
    } catch (err) {
      failed.push(`${name}: ${err.message}`);
    }
  };

  for (const table of tables) {
    const fks = await db.queryMany(`PRAGMA foreign_key_list(${q(table)})`);
    if (!fks || fks.length === 0) continue;

    const leading = new Set();
    for (const idx of await db.queryMany(`PRAGMA index_list(${q(table)})`)) {
      const first = (await db.queryMany(`PRAGMA index_info(${q(idx.name)})`))[0];
      if (first) leading.add(first.name);
    }
    const pk = (await db.queryMany(`PRAGMA table_info(${q(table)})`)).find((c) => c.pk);

    for (const fk of new Set(fks.map((f) => f.from))) {
      if (leading.has(fk) || (pk && pk.name === fk)) continue;
      const name = `idx_${table}_${fk}`;
      if (name.length > 63) { failed.push(`${name}: identifier too long`); continue; }
      await make(name, table, q(fk));
    }
  }

  for (const [name, table, columns] of RESTATED) {
    if (tables.includes(table)) await make(name, table, columns);
  }

  // An index that cannot be made is not worth failing a deploy over; it is
  // reported, and the next run tries again.
  return { created, failed };
}

module.exports = { run };

/**
 * 118 (SQLite only): orders.delivery_address and orders.delivery_coordinate
 * become nullable, as they already are on PostgreSQL.
 *
 * 055_orders_schema_reconciliation.sql dropped NOT NULL from both on
 * PostgreSQL — a pickup order has no delivery address, and a customer who has
 * not shared a location has no coordinate. The SQLite schema kept the
 * constraint, so the checkout wrote '' into both to get past it. On PostgreSQL
 * delivery_coordinate is GEOGRAPHY, where '' is not a value at all: the same
 * INSERT that passed every test here would have been rejected there.
 *
 * With the constraint gone on both engines, the checkout writes a real point
 * or NULL. No PostgreSQL counterpart is needed; 055 is it.
 *
 * Idempotent: skipped once neither column is NOT NULL.
 */

const { q, swapTable, createSqlOf, withForeignKeysOff } = require('./lib/sqliteRebuild');
const { relaxedDefinition } = require('./114_relax_unwritten_not_null');

const TABLE = 'orders';
const COLUMNS = ['delivery_address', 'delivery_coordinate'];

async function run() {
  const db = require('../config/database');

  if (process.env.USE_SQLITE !== 'true') {
    return { skipped: 'not SQLite — 055_orders_schema_reconciliation.sql already did this on Postgres' };
  }

  return withForeignKeysOff(db, [TABLE], async () => {
    const info = await db.queryMany(`PRAGMA table_info(${q(TABLE)})`);
    if (!info || info.length === 0) return { table: TABLE, skipped: 'missing' };

    const stillRequired = COLUMNS.filter((name) => {
      const col = info.find((c) => c.name.toLowerCase() === name);
      return col && col.notnull;
    });
    if (stillRequired.length === 0) return { table: TABLE, skipped: 'already nullable' };

    const createSql = await createSqlOf(db, TABLE);
    const tmp = `${TABLE}__rebuild_118`;
    const newSql = createSql ? relaxedDefinition(createSql, TABLE, tmp, stillRequired) : null;
    if (!newSql) throw new Error(`could not rewrite the definition of ${TABLE}`);

    const carried = await swapTable(db, TABLE, tmp, newSql);
    return { table: TABLE, rebuilt: true, relaxed: stillRequired, ...carried };
  });
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
      console.error('❌ 118 failed: ' + err.message);
      process.exit(1);
    });
}

module.exports = { run };

/**
 * 134 (SQLite only): restore the trust_reviews.order_id foreign key.
 *
 * 133_after_order_experience.sql declares
 *   order_id UUID REFERENCES orders(id) ON DELETE SET NULL
 * but its SQLite twin added a bare `order_id TEXT`, so the two engines disagree
 * (postgresSchemaContract.test.js, B3). SQLite cannot attach a constraint to
 * an existing column, so the table is rebuilt from its live definition with
 * the shared helper, the same way 116 does it.
 *
 * Rows whose order_id points at an order that no longer exists are set to NULL
 * first, which is exactly what ON DELETE SET NULL would have done.
 *
 * Idempotent: a table that already has a foreign key on order_id is skipped.
 */

const { q, rewriteDefinition, swapTable, createSqlOf, withForeignKeysOff } = require('./lib/sqliteRebuild');

const TABLE = 'trust_reviews';
const COLUMN = 'order_id';
const REFERENCE = 'REFERENCES orders(id) ON DELETE SET NULL';

async function rebuild(db) {
  const info = await db.queryMany(`PRAGMA table_info(${q(TABLE)})`);
  if (!info || info.length === 0) return { table: TABLE, skipped: 'missing' };
  if (!info.some((c) => c.name === COLUMN)) return { table: TABLE, skipped: `no ${COLUMN} column` };

  const fks = (await db.queryMany(`PRAGMA foreign_key_list(${q(TABLE)})`)) || [];
  if (fks.some((f) => String(f.from).toLowerCase() === COLUMN)) {
    return { table: TABLE, skipped: 'foreign key already present' };
  }

  await db.query(
    `UPDATE ${q(TABLE)} SET ${q(COLUMN)} = NULL
      WHERE ${q(COLUMN)} IS NOT NULL AND ${q(COLUMN)} NOT IN (SELECT id FROM orders)`
  );

  const createSql = await createSqlOf(db, TABLE);
  const tmp = `${TABLE}__rebuild_134`;
  let changed = false;
  const newSql = createSql
    ? rewriteDefinition(createSql, TABLE, tmp, (definition, name) => {
        if (name !== COLUMN || /REFERENCES/i.test(definition)) return definition;
        changed = true;
        return `${definition.trimEnd()} ${REFERENCE}`;
      })
    : null;
  if (!newSql || !changed) throw new Error(`could not rewrite ${TABLE}.${COLUMN}`);

  const carried = await swapTable(db, TABLE, tmp, newSql);
  return { table: TABLE, rebuilt: true, column: COLUMN, ...carried };
}

async function run() {
  const db = require('../config/database');

  if (process.env.USE_SQLITE !== 'true') {
    return { skipped: 'not SQLite — 133_after_order_experience.sql already declares the key on Postgres' };
  }

  const result = await withForeignKeysOff(db, [TABLE], () => rebuild(db));
  return { results: [result] };
}

module.exports = { run };

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
      console.error('❌ 134 failed: ' + err.message);
      process.exit(1);
    });
}

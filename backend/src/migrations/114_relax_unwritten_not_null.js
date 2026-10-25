/**
 * 114 (SQLite only): drop NOT NULL from columns the application has no value for.
 *
 * The reasoning for each column is in 114_relax_unwritten_not_null.sql, which
 * does the same thing on PostgreSQL with ALTER COLUMN ... DROP NOT NULL. SQLite
 * has no such statement, so each table is rebuilt; lib/sqliteRebuild.js
 * explains how, and why it edits the table's own definition rather than
 * reconstructing one.
 *
 * One table here makes the care worth it: marketplace_listings carries the
 * triggers that keep its R-tree index in step, and a rebuild that lost them
 * would leave proximity search quietly returning whatever was indexed on the
 * day of the migration.
 *
 * Idempotent: a table with none of its listed columns still NOT NULL is skipped.
 */

const { q, rewriteDefinition, swapTable, createSqlOf, withForeignKeysOff } = require('./lib/sqliteRebuild');

const TARGETS = {
  carpool_rides: ['from_coordinate', 'to_coordinate'],
  marketplace_listings: ['coordinate'],
  franchise_payouts: ['period_start', 'period_end', 'total_territory_revenue'],
};

/**
 * Returns the CREATE TABLE statement with NOT NULL removed from `columns` and
 * the table renamed to `newName`, or null if any column could not be found.
 */
function relaxedDefinition(createSql, table, newName, columns) {
  const wanted = new Set(columns.map((c) => c.toLowerCase()));
  const seen = new Set();
  const sql = rewriteDefinition(createSql, table, newName, (definition, column) => {
    if (!column || !wanted.has(column)) return definition;
    seen.add(column);
    return definition.replace(/\s+NOT\s+NULL\b/i, '');
  });
  return sql && seen.size === wanted.size ? sql : null;
}

async function rebuild(db, table, columns) {
  const info = await db.queryMany(`PRAGMA table_info(${q(table)})`);
  if (!info || info.length === 0) return { table, skipped: 'missing' };

  const stillRequired = columns.filter((name) => {
    const col = info.find((c) => c.name.toLowerCase() === name);
    return col && col.notnull;
  });
  if (stillRequired.length === 0) return { table, skipped: 'already nullable' };

  const createSql = await createSqlOf(db, table);
  const tmp = `${table}__rebuild_114`;
  const newSql = createSql ? relaxedDefinition(createSql, table, tmp, stillRequired) : null;
  if (!newSql) throw new Error(`could not rewrite the definition of ${table}`);

  const carried = await swapTable(db, table, tmp, newSql);
  return { table, rebuilt: true, relaxed: stillRequired, ...carried };
}

async function run() {
  const db = require('../config/database');

  if (process.env.USE_SQLITE !== 'true') {
    return { skipped: 'not SQLite — 114_relax_unwritten_not_null.sql covers Postgres' };
  }

  const results = await withForeignKeysOff(db, Object.keys(TARGETS), async () => {
    const out = [];
    for (const [table, columns] of Object.entries(TARGETS)) {
      try {
        out.push(await rebuild(db, table, columns));
      } catch (err) {
        out.push({ table, error: err.message });
      }
    }
    return out;
  });

  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    throw new Error(failed.map((r) => `${r.table}: ${r.error}`).join('; '));
  }

  return { results };
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
      console.error('❌ 114 failed: ' + err.message);
      process.exit(1);
    });
}

module.exports = { run, relaxedDefinition };

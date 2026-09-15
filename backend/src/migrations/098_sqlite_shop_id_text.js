/**
 * 098 (SQLite only): retype shop_id to TEXT and restore ON DELETE CASCADE.
 *
 * 054_universal_shop_id_uuid.sql did this for Postgres and has no SQLite
 * counterpart, so on the path local development and CI actually run, five
 * tables still declare `shop_id INTEGER` with a foreign key to local_shops,
 * whose primary key is a TEXT uuid:
 *
 *   shop_products (318 rows), shop_orders, shop_analytics_snapshots,
 *   universal_catalog_items, universal_leads
 *
 * SQLite's type affinity is what hides this. A uuid cannot be converted to an
 * integer, so it is stored as TEXT regardless of the declared type and every
 * query appears to work. What does not work is the constraint: the declared
 * types disagree, and shop_products lost the ON DELETE CASCADE that both
 * init.sql and init.sqlite.sql specify. That is why re-seeding failed —
 * `DELETE FROM local_shops` raised a foreign-key error while products existed —
 * and it means offboarding a merchant in any SQLite-backed environment fails
 * the same way.
 *
 * Written as JavaScript rather than SQL because SQLite cannot alter a column's
 * type or constraints: the table has to be rebuilt, and shop_products carries
 * roughly thirty columns accumulated across a dozen migrations. Transcribing
 * that list by hand would silently drop any column an environment has that this
 * file does not know about. Reading the live schema and regenerating from it
 * cannot.
 *
 * Idempotent: a table whose shop_id is already TEXT is skipped.
 */

const TABLES = [
  'shop_products',
  'shop_orders',
  'shop_analytics_snapshots',
  'universal_catalog_items',
  'universal_leads',
];

/** Quotes an identifier for SQLite. */
function q(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

/**
 * Rebuilds one table with shop_id as TEXT and a cascading foreign key.
 *
 * Column definitions are reconstructed from PRAGMA table_info, which reports
 * the declared type, NOT NULL and default for every column — enough to
 * reproduce the table faithfully. Primary keys are carried over; other indexes
 * are recreated from sqlite_master afterwards.
 */
async function rebuildTable(db, table) {
  const info = await db.queryMany(`PRAGMA table_info(${q(table)})`);
  if (!info || info.length === 0) return { table, skipped: 'missing' };

  const shopIdCol = info.find((c) => c.name === 'shop_id');
  if (!shopIdCol) return { table, skipped: 'no shop_id column' };
  if (!/INT/i.test(shopIdCol.type || '')) return { table, skipped: 'already TEXT' };

  // Index definitions, so rebuilding does not quietly drop them. Auto-indexes
  // backing UNIQUE/PRIMARY KEY have no sql and are recreated by the table
  // definition itself.
  const indexes = await db.queryMany(
    `SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ${q(table)} AND sql IS NOT NULL`
  );

  const columnDefs = info.map((col) => {
    const type = col.name === 'shop_id' ? 'TEXT' : (col.type || 'TEXT');
    let def = `${q(col.name)} ${type}`;
    if (col.pk) def += ' PRIMARY KEY';
    if (col.notnull && !col.pk) def += ' NOT NULL';
    if (col.dflt_value !== null && col.dflt_value !== undefined) def += ` DEFAULT ${col.dflt_value}`;
    return def;
  });

  // The point of the exercise: a cascading reference to the real shops table.
  columnDefs.push('FOREIGN KEY (shop_id) REFERENCES local_shops(id) ON DELETE CASCADE');

  const tmp = `${table}__rebuild_098`;
  const columnList = info.map((c) => q(c.name)).join(', ');

  // Views are dropped before the swap and recreated after.
  //
  // SQLite validates every view in the schema when a table is renamed, so
  // renaming the rebuilt copy into place fails if any view still references a
  // table this rebuild has already dropped — `error in view
  // visitor_order_history: no such table: main.shop_orders`. The failure lands
  // between the DROP and the RENAME, which strands the table: the original is
  // gone and the replacement is still under its temporary name. That is
  // precisely what happened on the first run of this migration, and it also
  // poisoned every subsequent statement in the same run.
  const views = await db.queryMany(
    "SELECT name, sql FROM sqlite_master WHERE type = 'view' AND sql IS NOT NULL"
  );
  const dependentViews = (views || []).filter(
    // Double-escaped: inside a template literal a single backslash-b is a
    // backspace character, not a word boundary, so the single-escaped form
    // matched nothing and every dependent view was missed.
    (v) => v.sql && new RegExp('\\b' + table + '\\b', 'i').test(v.sql)
  );
  for (const view of dependentViews) {
    await db.query(`DROP VIEW IF EXISTS ${q(view.name)}`);
  }

  await db.query(`DROP TABLE IF EXISTS ${q(tmp)}`);
  await db.query(`CREATE TABLE ${q(tmp)} (\n  ${columnDefs.join(',\n  ')}\n)`);
  // CAST so the stored value matches the newly declared affinity rather than
  // relying on SQLite having left it as TEXT.
  await db.query(
    `INSERT INTO ${q(tmp)} (${columnList})
     SELECT ${info.map((c) => (c.name === 'shop_id' ? 'CAST(shop_id AS TEXT)' : q(c.name))).join(', ')}
       FROM ${q(table)}`
  );
  await db.query(`DROP TABLE ${q(table)}`);
  try {
    await db.query(`ALTER TABLE ${q(tmp)} RENAME TO ${q(table)}`);
  } catch {
    // Last resort. legacy_alter_table skips the view-validation pass entirely,
    // so a view this scan failed to spot cannot leave the table stranded with
    // the original dropped and the replacement under a temporary name.
    await db.query('PRAGMA legacy_alter_table = ON');
    try {
      await db.query(`ALTER TABLE ${q(tmp)} RENAME TO ${q(table)}`);
    } finally {
      await db.query('PRAGMA legacy_alter_table = OFF');
    }
  }

  for (const view of dependentViews) {
    try {
      await db.query(view.sql);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`   ⚠️ could not recreate view ${view.name}: ${err.message}`);
    }
  }

  for (const idx of indexes || []) {
    if (!idx.sql) continue;
    try {
      await db.query(idx.sql);
    } catch (err) {
      // An index that cannot be recreated is worth reporting but must not abort
      // a rebuild that has already swapped the table.
      // eslint-disable-next-line no-console
      console.warn(`   ⚠️ could not recreate index on ${table}: ${err.message}`);
    }
  }

  return { table, rebuilt: true, columns: info.length };
}

async function run() {
  const db = require('../config/database');

  if (process.env.USE_SQLITE !== 'true') {
    return { skipped: 'not SQLite — 054 covers the Postgres schema' };
  }

  const results = [];

  // Foreign keys are disabled for the swap: dropping and renaming a table with
  // live references trips constraint checks mid-rebuild even though the final
  // state is consistent. The check afterwards is what proves it.
  await db.query('PRAGMA foreign_keys = OFF');
  try {
    for (const table of TABLES) {
      try {
        results.push(await rebuildTable(db, table));
      } catch (err) {
        results.push({ table, error: err.message });
      }
    }

    const violations = await db.queryMany('PRAGMA foreign_key_check');
    if ((violations || []).length > 0) {
      throw new Error(
        `Rebuild left ${violations.length} dangling foreign-key reference(s); first: ${JSON.stringify(violations[0])}`
      );
    }
  } finally {
    await db.query('PRAGMA foreign_keys = ON');
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
      console.error('❌ 098 failed: ' + err.message);
      process.exit(1);
    });
}

module.exports = { run, rebuildTable, TABLES };

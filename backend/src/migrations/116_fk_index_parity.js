/**
 * 116 (SQLite only): three foreign keys whose ON DELETE action disagreed.
 *
 * The same relationship did different things on the two engines when the
 * parent row went away:
 *
 *   loyalty_wallets.user_id      SQLite: refuse    PostgreSQL: CASCADE
 *   delivery_riders.user_id      SQLite: refuse    PostgreSQL: SET NULL
 *   admin_ip_allowlist.added_by  SQLite: refuse    PostgreSQL: SET NULL
 *
 * "Refuse" is what SQLite does when no action is named. Nothing in the running
 * application deletes a user today — account erasure anonymises the row
 * instead — so this has not yet bitten a request. It bites whoever deletes one
 * by hand, any test that cleans up after itself, and the first feature that
 * does: the delete fails on SQLite with a foreign-key error and succeeds on
 * PostgreSQL, so it could only be tested on the engine where it does not work.
 *
 * PostgreSQL's actions are the considered ones — a wallet has no meaning
 * without its owner, while a rider record and an audit-relevant allowlist entry
 * should outlive the account that created them — so SQLite adopts them. The
 * PostgreSQL half of 116 (.sql) adds what that side was missing.
 *
 * SQLite cannot change a constraint in place, so each table is rebuilt; see
 * lib/sqliteRebuild.js. Idempotent: a key that already has the action is left.
 */

const { q, rewriteDefinition, swapTable, createSqlOf, withForeignKeysOff } = require('./lib/sqliteRebuild');

const TARGETS = [
  { table: 'loyalty_wallets', column: 'user_id', action: 'CASCADE' },
  { table: 'delivery_riders', column: 'user_id', action: 'SET NULL' },
  { table: 'admin_ip_allowlist', column: 'added_by', action: 'SET NULL' },
];

/**
 * The CREATE TABLE statement with `column`'s foreign key given `action`,
 * renamed to `newName`; null if the key is not declared where it can be found.
 */
function withDeleteAction(createSql, table, newName, column, action) {
  let changed = false;
  const setAction = (definition) => {
    const references = /(REFERENCES\s+["`[]?\w+["`\]]?\s*\([^)]*\))(\s+ON\s+DELETE\s+(?:CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?/i;
    if (!references.test(definition)) return definition;
    changed = true;
    return definition.replace(references, `$1 ON DELETE ${action}`);
  };

  const sql = rewriteDefinition(createSql, table, newName, (definition, name) => {
    if (name === column) return setAction(definition);
    // A table-level FOREIGN KEY (column) REFERENCES …
    if (name === null && new RegExp(`FOREIGN\\s+KEY\\s*\\(\\s*["\`\\[]?${column}["\`\\]]?\\s*\\)`, 'i').test(definition)) {
      return setAction(definition);
    }
    return definition;
  });
  return sql && changed ? sql : null;
}

async function rebuild(db, { table, column, action }) {
  const fks = await db.queryMany(`PRAGMA foreign_key_list(${q(table)})`);
  if (!fks || fks.length === 0) {
    const info = await db.queryMany(`PRAGMA table_info(${q(table)})`);
    return { table, skipped: info && info.length ? 'no foreign key on this table' : 'missing' };
  }
  const fk = fks.find((f) => f.from.toLowerCase() === column);
  if (!fk) return { table, skipped: `no foreign key on ${column}` };
  if (String(fk.on_delete).toUpperCase() === action) return { table, skipped: `already ${action}` };

  const createSql = await createSqlOf(db, table);
  const tmp = `${table}__rebuild_116`;
  const newSql = createSql ? withDeleteAction(createSql, table, tmp, column, action) : null;
  if (!newSql) throw new Error(`could not rewrite the foreign key on ${table}.${column}`);

  const carried = await swapTable(db, table, tmp, newSql);
  return { table, rebuilt: true, column, action, ...carried };
}

async function run() {
  const db = require('../config/database');

  if (process.env.USE_SQLITE !== 'true') {
    return { skipped: 'not SQLite — 116_fk_index_parity.sql covers Postgres' };
  }

  const results = await withForeignKeysOff(db, TARGETS.map((t) => t.table), async () => {
    const out = [];
    for (const target of TARGETS) {
      try {
        out.push(await rebuild(db, target));
      } catch (err) {
        out.push({ table: target.table, error: err.message });
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
      console.error('❌ 116 failed: ' + err.message);
      process.exit(1);
    });
}

module.exports = { run, withDeleteAction };

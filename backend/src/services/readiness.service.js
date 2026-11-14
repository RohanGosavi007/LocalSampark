/**
 * Whether the database schema is current (P8, the /ready probe).
 *
 * /ready used to count three tables (users, orders, local_shops) and call the
 * schema "ready" if they existed: a server whose database was missing the last
 * ten migrations reported ready and then failed on the first request that
 * touched a new column. On PostgreSQL the migration runner records every file
 * it applies in schema_migrations, so readiness now compares that list with the
 * migration files this build ships.
 *
 *   current      every migration this build ships has been applied
 *   pending      some have not: the instance is NOT ready (names are listed)
 *   untracked    PostgreSQL without a schema_migrations table (the database was
 *                set up some other way): reported, but not treated as a failure,
 *                so a database built by hand is not taken out of rotation
 *   not_tracked  SQLite (development and test): migrations are idempotent
 *                re-runs and nothing is recorded
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

/** The numbered PostgreSQL migration files this build ships, in order. */
function shippedMigrations(dir = MIGRATIONS_DIR) {
  return fs.readdirSync(dir).filter((f) => /^\d{3}_.*\.sql$/.test(f) && !f.includes('.sqlite.')).sort();
}

/**
 * @param {(sql: string) => Promise<any>} query
 * @returns {Promise<{ state: 'current'|'pending'|'untracked'|'not_tracked', pending: string[], ready: boolean }>}
 */
async function migrationStatus(query, { isSqlite, dir = MIGRATIONS_DIR } = {}) {
  if (isSqlite) return { state: 'not_tracked', pending: [], ready: true };

  let applied;
  try {
    const res = await query('SELECT filename FROM schema_migrations');
    applied = new Set((res.rows || res).map((r) => r.filename));
  } catch {
    return { state: 'untracked', pending: [], ready: true };
  }
  const pending = shippedMigrations(dir).filter((f) => !applied.has(f));
  return pending.length ? { state: 'pending', pending, ready: false } : { state: 'current', pending: [], ready: true };
}

module.exports = { migrationStatus, shippedMigrations };

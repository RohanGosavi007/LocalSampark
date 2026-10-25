/**
 * 120 (SQLite only): job applications and referrals can be stored, and a
 * posting does not need a salary or an address. 120_jobs_application_parent.sql
 * is the same change for PostgreSQL and carries the reasoning; in short:
 *
 *   - job_applications.job_id carried a foreign key to job_vacancies, the
 *     table from the first version of the jobs feature. The recruitment module
 *     the apps use stores postings in local_job_postings, so every application
 *     named a job_id with no row in job_vacancies and was rejected by the
 *     constraint. Applying for a job has not worked since foreign keys were
 *     switched on.
 *
 *   - job_referrals.job_id pointed at job_postings, a third jobs table that
 *     nothing writes to. A referral could only be created for a job that
 *     cannot exist.
 *
 *     Both columns hold the id of a posting in local_job_postings (and, for
 *     applications, sometimes a job_vacancies row), so neither has a single
 *     parent to point at and the constraints are dropped.
 *
 *   - local_job_postings.salary_range and .address were NOT NULL with no
 *     default while POST /jobs/postings requires only a title and a category
 *     and writes NULL for the rest.
 *
 * SQLite cannot drop a constraint or a NOT NULL in place, so each table is
 * rebuilt from its own definition (see lib/sqliteRebuild.js).
 *
 * Idempotent: a table that already has the wanted shape is skipped.
 */

const { q, rewriteDefinition, swapTable, createSqlOf, withForeignKeysOff } = require('./lib/sqliteRebuild');
const { relaxedDefinition } = require('./114_relax_unwritten_not_null');

const PARENTLESS = ['job_applications', 'job_referrals'];
const POSTING_COLUMNS = ['salary_range', 'address'];

// Marks a table-level constraint for removal; rewriteDefinition keeps whatever
// its callback returns, so the clause is replaced and then cut out with its comma.
const DROP = '/*__drop_120__*/';

const REFERENCES_CLAUSE = /\s+REFERENCES\s+["`]?\w+["`]?\s*\([^)]*\)(\s+ON\s+(DELETE|UPDATE)\s+(SET\s+NULL|SET\s+DEFAULT|NO\s+ACTION|CASCADE|RESTRICT))*/i;

/** The CREATE TABLE text with every foreign key on job_id removed, or null. */
function withoutJobIdParent(createSql, table, newName) {
  let found = false;
  const sql = rewriteDefinition(createSql, table, newName, (definition, column) => {
    if (column === 'job_id') {
      const stripped = definition.replace(REFERENCES_CLAUSE, '');
      if (stripped !== definition) found = true;
      return stripped;
    }
    if (!column && /FOREIGN\s+KEY\s*\(\s*["`]?job_id["`]?\s*\)/i.test(definition)) {
      found = true;
      return DROP;
    }
    return definition;
  });
  if (!sql || !found) return null;
  // The marker stands where a whole definition was; take it out with one comma.
  const marker = DROP.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return sql.replace(new RegExp(`,\\s*${marker}`, 'g'), '').replace(new RegExp(`${marker}\\s*,`, 'g'), '');
}

async function dropJobParent(db, table) {
  const info = await db.queryMany(`PRAGMA table_info(${q(table)})`);
  if (!info || info.length === 0) return { table, skipped: 'missing' };

  const fks = await db.queryMany(`PRAGMA foreign_key_list(${q(table)})`);
  if (!(fks || []).some((fk) => fk.from === 'job_id')) return { table, skipped: 'job_id has no foreign key' };

  const createSql = await createSqlOf(db, table);
  const tmp = `${table}__rebuild_120`;
  const newSql = createSql ? withoutJobIdParent(createSql, table, tmp) : null;
  if (!newSql) throw new Error(`could not remove the job_id foreign key from ${table}`);

  const carried = await swapTable(db, table, tmp, newSql);
  return { table, rebuilt: true, dropped: 'job_id foreign key', ...carried };
}

async function relaxPostings(db) {
  const table = 'local_job_postings';
  const info = await db.queryMany(`PRAGMA table_info(${q(table)})`);
  if (!info || info.length === 0) return { table, skipped: 'missing' };

  const stillRequired = POSTING_COLUMNS.filter((name) => {
    const col = info.find((c) => c.name.toLowerCase() === name);
    return col && col.notnull;
  });
  if (stillRequired.length === 0) return { table, skipped: 'already nullable' };

  const createSql = await createSqlOf(db, table);
  const tmp = `${table}__rebuild_120`;
  const newSql = createSql ? relaxedDefinition(createSql, table, tmp, stillRequired) : null;
  if (!newSql) throw new Error(`could not rewrite the definition of ${table}`);

  const carried = await swapTable(db, table, tmp, newSql);
  return { table, rebuilt: true, relaxed: stillRequired, ...carried };
}

async function run() {
  const db = require('../config/database');

  if (process.env.USE_SQLITE !== 'true') {
    return { skipped: 'not SQLite — 120_jobs_application_parent.sql covers Postgres' };
  }

  const results = await withForeignKeysOff(db, [...PARENTLESS, 'local_job_postings'], async () => {
    const out = [];
    for (const table of PARENTLESS) out.push(await dropJobParent(db, table));
    out.push(await relaxPostings(db));
    return out;
  });
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
      console.error('❌ 120 failed: ' + err.message);
      process.exit(1);
    });
}

module.exports = { run, withoutJobIdParent };

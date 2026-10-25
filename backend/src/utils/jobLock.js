const crypto = require('crypto');
const { query } = require('../config/database');
const logger = require('../config/logger');

/**
 * One instance runs a scheduled job; the others skip it.
 *
 * node-cron and the polling workers live inside the web process, so N instances
 * run every job N times. For most of them that is wasted work; for the ones
 * that create things — a subscription's delivery order, a payout, a reminder —
 * it is duplicates. A single Render instance never showed it.
 *
 * Before a job runs, an instance takes a row in job_locks for slightly less
 * than the job's interval. The lock is deliberately NOT released afterwards:
 * instances fire within milliseconds of each other, and releasing on completion
 * would let a slower one start the same run just after the first finished. It
 * simply expires.
 *
 * Acquisition is a conditional UPDATE (take an expired lock) followed by an
 * INSERT (first ever use); each is atomic, so two instances cannot both win.
 * If the database cannot be reached the job is skipped, not run unguarded:
 * the jobs need the database anyway.
 */

const INSTANCE_ID = `${process.env.RENDER_INSTANCE_ID || process.env.HOSTNAME || 'local'}:${process.pid}:${crypto.randomBytes(3).toString('hex')}`;

const stamp = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString().slice(0, 19).replace('T', ' ');

async function acquireLock(name, ttlMs) {
  const now = stamp();
  const until = stamp(ttlMs);
  try {
    const taken = await query(
      'UPDATE job_locks SET locked_until = $1, locked_by = $2, locked_at = $3 WHERE name = $4 AND locked_until <= $3',
      [until, INSTANCE_ID, now, name]
    );
    if (taken && taken.rowCount > 0) return true;
    // First use of this lock, or it is held: ON CONFLICT DO NOTHING says which without raising a
    // constraint error that the database layer would log on every contended tick.
    const created = await query(
      'INSERT INTO job_locks (name, locked_until, locked_by, locked_at) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
      [name, until, INSTANCE_ID, now]
    );
    return Boolean(created && created.rowCount > 0);
  } catch (err) {
    // A unique violation on INSERT is another instance having won; anything else
    // is logged, and either way this instance does not run the job.
    if (!/unique|duplicate|23505|constraint/i.test(`${err.code} ${err.message}`)) {
      logger.warn(`[JobLock] could not take "${name}": ${err.message}`);
    }
    return false;
  }
}

/** Wraps `fn` so it runs only when this instance wins the lock for `ttlMs`. */
function locked(name, ttlMs, fn) {
  return async (...args) => {
    if (process.env.JOB_LOCKS === 'off') return fn(...args);
    if (!(await acquireLock(name, ttlMs))) return undefined;
    return fn(...args);
  };
}

module.exports = { acquireLock, locked, INSTANCE_ID };

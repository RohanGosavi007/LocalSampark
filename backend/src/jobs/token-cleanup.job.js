const cron = require('../utils/cron');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { sqlTimestamp } = require('../utils/sqlTime');

/**
 * Housekeeping for the tables session security adds.
 *
 * used_refresh_tokens grows by one row per refresh. A row only matters while the
 * token it records could still be presented, so once its natural expiry passes
 * it can go. job_locks has one row per job and needs no pruning beyond rows for
 * jobs that no longer exist.
 */
async function cleanUpTokens(now = sqlTimestamp()) {
  const used = await query('DELETE FROM used_refresh_tokens WHERE expires_at < $1', [now]);
  const stale = await query('DELETE FROM job_locks WHERE locked_until < $1', [sqlTimestamp(-7 * 24 * 60 * 60 * 1000)]);
  return { usedRefreshTokens: (used && used.rowCount) || 0, staleLocks: (stale && stale.rowCount) || 0 };
}

if (process.env.NODE_ENV !== 'test') {
  cron.schedule('40 3 * * *', async () => {
    try {
      const r = await cleanUpTokens();
      if (r.usedRefreshTokens || r.staleLocks) logger.info(`[Job] Token cleanup: ${r.usedRefreshTokens} refresh record(s), ${r.staleLocks} lock(s)`);
    } catch (error) {
      logger.error('[Job] Token cleanup failed: ' + error.message);
    }
  });
}

module.exports = { cleanUpTokens };

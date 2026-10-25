const cron = require('../utils/cron');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { sqlTimestamp } = require('../utils/sqlTime');

/**
 * Starts and ends merchants' scheduled campaigns.
 *
 * POST /campaigns/:shopId creates a campaign as 'scheduled' with a start and an
 * end. Nothing ever moved it on: a flash sale never began unless the merchant
 * pressed activate, and one that was activated never ended, so a "2 hours only"
 * offer stayed live indefinitely. The job that did this (campaignScheduler.js)
 * was never started, wanted Redis, and used NOW(), which SQLite does not have.
 *
 * Every five minutes:
 *   1. campaigns past their end become 'completed' — first, so one whose whole
 *      window has passed is never briefly activated;
 *   2. scheduled campaigns inside their window become 'active'.
 *
 * Times are UTC. The campaign routes store them normalised ('YYYY-MM-DD
 * HH:MM:SS'), and the SQL turns the 'T' of an ISO string into a space so rows
 * written either way compare correctly as text on SQLite.
 */
const AS_TEXT = (column) => `REPLACE(CAST(${column} AS TEXT), 'T', ' ')`;

async function runCampaignSchedule(now = sqlTimestamp()) {
  const ended = await query(
    `UPDATE shop_campaigns
        SET status = 'completed'
      WHERE status IN ('active', 'scheduled')
        AND end_datetime IS NOT NULL AND ${AS_TEXT('end_datetime')} <= $1`,
    [now]
  );

  const started = await query(
    `UPDATE shop_campaigns
        SET status = 'active'
      WHERE status = 'scheduled'
        AND start_datetime IS NOT NULL AND ${AS_TEXT('start_datetime')} <= $1`,
    [now]
  );

  return { ended: (ended && ended.rowCount) || 0, started: (started && started.rowCount) || 0 };
}

// Not scheduled under Jest: a test calls runCampaignSchedule() directly.
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { ended, started } = await runCampaignSchedule();
      if (ended || started) logger.info(`[Job] Campaigns: ${started} started, ${ended} ended`);
    } catch (error) {
      logger.error('[Job] Campaign schedule failed: ' + error.message);
    }
  });
}

module.exports = { runCampaignSchedule };

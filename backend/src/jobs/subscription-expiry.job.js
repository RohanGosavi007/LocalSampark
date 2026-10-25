const cron = require('../utils/cron');
const { query, queryMany } = require('../config/database');
const logger = require('../config/logger');

/**
 * Ends merchant plans whose paid period is over.
 *
 * Buying a plan sets the shop's tier to premium and stamps the date the period
 * ends (services/payments.service.js#activateSubscription). Nothing read that
 * date: the first month's payment kept a shop premium — and, bought from the
 * wallet, at 0% commission — for as long as the row existed.
 *
 * Hourly, this finds every shop whose premium period has passed and returns it
 * to the free tier, and marks the subscription rows expired. A shop that has
 * renewed has a later date and is not touched. The commission override is
 * cleared only where it is the 0 the plan set, so a rate an administrator
 * negotiated for a shop survives its plan lapsing.
 */
async function expireSubscriptions(now = new Date()) {
  const cutoff = now.toISOString();

  const lapsed = await queryMany(
    `SELECT id FROM local_shops
      WHERE is_premium = '1' AND premium_expires_at IS NOT NULL AND premium_expires_at < $1`,
    [cutoff]
  );

  for (const shop of lapsed) {
    await query(
      `UPDATE local_shops
          SET is_premium = '0', crm_tier = 'free',
              commission_override_percent = CASE WHEN commission_override_percent = 0 THEN NULL ELSE commission_override_percent END
        WHERE id = $1 AND premium_expires_at < $2`,
      [shop.id, cutoff]
    );
  }

  const expired = await query(
    `UPDATE vendor_subscriptions
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' AND current_period_end IS NOT NULL AND current_period_end < $1`,
    [cutoff]
  );

  // SamparkPlus memberships whose paid period is over. A row with a tier and no
  // end date is one handed out free before payment existed: it lapses too.
  const stamp = cutoff.slice(0, 19).replace('T', ' ');
  const memberships = await query(
    `UPDATE user_subscriptions
        SET status = 'expired'
      WHERE tier IS NOT NULL AND status = 'active'
        AND (tier_expires_at IS NULL OR tier_expires_at < $1)`,
    [stamp]
  );

  return {
    shops: lapsed.length,
    subscriptions: (expired && expired.rowCount) || 0,
    memberships: (memberships && memberships.rowCount) || 0,
  };
}

// Not scheduled under Jest: a test calls expireSubscriptions() directly.
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('5 * * * *', async () => {
    try {
      const result = await expireSubscriptions();
      if (result.shops || result.subscriptions) {
        logger.info(`[Job] Subscription expiry: ${result.shops} shop(s) returned to the free tier, ${result.subscriptions} subscription(s) expired`);
      }
    } catch (error) {
      logger.error('[Job] Subscription expiry failed: ' + error.message);
    }
  });
}

module.exports = { expireSubscriptions };

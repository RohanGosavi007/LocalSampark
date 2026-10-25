const { queryOne } = require('../config/database');

/**
 * SamparkPlus membership, read from the one place it is written.
 *
 * A membership is a user_subscriptions row with a tier and a paid period that has
 * not ended (services/payments.service.js settles the payment that creates or
 * extends it). Rows with a tier and no end date were handed out free by the old
 * endpoint and are not memberships.
 */
async function isMember(userId, now = new Date()) {
  if (!userId) return false;
  const stamp = now.toISOString().slice(0, 19).replace('T', ' ');
  const row = await queryOne(
    `SELECT id FROM user_subscriptions
      WHERE user_id = $1 AND tier = 'SamparkPlus' AND status = 'active'
        AND tier_expires_at IS NOT NULL AND tier_expires_at > $2
      LIMIT 1`,
    [userId, stamp]
  );
  return Boolean(row);
}

module.exports = { isMember };

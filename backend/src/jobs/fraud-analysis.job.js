/**
 * ═══════════════════════════════════════════════════════════════════════
 * Fraud Pattern Analysis — Daily Batch Cron Job
 * 10x Plan: Section 22.3.2 — Layer 2 Async Batch Analysis
 *
 * Runs daily at 3 AM and records fraud_signals, which the admin fraud queue
 * (modules/crm/routes/fraud.routes.js) lists for review:
 *   1. shops with no products 48 hours after registering
 *   2. several accounts on one device
 *   3. review bombing: five or more reviews from one account in a day
 *   4. near-perfect ratings that come mostly from brand-new accounts
 *
 * This job was never started — server.js did not require it — and could not
 * have run in production: it was written in SQLite's dialect
 * (datetime('now', …), GROUP_CONCAT), which PostgreSQL rejects. The fraud
 * queue only ever showed signals raised inline elsewhere. Times are now
 * computed here and bound as parameters, and accounts per device are read
 * with a second query instead of a string aggregate.
 * ═══════════════════════════════════════════════════════════════════════
 */
const cron = require('../utils/cron');
const { queryMany } = require('../config/database');
const FraudDetectionService = require('../services/fraudDetection.service');
const logger = require('../config/logger');

const HOUR_MS = 60 * 60 * 1000;

/** 'YYYY-MM-DD HH:MM:SS' (UTC) at `now` minus `ms` — the format both engines compare correctly. */
const before = (now, ms) => new Date(now.getTime() - ms).toISOString().slice(0, 19).replace('T', ' ');

async function runFraudAnalysis(now = new Date()) {
  let signalsGenerated = 0;
  const weekAgo = before(now, 7 * 24 * HOUR_MS);

  // ─── 1. Empty shops (no products after 48+ hours) ───
  const emptyShops = await queryMany(
    `SELECT s.id, s.owner_id FROM local_shops s
      WHERE s.is_active = '1'
        AND s.created_at < $1
        AND NOT EXISTS (SELECT 1 FROM shop_products p WHERE p.shop_id = s.id)`,
    [before(now, 48 * HOUR_MS)]
  );
  for (const shop of emptyShops) {
    const existing = await queryMany(
      `SELECT id FROM fraud_signals
        WHERE entity_type = 'shop' AND entity_id = $1 AND signal_type = 'empty_shop_48h' AND created_at > $2`,
      [String(shop.id), weekAgo]
    );
    if (existing.length === 0) {
      await FraudDetectionService.recordSignal('shop', String(shop.id), {
        signal_type: 'empty_shop_48h',
        severity: 'medium',
        details: { owner_id: shop.owner_id, note: 'No products added 48+ hours after registration' },
      });
      signalsGenerated++;
    }
  }

  // ─── 2. Several accounts on one device ───
  const sharedDevices = await queryMany(
    `SELECT device_id, COUNT(DISTINCT user_id) AS user_count
       FROM device_fingerprints
      WHERE user_id IS NOT NULL
      GROUP BY device_id
     HAVING COUNT(DISTINCT user_id) >= 2`
  );
  for (const device of sharedDevices) {
    const existing = await queryMany(
      `SELECT id FROM fraud_signals
        WHERE entity_type = 'user' AND signal_type = 'multi_account_device' AND details LIKE $1 AND created_at > $2`,
      [`%${device.device_id}%`, weekAgo]
    );
    if (existing.length > 0) continue;
    const users = await queryMany('SELECT DISTINCT user_id FROM device_fingerprints WHERE device_id = $1 AND user_id IS NOT NULL', [device.device_id]);
    const count = Number(device.user_count);
    for (const { user_id: userId } of users) {
      await FraudDetectionService.recordSignal('user', String(userId), {
        signal_type: 'multi_account_device',
        severity: count >= 3 ? 'high' : 'medium',
        details: { device_id: device.device_id, accounts_on_device: count },
      });
      signalsGenerated++;
    }
  }

  // ─── 3. Review bombing (5+ reviews from one account in 24h) ───
  const reviewBombers = await queryMany(
    `SELECT user_id, COUNT(*) AS review_count
       FROM shop_reviews
      WHERE created_at > $1 AND user_id IS NOT NULL
      GROUP BY user_id
     HAVING COUNT(*) >= 5`,
    [before(now, 24 * HOUR_MS)]
  );
  for (const bomber of reviewBombers) {
    const existing = await queryMany(
      `SELECT id FROM fraud_signals
        WHERE entity_type = 'user' AND entity_id = $1 AND signal_type = 'review_bombing' AND created_at > $2`,
      [String(bomber.user_id), before(now, 24 * HOUR_MS)]
    );
    if (existing.length > 0) continue;
    await FraudDetectionService.recordSignal('user', String(bomber.user_id), {
      signal_type: 'review_bombing',
      severity: Number(bomber.review_count) >= 10 ? 'high' : 'medium',
      details: { reviews_in_24h: Number(bomber.review_count) },
    });
    signalsGenerated++;
  }

  // ─── 4. Near-perfect ratings, mostly from new accounts ───
  const monthAgo = before(now, 30 * 24 * HOUR_MS);
  const perfectRatingShops = await queryMany(
    `SELECT shop_id, COUNT(*) AS review_count, AVG(rating) AS avg_rating
       FROM shop_reviews
      WHERE created_at > $1
      GROUP BY shop_id
     HAVING COUNT(*) >= 10 AND AVG(rating) >= 4.9`,
    [monthAgo]
  );
  for (const shop of perfectRatingShops) {
    const [newAccounts] = await queryMany(
      `SELECT COUNT(*) AS cnt FROM shop_reviews sr
         JOIN users u ON sr.user_id = u.id
        WHERE sr.shop_id = $1 AND u.created_at > $2 AND sr.created_at > $3`,
      [shop.shop_id, before(now, 14 * 24 * HOUR_MS), monthAgo]
    );
    const total = Number(shop.review_count);
    const fresh = Number(newAccounts && newAccounts.cnt) || 0;
    if (fresh <= total * 0.7) continue;

    const existing = await queryMany(
      `SELECT id FROM fraud_signals
        WHERE entity_type = 'shop' AND entity_id = $1 AND signal_type = 'suspicious_perfect_rating' AND created_at > $2`,
      [String(shop.shop_id), weekAgo]
    );
    if (existing.length > 0) continue;
    await FraudDetectionService.recordSignal('shop', String(shop.shop_id), {
      signal_type: 'suspicious_perfect_rating',
      severity: 'high',
      details: {
        avg_rating: Number(shop.avg_rating).toFixed(1),
        total_reviews: total,
        new_account_reviews_pct: Math.round((fresh / total) * 100),
      },
    });
    signalsGenerated++;
  }

  return { signalsGenerated };
}

// Not scheduled under Jest: a test calls runFraudAnalysis() directly.
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('0 3 * * *', async () => {
    const startTime = Date.now();
    try {
      const { signalsGenerated } = await runFraudAnalysis();
      logger.info(`✅ Fraud analysis completed: ${signalsGenerated} signals generated in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    } catch (error) {
      logger.error('❌ Fraud analysis cron failed: ' + error.message);
    }
  });
}

module.exports = { runFraudAnalysis };

/**
 * ═══════════════════════════════════════════════════════════════════════
 * Fraud Pattern Analysis — Daily Batch Cron Job
 * 10x Plan: Section 22.3.2 — Layer 2 Async Batch Analysis
 * 
 * Runs daily at 3 AM to:
 * 1. Detect empty shops older than 48 hours
 * 2. Flag review manipulation patterns
 * 3. Detect multi-account device abuse
 * 4. Calculate aggregate fraud scores
 * ═══════════════════════════════════════════════════════════════════════
 */
const cron = require('node-cron');
const { query, queryMany } = require('../config/database');
const FraudDetectionService = require('../services/fraudDetection.service');
const logger = require('../config/logger');
const crypto = require('crypto');

// Run daily at 3:00 AM
cron.schedule('0 3 * * *', async () => {
  logger.info('🕵️ Starting daily fraud pattern analysis...');
  const startTime = Date.now();
  let signalsGenerated = 0;

  try {
    // ─── Analysis 1: Empty shops (no products after 48+ hours) ───
    const emptyShops = await queryMany(
      `SELECT id, owner_id FROM local_shops
       WHERE is_active = 1
         AND created_at < datetime('now', '-48 hours')
         AND id NOT IN (SELECT DISTINCT shop_id FROM shop_products)`
    );

    for (const shop of emptyShops) {
      const existing = await queryMany(
        `SELECT id FROM fraud_signals
         WHERE entity_type = 'shop' AND entity_id = $1 AND signal_type = 'empty_shop_48h'
         AND created_at > datetime('now', '-7 days')`, [shop.id]
      );
      if (existing.length === 0) {
        await FraudDetectionService.recordSignal('shop', shop.id, {
          signal_type: 'empty_shop_48h',
          severity: 'medium',
          details: { owner_id: shop.owner_id, note: 'No products added 48+ hours after registration' },
        });
        signalsGenerated++;
      }
    }

    // ─── Analysis 2: Multi-account same device ───
    const suspiciousDevices = await queryMany(
      `SELECT device_id, COUNT(DISTINCT user_id) as user_count,
              GROUP_CONCAT(user_id) as users
       FROM device_fingerprints
       GROUP BY device_id
       HAVING COUNT(DISTINCT user_id) >= 2`
    );

    for (const device of suspiciousDevices) {
      const existing = await queryMany(
        `SELECT id FROM fraud_signals
         WHERE entity_type = 'user' AND signal_type = 'multi_account_device'
         AND details LIKE $1
         AND created_at > datetime('now', '-7 days')`,
        [`%${device.device_id}%`]
      );
      if (existing.length === 0) {
        const userIds = device.users.split(',');
        for (const userId of userIds) {
          await FraudDetectionService.recordSignal('user', userId.trim(), {
            signal_type: 'multi_account_device',
            severity: device.user_count >= 3 ? 'high' : 'medium',
            details: {
              device_id: device.device_id,
              accounts_on_device: device.user_count,
            },
          });
          signalsGenerated++;
        }
      }
    }

    // ─── Analysis 3: Review bombing (5+ reviews from one user in 24h) ───
    const reviewBombers = await queryMany(
      `SELECT user_id, COUNT(*) as review_count
       FROM shop_reviews
       WHERE created_at > datetime('now', '-24 hours')
       GROUP BY user_id
       HAVING COUNT(*) >= 5`
    );

    for (const bomber of reviewBombers) {
      await FraudDetectionService.recordSignal('user', bomber.user_id, {
        signal_type: 'review_bombing',
        severity: bomber.review_count >= 10 ? 'high' : 'medium',
        details: { reviews_in_24h: bomber.review_count },
      });
      signalsGenerated++;
    }

    // ─── Analysis 4: Shops with suspiciously perfect ratings ───
    const perfectRatingShops = await queryMany(
      `SELECT shop_id, COUNT(*) as review_count, AVG(rating) as avg_rating
       FROM shop_reviews
       WHERE created_at > datetime('now', '-30 days')
       GROUP BY shop_id
       HAVING COUNT(*) >= 10 AND AVG(rating) >= 4.9`
    );

    for (const shop of perfectRatingShops) {
      // Check if all reviews are from new accounts
      const newAccountReviews = await queryMany(
        `SELECT COUNT(*) as cnt FROM shop_reviews sr
         JOIN users u ON sr.user_id = u.id
         WHERE sr.shop_id = $1
           AND u.created_at > datetime('now', '-14 days')
           AND sr.created_at > datetime('now', '-30 days')`,
        [shop.shop_id]
      );

      if (newAccountReviews[0] && parseInt(newAccountReviews[0].cnt) > shop.review_count * 0.7) {
        await FraudDetectionService.recordSignal('shop', shop.shop_id, {
          signal_type: 'suspicious_perfect_rating',
          severity: 'high',
          details: {
            avg_rating: parseFloat(shop.avg_rating).toFixed(1),
            total_reviews: shop.review_count,
            new_account_reviews_pct: Math.round((parseInt(newAccountReviews[0].cnt) / shop.review_count) * 100),
          },
        });
        signalsGenerated++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`✅ Fraud analysis completed: ${signalsGenerated} signals generated in ${duration}s`);

  } catch (error) {
    logger.error('❌ Fraud analysis cron failed: ' + error.message);
  }
});

logger.info('📅 Fraud pattern analysis cron scheduled (daily at 3:00 AM)');

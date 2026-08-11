/**
 * ═══════════════════════════════════════════════════════════════════════
 * Shop Analytics Snapshot — Daily Cron Job
 * 10x Plan: Section 20.3 — Pre-computed Dashboard Data
 * 
 * Runs daily at 1 AM to compute analytics snapshots for all active shops
 * ═══════════════════════════════════════════════════════════════════════
 */
const cron = require('node-cron');
const { query, queryOne, queryMany } = require('../config/database');
const logger = require('../config/logger');
const crypto = require('crypto');

// Run daily at 1:00 AM
cron.schedule('0 1 * * *', async () => {
  logger.info('📊 Starting daily shop analytics snapshot...');
  const startTime = Date.now();

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Get all active shops
    const shops = await queryMany(
      `SELECT id, region_id FROM local_shops WHERE is_active = 1`
    );

    let snapshotsCreated = 0;

    for (const shop of shops) {
      try {
        // Order metrics
        const orderStats = await queryOne(
          `SELECT
             COUNT(*) as total_orders,
             COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as completed,
             COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) as cancelled,
             COALESCE(AVG(CASE WHEN order_status = 'delivered' THEN total_amount END), 0) as avg_value,
             COALESCE(SUM(CASE WHEN order_status = 'delivered' THEN total_amount ELSE 0 END), 0) as gross_rev,
             COUNT(DISTINCT user_id) as unique_customers
           FROM orders
           WHERE shop_id = $1 AND date(created_at) = $2`,
          [shop.id, dateStr]
        );

        // New customers (first order ever from this shop)
        const newCustomers = await queryOne(
          `SELECT COUNT(*) as cnt FROM (
             SELECT user_id FROM orders
             WHERE shop_id = $1 AND date(created_at) = $2
             AND user_id NOT IN (
               SELECT DISTINCT user_id FROM orders
               WHERE shop_id = $1 AND date(created_at) < $2
             )
           )`,
          [shop.id, dateStr]
        );

        // Review metrics
        const reviewStats = await queryOne(
          `SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_rating
           FROM shop_reviews WHERE shop_id = $1 AND date(created_at) = $2`,
          [shop.id, dateStr]
        );

        // Appointment metrics
        const appointmentStats = await queryOne(
          `SELECT
             COUNT(*) as total,
             COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
             COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_shows
           FROM appointments WHERE shop_id = $1 AND date(scheduled_date) = $2`,
          [shop.id, dateStr]
        );

        const id = crypto.randomUUID();
        const unique = orderStats ? parseInt(orderStats.unique_customers || 0) : 0;
        const newCust = newCustomers ? parseInt(newCustomers.cnt || 0) : 0;

        await query(
          `INSERT OR REPLACE INTO shop_analytics_daily
           (id, shop_id, date, total_orders, completed_orders, cancelled_orders, avg_order_value,
            gross_revenue, unique_customers, new_customers, repeat_customers,
            reviews_received, avg_rating,
            total_appointments, completed_appointments, no_shows)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [id, shop.id, dateStr,
           orderStats?.total_orders || 0, orderStats?.completed || 0, orderStats?.cancelled || 0,
           parseFloat(orderStats?.avg_value || 0).toFixed(2),
           parseFloat(orderStats?.gross_rev || 0).toFixed(2),
           unique, newCust, Math.max(0, unique - newCust),
           reviewStats?.cnt || 0, parseFloat(reviewStats?.avg_rating || 0).toFixed(1),
           appointmentStats?.total || 0, appointmentStats?.completed || 0, appointmentStats?.no_shows || 0]
        );

        snapshotsCreated++;
      } catch (err) {
        // Skip individual shop errors, continue with others
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`✅ Analytics snapshots created: ${snapshotsCreated}/${shops.length} shops in ${duration}s`);

  } catch (error) {
    logger.error('❌ Analytics snapshot cron failed: ' + error.message);
  }
});

logger.info('📅 Shop analytics snapshot cron scheduled (daily at 1:00 AM)');

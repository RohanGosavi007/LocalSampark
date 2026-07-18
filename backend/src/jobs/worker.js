const { Worker } = require('bullmq');
const { query } = require('../config/database');
const logger = require('../config/logger');

// Initialize BullMQ Workers for Background Jobs
function initWorkers(redisConnection) {
  logger.info('Initializing BullMQ Background Workers...');

  // 1. Hourly Maintenance Worker
  const hourlyWorker = new Worker('hourly-maintenance', async (job) => {
    logger.info(`Processing hourly maintenance job: ${job.id}`);
    
    // Cleanup expired stories
    const res = await query('DELETE FROM stories WHERE expires_at < CURRENT_TIMESTAMP');
    if (res.rowCount > 0) {
      logger.info(`🧹 Deleted ${res.rowCount} expired stories`);
    }

    // Auto-debit and create delivery orders for active daily/recurring subscriptions
    const activeSubs = await query(`
      SELECT us.*, sp.price, sp.name as plan_name, sp.shop_id 
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active' AND us.next_delivery_date <= CURRENT_DATE
    `);
    
    for (const sub of activeSubs.rows) {
      try {
        await query(
          `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`,
          [sub.price, sub.user_id]
        );
        await query(
          `INSERT INTO wallet_transactions (wallet_id, amount, type, purpose, status)
           VALUES ((SELECT id FROM wallets WHERE user_id = $1), $2, 'debit', 'order_payment', 'completed')`,
          [sub.user_id, sub.price]
        );
        await query(
          `INSERT INTO orders (user_id, shop_id, total_amount, delivery_fee, payment_method, payment_status, order_status, delivery_address, delivery_coordinate)
           VALUES ($1, $2, $3, 20.00, 'wallet', 'paid', 'confirmed', $4, $5)`,
          [sub.user_id, sub.shop_id, sub.price, sub.delivery_address, sub.delivery_coordinate]
        );
        const currentNext = new Date(sub.next_delivery_date);
        currentNext.setDate(currentNext.getDate() + 1);
        const nextDateStr = currentNext.toISOString().split('T')[0];

        await query(
          `UPDATE user_subscriptions 
           SET next_delivery_date = $2,
               total_deliveries = total_deliveries + 1
           WHERE id = $1`,
          [sub.id, nextDateStr]
        );
        logger.info(`📦 Auto-delivery order created for subscription ${sub.id}`);
      } catch (subErr) {
        logger.error(`❌ Failed processing subscription ${sub.id}: ` + subErr.message);
      }
    }
  }, { connection: redisConnection });

  hourlyWorker.on('completed', job => logger.info(`Hourly maintenance completed: ${job.id}`));
  hourlyWorker.on('failed', (job, err) => logger.error(`Hourly maintenance failed: ${job.id}, error: ${err.message}`));

  // 2. High Frequency Worker (Guard Reminders)
  const frequentWorker = new Worker('high-frequency-tasks', async (job) => {
    // Note: To properly emit to sockets from BullMQ, we would use a Redis adapter for Socket.io.
    // For now, we process DB updates and log. Sockets can be bridged via a pub/sub if needed.
    const dueReminders = await query(`
      SELECT sgr.*, u.full_name as created_by_name FROM society_guard_reminders sgr
      JOIN users u ON sgr.created_by = u.id
      WHERE sgr.status = 'active' AND sgr.reminder_time <= datetime('now')
    `);
    
    for (const reminder of (dueReminders.rows || [])) {
      // Mark as completed (non-recurring)
      if (!reminder.is_recurring) {
        await query("UPDATE society_guard_reminders SET status = 'completed' WHERE id = $1", [reminder.id]);
        logger.info(`🔔 Processed guard reminder: ${reminder.id}`);
      }
    }
  }, { connection: redisConnection });

  frequentWorker.on('failed', (job, err) => logger.error(`High-frequency task failed: ${err.message}`));
}

module.exports = { initWorkers };

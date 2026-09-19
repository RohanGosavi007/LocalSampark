const { Worker } = require('bullmq');
const { query, withTransaction } = require('../config/database');
const logger = require('../config/logger');
const { trackInterval } = require('../utils/intervals');

// Execute maintenance logic (extracted for reuse across BullMQ and In-Memory fallback)
async function runHourlyMaintenance() {
  logger.info('⚡ [Worker:Sync] Running hourly maintenance & subscription processing...');
  try {
    // Cleanup expired stories
    const res = await query('DELETE FROM stories WHERE expires_at < CURRENT_TIMESTAMP');
    const deletedCount = res.rowCount || (Array.isArray(res) ? res.length : 0);
    if (deletedCount > 0) {
      logger.info(`🧹 Deleted ${deletedCount} expired stories`);
    }

    // Auto-debit and create delivery orders for active daily/recurring subscriptions
    const activeSubs = await query(`
      SELECT us.*, sp.price, sp.name as plan_name, sp.shop_id 
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active' AND us.next_delivery_date <= CURRENT_DATE
    `);
    
    const rows = activeSubs.rows || activeSubs || [];
    for (const sub of rows) {
      try {
        // Each subscription is settled in a single transaction.
        //
        // Previously these four statements ran as bare, unwrapped queries:
        // the wallet was debited first, and if the orders INSERT then threw
        // (a missing shop_id, a NOT NULL violation on delivery_address) the
        // debit stood while no order existed — the customer paid for
        // nothing, and the next hourly run charged them again because
        // next_delivery_date had not advanced either.
        //
        // The debit was also unguarded: `balance = balance - price` with no
        // predicate, against a wallets.balance column that carries no CHECK
        // constraint. Any active subscription drove the balance negative
        // forever, silently extending unlimited credit.
        await withTransaction(async (client) => {
          const debit = await client.query(
            `UPDATE wallets SET balance = balance - $1
              WHERE user_id = $2 AND balance >= $1`,
            [sub.price, sub.user_id]
          );

          // Zero rows means the balance did not cover the charge. Skip the
          // delivery and leave next_delivery_date where it is so the run
          // retries once the wallet is topped up.
          if (!debit.rowCount) {
            logger.warn(
              `💸 Subscription ${sub.id} skipped: wallet for user ${sub.user_id} ` +
              `has insufficient balance for ₹${sub.price}.`
            );
            return;
          }

          await client.query(
            `INSERT INTO wallet_transactions (wallet_id, amount, type, purpose, status)
             VALUES ((SELECT id FROM wallets WHERE user_id = $1), $2, 'debit', 'order_payment', 'completed')`,
            [sub.user_id, sub.price]
          );
          await client.query(
            `INSERT INTO orders (user_id, shop_id, total_amount, delivery_fee, payment_method, payment_status, order_status, delivery_address, delivery_coordinate)
             VALUES ($1, $2, $3, 20.00, 'wallet', 'paid', 'confirmed', $4, $5)`,
            [sub.user_id, sub.shop_id, sub.price, sub.delivery_address, sub.delivery_coordinate]
          );

          const currentNext = new Date(sub.next_delivery_date);
          currentNext.setDate(currentNext.getDate() + 1);
          const nextDateStr = currentNext.toISOString().split('T')[0];

          await client.query(
            `UPDATE user_subscriptions
             SET next_delivery_date = $2,
                 total_deliveries = total_deliveries + 1
             WHERE id = $1`,
            [sub.id, nextDateStr]
          );
          logger.info(`📦 Auto-delivery order created for subscription ${sub.id}`);
        });
      } catch (subErr) {
        logger.error(`❌ Failed processing subscription ${sub.id}: ` + subErr.message);
      }
    }
  } catch (err) {
    logger.error('❌ Error in hourly maintenance execution: ' + err.message);
  }
}

async function runHighFrequencyTasks() {
  try {
    const nowIso = new Date().toISOString();
    const dueReminders = await query(`
      SELECT sgr.*, u.full_name as created_by_name FROM society_guard_reminders sgr
      JOIN users u ON sgr.created_by = u.id
      WHERE sgr.status = 'active' AND sgr.reminder_time <= $1
    `, [nowIso]);
    
    const rows = dueReminders.rows || dueReminders || [];
    for (const reminder of rows) {
      if (!reminder.is_recurring) {
        await query("UPDATE society_guard_reminders SET status = 'completed' WHERE id = $1", [reminder.id]);
        logger.info(`🔔 Processed guard reminder: ${reminder.id}`);
      }
    }
  } catch (err) {
    logger.error('❌ Error in high frequency task execution: ' + err.message);
  }
}

// In-Memory Fallback Worker Initialization
function initFallbackWorkers() {
  logger.info('⚡ Initializing Synchronous In-Memory Fallback Queue Workers...');

  // Recurring intervals. trackInterval also fires the first pass immediately,
  // unrefs the timer so it cannot block a graceful shutdown, and skips a tick
  // while the previous (async) pass is still running. See utils/intervals.js.
  trackInterval('hourly-maintenance', runHourlyMaintenance, 3600000, { runImmediately: true });
  trackInterval('high-frequency-tasks', runHighFrequencyTasks, 30000, { runImmediately: true });
  
  logger.info('✅ Synchronous In-Memory Queue Workers Active (No Redis Required)');
}

// BullMQ Worker Initialization
function initWorkers(redisConnection) {
  logger.info('Initializing BullMQ Background Workers...');

  const hourlyWorker = new Worker('hourly-maintenance', async (job) => {
    logger.info(`Processing hourly maintenance job: ${job.id}`);
    await runHourlyMaintenance();
  }, { connection: redisConnection });

  hourlyWorker.on('completed', job => logger.info(`Hourly maintenance completed: ${job.id}`));
  hourlyWorker.on('failed', (job, err) => logger.error(`Hourly maintenance failed: ${job.id}, error: ${err.message}`));

  const frequentWorker = new Worker('high-frequency-tasks', async (job) => {
    await runHighFrequencyTasks();
  }, { connection: redisConnection });

  frequentWorker.on('failed', (job, err) => logger.error(`High-frequency task failed: ${err.message}`));
}

// Unified Dual Queue Engine Startup
function startQueueEngine(redisClient) {
  if (redisClient) {
    try {
      const { Queue } = require('bullmq');
      initWorkers(redisClient);

      const hourlyQueue = new Queue('hourly-maintenance', { connection: redisClient });
      const frequentQueue = new Queue('high-frequency-tasks', { connection: redisClient });

      hourlyQueue.add('cleanup-and-billing', {}, { repeat: { pattern: '0 * * * *' } });
      frequentQueue.add('guard-reminders', {}, { repeat: { every: 30000 } });
      
      logger.info('✅ BullMQ Queues and Schedulers initialized over Redis');
    } catch (err) {
      logger.warn('⚠️ BullMQ Redis initialization failed, activating in-memory fallback:', err.message);
      initFallbackWorkers();
    }
  } else {
    logger.info('ℹ️ Redis not detected. Activating Synchronous In-Memory Queue Engine.');
    initFallbackWorkers();
  }
}

module.exports = { initWorkers, initFallbackWorkers, startQueueEngine };

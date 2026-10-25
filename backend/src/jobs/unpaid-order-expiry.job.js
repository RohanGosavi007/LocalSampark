const cron = require('../utils/cron');
const logger = require('../config/logger');
const platformConfig = require('../services/platformConfig.service');
const lifecycle = require('../services/orderLifecycle.service');

/**
 * Clears out orders whose online payment never arrived.
 *
 * An order takes its stock when it is placed. One that was to be paid through
 * Razorpay and was not — the customer closed the window — would otherwise hold
 * that stock for good and sit in the shop's queue, where it cannot be
 * confirmed. After unpaid_order_expiry_minutes (30 unless an administrator has
 * changed it) it is cancelled and the stock goes back on sale.
 *
 * The same pass retries refunds Razorpay did not accept the first time, and
 * refunds a payment that arrived after its order had been cancelled.
 */
async function run(now = new Date()) {
  const minutes = await platformConfig.get('unpaid_order_expiry_minutes');
  return lifecycle.expireUnpaidOrders({ minutes, now });
}

// Not scheduled under Jest: a test calls run() directly.
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await run();
      if (result.cancelled || result.refunded) {
        logger.info(`[Job] Unpaid orders: ${result.cancelled} cancelled, ${result.refunded} refund(s) sent`);
      }
    } catch (error) {
      logger.error('[Job] Unpaid order expiry failed: ' + error.message);
    }
  });
}

module.exports = { run };

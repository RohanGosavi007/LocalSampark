const cron = require('../utils/cron');
const logger = require('../config/logger');
const reconciliation = require('../services/paymentReconciliation.service');
const lifecycle = require('../services/orderLifecycle.service');

/**
 * Asks Razorpay about payments whose outcome never reached us (P2), then
 * sends back any that were captured for an order that had already been
 * cancelled. Every 10 minutes; see services/paymentReconciliation.service.js.
 */
async function run(now = new Date()) {
  const result = await reconciliation.reconcilePayments({ now });
  // Anything settled for a cancelled order is now refund_pending: send it back.
  const refunds = result.settled ? await lifecycle.expireUnpaidOrders({ now }) : { refunded: 0 };
  return { ...result, refunded: refunds.refunded };
}

// Not scheduled under Jest: a test calls run() directly.
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const r = await run();
      if (r.settled || r.failed || r.abandoned || r.mismatched || r.errors) {
        logger.info(`[Job] Payment reconciliation: ${r.checked} checked, ${r.settled} settled, ${r.failed} failed, ${r.abandoned} abandoned, ${r.mismatched} mismatched, ${r.errors} unreachable, ${r.refunded} refund(s) sent`);
      }
    } catch (error) {
      logger.error('[Job] Payment reconciliation failed: ' + error.message);
    }
  });
}

module.exports = { run };

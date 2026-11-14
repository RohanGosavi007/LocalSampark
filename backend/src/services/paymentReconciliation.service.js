/**
 * Payment reconciliation (P2): finds payments whose outcome we never heard.
 *
 * A payment is settled by one of two messages: the browser's verify call and
 * Razorpay's webhook. If both are lost (the customer's phone died after paying,
 * the webhook endpoint was down, a deploy dropped the request) the payment row
 * stays `created` for ever while Razorpay holds a captured payment. The
 * unpaid-order job then cancels the order after 30 minutes: the customer has
 * been charged, the order is gone, and nothing will ever send the money back.
 *
 * This asks Razorpay about every payment still `created` after a few minutes:
 *
 *   captured at the gateway     settle it, through the same gate the webhook
 *                               uses (once only). If its order was already
 *                               cancelled, settle marks the order refund_pending
 *                               and the unpaid-order job sends the money back.
 *   failed at the gateway       mark it failed (with Razorpay's reason).
 *   nothing, long after         mark it failed: the checkout was abandoned.
 *   amount differs from ours    never settled; reported, for a person to look at.
 *   gateway unreachable         left alone and tried again on the next pass.
 *
 * Oldest first, 200 a pass, and a payment is closed (paid, failed or abandoned)
 * once it is old enough, so the queue does not grow.
 */
const { queryMany, query } = require('../config/database');
const razorpay = require('./razorpay.service');
const payments = require('./payments.service');

const MAX_PER_RUN = 200;

/** A created_at as a Date. The two engines store different text formats, so it is compared here, not in SQL. */
function toDate(value) {
  const text = String(value);
  const hasZone = /[zZ]$|[+-]\d\d:?\d\d$/.test(text);
  return new Date(hasZone ? text : `${text.replace(' ', 'T')}Z`);
}

/**
 * @returns {Promise<{ checked: number, settled: number, failed: number, abandoned: number, mismatched: number, errors: number }>}
 */
async function reconcilePayments({ now = new Date(), minAgeMinutes = 10, abandonAfterMinutes = 24 * 60 } = {}) {
  const result = { checked: 0, settled: 0, failed: 0, abandoned: 0, mismatched: 0, errors: 0 };
  if (!razorpay.isConfigured()) return result; // no gateway: nothing to ask

  const candidates = await queryMany(
    `SELECT * FROM payments
      WHERE status = 'created' AND gateway_order_id IS NOT NULL
      ORDER BY created_at ASC
      LIMIT ${MAX_PER_RUN}`
  );
  const askBefore = now.getTime() - minAgeMinutes * 60 * 1000;
  const rows = candidates.filter((p) => toDate(p.created_at).getTime() <= askBefore);

  for (const payment of rows) {
    result.checked += 1;
    const abandoned = toDate(payment.created_at).getTime() <= now.getTime() - abandonAfterMinutes * 60 * 1000;

    let items;
    try {
      items = await razorpay.fetchOrderPayments(payment.gateway_order_id);
    } catch (error) {
      // Razorpay answering 400/404 means it has no such order: nothing was ever
      // paid. Anything else (a network failure, its own outage) is tried again.
      const unknownToGateway = error && (error.statusCode === 400 || error.statusCode === 404);
      if (unknownToGateway && abandoned) items = [];
      else { result.errors += 1; continue; }
    }

    const captured = items.find((p) => p.status === 'captured');
    if (captured) {
      if (Number(captured.amount) !== Number(payment.amount_paise)) {
        result.mismatched += 1;
        console.error(`[payments] reconciliation: payment ${payment.id} captured ${captured.amount} paise at the gateway, expected ${payment.amount_paise}. Not settled.`);
        continue;
      }
      const outcome = await payments.settle(payment, captured.id);
      if (outcome.settled) result.settled += 1;
      continue;
    }

    const failed = items.length > 0 && items.every((p) => p.status === 'failed');
    if (failed || abandoned) {
      const last = items[items.length - 1] || {};
      const reason = failed
        ? String(last.error_description || last.error_code || 'payment failed at the gateway').slice(0, 250)
        : 'checkout abandoned: no payment was made';
      const changed = await query(
        "UPDATE payments SET status = 'failed', failure_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = 'created'",
        [reason, payment.id]
      );
      if (changed.rowCount ?? changed.changes) result[failed ? 'failed' : 'abandoned'] += 1;
    }
  }
  return result;
}

module.exports = { reconcilePayments };

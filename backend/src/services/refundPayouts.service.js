/**
 * Where a refund to the customer goes (Decision D10, F-158).
 *
 * While the consumer wallet is switched on (feature `wallet_coins`), a refund
 * that does not go back through the payment gateway is credited to the wallet,
 * where the customer can see and spend it. While it is off — the launch
 * default (DECISIONS.md D10) — the wallet is invisible to customers, so a
 * credit there would be money they could never see. Such a refund is instead a
 * manual payout: a row here, paid by an administrator by UPI or bank transfer
 * and confirmed with the transfer reference, which records it in the ledger and
 * tells the customer.
 *
 * Every refund path uses this: returns, the admin order refund and dispute
 * refunds. What has already been refunded (wallet credits and payouts not
 * cancelled) is what refundedSoFar adds up, so no path can refund an order
 * past its total.
 */
const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../config/database');
const { isFeatureEnabled } = require('../../../packages/shared/src/features');
const logger = require('../config/logger');

const UPI = /^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}$/;
const REFUND_PURPOSES = ['order_refund', 'dispute_refund', 'return_refund'];

class PayoutError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'PayoutError';
    this.status = status;
  }
}

const walletEnabled = (env = process.env) => isFeatureEnabled('wallet_coins', env);
const validUpi = (v) => typeof v === 'string' && UPI.test(v.trim());
const now = () => new Date().toISOString();
const run = (client, text, params) => (client ? client.query(text, params) : query(text, params));
const rowsOf = (r) => (r && r.rows) || r || [];

/**
 * Refunds `amount` to the customer outside the gateway: to the wallet when it
 * is on, as a manual payout when it is off. Returns { channel, payoutId? }.
 */
async function refundCustomer({ client = null, orderId, userId, amount, purpose, sourceType, sourceId = null, payeeUpi = null, note = null }) {
  const rupees = Math.round(Number(amount) * 100) / 100;
  if (!(rupees > 0)) return { channel: 'none' };
  if (walletEnabled()) {
    await require('./payments.service').creditWallet({ userId, amount: rupees, purpose, referenceId: String(orderId), client });
    return { channel: 'wallet' };
  }
  const id = crypto.randomUUID();
  await run(client,
    `INSERT INTO refund_payouts (id, source_type, source_id, order_id, user_id, amount, payee_upi, status, note, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)`,
    [id, sourceType, sourceId ? String(sourceId) : null, String(orderId), String(userId), rupees,
      validUpi(payeeUpi) ? payeeUpi.trim() : null, note ? String(note).slice(0, 500) : null, now()]
  );
  return { channel: 'manual_payout', payoutId: id };
}

/** What has gone back to the customer for this order outside the gateway. */
async function refundedSoFar(orderId, client = null) {
  const credited = rowsOf(await run(client,
    `SELECT COALESCE(SUM(wt.amount), 0) AS total FROM wallet_transactions wt
      WHERE wt.reference_id = $1 AND wt.purpose IN ('order_refund', 'dispute_refund', 'return_refund')`,
    [String(orderId)]))[0];
  const paidOut = rowsOf(await run(client,
    "SELECT COALESCE(SUM(amount), 0) AS total FROM refund_payouts WHERE order_id = $1 AND status <> 'cancelled'",
    [String(orderId)]))[0];
  return Math.round(((Number(credited && credited.total) || 0) + (Number(paidOut && paidOut.total) || 0)) * 100) / 100;
}

/** The payout queue for administrators, oldest pending first. */
async function listPayouts({ status = 'pending' } = {}) {
  const rows = await queryMany(
    `SELECT rp.*, u.full_name AS customer_name, u.phone_number AS customer_phone
       FROM refund_payouts rp
       LEFT JOIN users u ON CAST(u.id AS TEXT) = rp.user_id
      ${status === 'all' ? '' : 'WHERE rp.status = $1'}
      ORDER BY rp.created_at ASC
      LIMIT 200`,
    status === 'all' ? [] : [status]
  );
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/** The customer's own payouts (so a return can say where its refund stands). */
async function payoutsFor(userId) {
  return (await queryMany('SELECT id, source_type, source_id, order_id, amount, payee_upi, status, reference, paid_at, created_at FROM refund_payouts WHERE user_id = $1 ORDER BY created_at DESC', [String(userId)]))
    .map((r) => ({ ...r, amount: Number(r.amount) }));
}

/**
 * An administrator has transferred the money: record the reference, write the
 * ledger, tell the customer. Only a pending payout can be paid, once.
 */
async function markPaid({ id, reference, adminId, payeeUpi }) {
  const ref = String(reference || '').trim();
  if (ref.length < 4 || ref.length > 64) throw new PayoutError(400, 'Enter the UPI or bank transfer reference (4 to 64 characters).');
  const payout = await queryOne('SELECT * FROM refund_payouts WHERE id = $1', [id]);
  if (!payout) throw new PayoutError(404, 'Payout not found');
  const upi = payeeUpi && validUpi(payeeUpi) ? payeeUpi.trim() : payout.payee_upi;
  const claimed = await query(
    `UPDATE refund_payouts SET status = 'paid', reference = $1, paid_by = $2, paid_at = $3, payee_upi = $4
      WHERE id = $5 AND status = 'pending'`,
    [ref, String(adminId), now(), upi || null, id]
  );
  if (!Number(claimed.rowCount ?? claimed.changes ?? 0)) throw new PayoutError(409, `This payout is already ${payout.status}.`);

  const paise = Math.round(Number(payout.amount) * 100);
  try {
    await require('./ledger.service').recordTransaction({
      referenceType: 'ORDER_REFUND',
      referenceId: payout.order_id,
      postingKey: `REFUND_PAYOUT:${id}`,
      description: `Manual refund payout ${id} (ref ${ref})`,
      entries: [
        { entryType: 'DEBIT', accountType: 'REFUND_PAYABLE', accountId: payout.order_id, amountPaise: paise },
        // The cash taken for the order (CUSTOMER_CASH, as recorded at
        // delivery) goes back out to the customer.
        { entryType: 'CREDIT', accountType: 'CUSTOMER_CASH', accountId: payout.order_id, amountPaise: paise },
      ],
    });
  } catch (error) {
    logger.warn(`[refundPayouts] ledger entry for payout ${id}: ${error.message}`);
  }
  if (payout.source_type === 'return' && payout.source_id) {
    await query("UPDATE order_returns SET refund_reference_id = $1 WHERE id = $2", [ref, payout.source_id]);
  }
  await query("UPDATE orders SET payment_status = 'refunded', return_status = CASE WHEN return_status = 'refund_pending' THEN 'refunded' ELSE return_status END WHERE CAST(id AS TEXT) = $1", [payout.order_id]);
  try {
    await require('../modules/core/services/notification.service').sendToUser(payout.user_id, {
      type: 'return_update',
      title: 'Refund sent',
      body: `₹${Number(payout.amount)} has been sent${upi ? ` to ${upi}` : ''}. Reference ${ref}.`,
      data: { orderId: payout.order_id },
      actionUrl: `/order-tracking?id=${encodeURIComponent(payout.order_id)}`,
    });
  } catch { /* the payout stands */ }
  return { id, status: 'paid', reference: ref, amount: Number(payout.amount) };
}

module.exports = { refundCustomer, refundedSoFar, listPayouts, payoutsFor, markPaid, walletEnabled, validUpi, PayoutError, REFUND_PURPOSES };

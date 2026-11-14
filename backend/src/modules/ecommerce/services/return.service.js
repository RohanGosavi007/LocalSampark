const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../../../config/database');
const ledgerService = require('../../../services/ledger.service');
const logger = require('../../../config/logger');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

/**
 * Returns and refunds (C10).
 *
 * What changed:
 *   - an approved return on an order paid online was marked "refunded" with a
 *     reference made up on the spot (GW-RFND-…): nothing was sent to the
 *     payment gateway and the customer never got the money back. Online
 *     refunds now go through Razorpay (services/orderLifecycle.service
 *     refundThroughGateway); the return reads "refunded" only when Razorpay
 *     accepted it, otherwise "refund pending", where the existing retry and
 *     the admin refund pick it up. A wallet-paid order is credited back to the
 *     wallet, as cash is (it used to be sent to the "gateway" as well);
 *   - approval read the status and then wrote it, so two reviewers acting at
 *     once could refund twice; the decision now claims the request first;
 *   - reasons are codes from a fixed list (with details), photos must be web
 *     links, and the seller can review their own shop's returns, not only an
 *     administrator;
 *   - the customer can see their returns and is notified of each decision.
 */

const REASONS = ['wrong_item', 'damaged', 'spoiled_or_expired', 'missing_items', 'quality_issue', 'not_as_described', 'other'];
const MAX_PHOTOS = 5;
const RETURN_TYPES = ['return', 'replacement', 'refund', 'cancellation_refund'];
const ADMIN_ROLES = ['super_admin', 'superadmin', 'admin', 'territory_admin', 'franchise_owner', 'area_agent', 'moderator'];

class ReturnError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ReturnError';
    this.status = status;
  }
}

const parseJson = (v) => {
  if (Array.isArray(v)) return v;
  try { return typeof v === 'string' ? JSON.parse(v) : (v || []); } catch { return []; }
};

const changed = (result) => Number((result && (result.rowCount ?? result.changes)) || 0) > 0;

function isAdmin(user) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return ADMIN_ROLES.includes(String(user.role || '').toLowerCase());
}

async function notifyCustomer(userId, orderId, title, body) {
  try {
    await require('../../core/services/notification.service').sendToUser(userId, {
      type: 'return_update', title, body, data: { orderId },
      actionUrl: `/order-tracking?id=${encodeURIComponent(orderId)}`,
    });
  } catch (error) {
    logger.error(`[returns] customer not notified for order ${orderId}: ${error.message}`);
  }
}

function present(row) {
  return {
    ...row,
    items: parseJson(row.items),
    evidence_urls: parseJson(row.evidence_urls),
  };
}

class ReturnService {
  get REASONS() { return REASONS; }

  /**
   * Submits a customer return / replacement request. `reasonCode` is one of
   * REASONS; `reason` is the customer's own words (required for 'other').
   * A request that only sends `reason` text is filed as 'other'.
   */
  async submitReturnRequest({ orderId, userId, returnType = 'return', reason, reasonCode, items = [], evidenceUrls = [], refundUpi = null }) {
    // D10: while the wallet is off a cash refund is paid to a UPI ID; the
    // customer may give one now (it can also be taken when paying).
    const upi = refundUpi === null || refundUpi === undefined || refundUpi === '' ? null : String(refundUpi).trim();
    if (upi && !require('../../../services/refundPayouts.service').validUpi(upi)) {
      throw new Error('refundUpi is required to be a UPI ID like name@bank');
    }
    const code = reasonCode ? String(reasonCode) : 'other';
    if (!REASONS.includes(code)) throw new Error(`reasonCode is required and must be one of: ${REASONS.join(', ')}`);
    const words = reason === undefined || reason === null ? '' : String(reason).trim();
    if (!orderId || (!words && code === 'other')) {
      throw new Error('orderId and reason are required');
    }
    if (words.length > 1000) throw new Error('reason is required to be at most 1000 characters');
    if (!RETURN_TYPES.includes(returnType)) throw new Error(`returnType is required to be one of: ${RETURN_TYPES.join(', ')}`);
    const photos = Array.isArray(evidenceUrls) ? evidenceUrls.map((u) => String(u).trim()) : [];
    // A web link, or the path POST /upload answers with for a public file
    // (/uploads/returns/…); nothing else (no javascript:, no other site's path).
    const isPhotoLink = (u) => (/^https?:\/\//i.test(u) || /^\/uploads\/[A-Za-z0-9._\/-]+$/.test(u)) && !u.includes("..") && u.length <= 2000;
    if (photos.length > MAX_PHOTOS || photos.some((u) => !isPhotoLink(u))) {
      throw new Error(`evidenceUrls are required to be up to ${MAX_PHOTOS} web links to photos`);
    }

    const order = await queryOne(
      'SELECT id, user_id, shop_id, order_status, status, total_amount, payment_method, delivered_at, created_at FROM orders WHERE id = $1',
      [String(orderId)]
    );
    if (!order) throw new Error('Order not found');
    if (String(order.user_id) !== String(userId)) throw new Error('You can only submit returns for your own orders');

    const currentStatus = String(order.order_status || order.status || '').toLowerCase();
    if (currentStatus !== 'delivered') {
      throw new Error(`Cannot return order in '${currentStatus}' status. Order must be delivered.`);
    }

    // The window the product page states (services/catalogRules.js).
    const shop = await queryOne('SELECT category FROM local_shops WHERE id = $1', [order.shop_id]);
    const windowHours = require('../../../services/catalogRules').returnWindowHours(shop?.category);
    const deliveredTimestamp = order.delivered_at || order.created_at;
    const elapsedHours = (Date.now() - new Date(deliveredTimestamp).getTime()) / (1000 * 60 * 60);
    if (elapsedHours > windowHours) throw new Error(`Return window of ${windowHours} hours has expired for this order`);

    const existing = await queryOne(
      "SELECT id, status FROM order_returns WHERE order_id = $1 AND status != 'rejected' LIMIT 1",
      [String(orderId)]
    );
    if (existing) throw new Error(`A return request (${existing.status}) is already on file for this order`);

    const returnId = crypto.randomUUID();
    const refundAmount = Number(order.total_amount || 0);
    await query(
      `INSERT INTO order_returns
         (id, order_id, user_id, shop_id, return_type, reason, reason_code, items, evidence_urls, refund_amount, refund_upi, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending_review', ${NOW}, ${NOW})`,
      [returnId, String(orderId), order.user_id, order.shop_id, returnType, words || code, code,
        JSON.stringify(Array.isArray(items) ? items : []), JSON.stringify(photos), refundAmount, upi]
    );
    await query(`UPDATE orders SET return_status = 'return_requested', updated_at = ${NOW} WHERE id = $1`, [String(orderId)]);

    // The shop hears about it too.
    try {
      await require('../../core/services/notification.service').sendToShopOwner(order.shop_id, {
        type: 'return_update', title: 'Return requested',
        body: `A customer asked to ${returnType === 'replacement' ? 'replace' : 'return'} order #${String(orderId).slice(0, 8).toUpperCase()}.`,
        data: { orderId: String(orderId), returnId }, actionUrl: '/shop-dashboard',
      });
    } catch { /* never block the request */ }

    return {
      id: returnId, orderId: String(orderId), returnType, reasonCode: code, refundAmount,
      status: 'pending_review', windowHours, createdAt: new Date().toISOString(),
    };
  }

  /** Returns waiting for (or past) review: all shops for an admin, one shop for its seller. */
  async getPendingReturns({ status = 'pending_review', shopId, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }
    if (shopId) {
      params.push(shopId);
      conditions.push(`r.shop_id = $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit) || 50, Number(offset) || 0);
    const limitClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const rows = await query(
      `SELECT r.id, r.order_id, r.user_id, r.shop_id, r.return_type, r.reason, r.reason_code,
              r.items, r.evidence_urls, r.refund_amount, r.status, r.rejection_reason,
              r.verified_by, r.verified_role, r.verification_notes, r.verified_at,
              r.refund_channel, r.refund_reference_id, r.created_at,
              s.name AS shop_name, u.full_name AS customer_name, u.phone_number AS customer_phone,
              o.payment_method, o.total_amount AS order_total
         FROM order_returns r
         LEFT JOIN local_shops s ON s.id = r.shop_id
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN orders o ON o.id = r.order_id
        ${whereClause}
        ORDER BY r.created_at DESC
        ${limitClause}`,
      params
    );
    return (rows.rows || rows || []).map(present);
  }

  /** A customer's own returns, newest first (C10: status they can follow). */
  async getCustomerReturns(userId) {
    const rows = await query(
      `SELECT r.id, r.order_id, r.return_type, r.reason, r.reason_code, r.evidence_urls, r.refund_amount, r.status,
              r.rejection_reason, r.refund_channel, r.refund_reference_id, r.refund_upi, r.created_at, r.verified_at,
              s.name AS shop_name, rp.status AS payout_status, rp.reference AS payout_reference
         FROM order_returns r
         LEFT JOIN local_shops s ON s.id = r.shop_id
         LEFT JOIN refund_payouts rp ON rp.source_type = 'return' AND rp.source_id = r.id
        WHERE CAST(r.user_id AS TEXT) = $1
        ORDER BY r.created_at DESC
        LIMIT 100`,
      [String(userId)]
    );
    return (rows.rows || rows || []).map(present);
  }

  /** Whether this person may decide this return: an administrator, or the shop's own seller. */
  async canReview(user, returnRecord) {
    if (isAdmin(user)) return true;
    const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [returnRecord.shop_id]);
    return Boolean(shop && String(shop.owner_id) === String(user.id || user.userId));
  }

  /**
   * Approve (refund) or reject a return. The request is claimed first, so of
   * two reviewers only one acts.
   */
  async verifyAndProcessReturn({ returnId, adminUser, action, rejectionReason = '', notes = '' }) {
    if (!['approve', 'reject'].includes(action)) throw new Error("action must be 'approve' or 'reject'");

    const returnRecord = await queryOne('SELECT * FROM order_returns WHERE id = $1', [returnId]);
    if (!returnRecord) throw new Error('Return request not found');
    if (!(await this.canReview(adminUser, returnRecord))) {
      throw new ReturnError(403, 'Only an administrator or this shop can decide this return');
    }
    if (returnRecord.status !== 'pending_review') {
      throw new Error(`Return request has already been acted upon (current status: ${returnRecord.status})`);
    }
    const order = await queryOne('SELECT * FROM orders WHERE id = $1', [returnRecord.order_id]);
    if (!order) throw new Error('Order not found');

    const reviewerRole = isAdmin(adminUser) ? (adminUser.role || 'admin') : 'shop_owner';
    const reviewerId = adminUser.id || adminUser.userId;

    if (action === 'reject') {
      if (!rejectionReason || !rejectionReason.trim()) throw new Error('rejectionReason is mandatory when rejecting a return');
      const claimed = await query(
        `UPDATE order_returns
            SET status = 'rejected', rejection_reason = $1, verified_by = $2, verified_role = $3,
                verification_notes = $4, verified_at = ${NOW}, updated_at = ${NOW}
          WHERE id = $5 AND status = 'pending_review'`,
        [rejectionReason.trim(), reviewerId, reviewerRole, notes || null, returnId]
      );
      if (!changed(claimed)) throw new Error('Return request has already been acted upon');
      await query(`UPDATE orders SET return_status = 'return_rejected', updated_at = ${NOW} WHERE id = $1`, [returnRecord.order_id]);
      await notifyCustomer(returnRecord.user_id, returnRecord.order_id, 'Return not accepted', rejectionReason.trim());
      return { success: true, status: 'rejected', returnId, rejectionReason: rejectionReason.trim() };
    }

    const refundAmount = Number(returnRecord.refund_amount || order.total_amount || 0);
    const refundPaise = Math.round(refundAmount * 100);
    const method = String(order.payment_method || '').toLowerCase();
    const toWallet = method === 'cod' || method === 'wallet' || method === 'cash';
    const payouts = require('../../../services/refundPayouts.service');
    // Not through the gateway: the wallet while it is on, a manual payout
    // while it is off (Decision D10).
    const offGateway = toWallet ? (payouts.walletEnabled() ? 'wallet' : 'manual_payout') : null;
    const refundChannel = offGateway || 'source_gateway';

    // Claim, credit (wallet) and record in one transaction.
    await withTransaction(async (client) => {
      const claimed = await client.query(
        `UPDATE order_returns
            SET status = 'verified_approved', verified_by = $1, verified_role = $2, verification_notes = $3,
                verified_at = ${NOW}, refund_channel = $4, refund_reference_id = $5, updated_at = ${NOW}
          WHERE id = $6 AND status = 'pending_review'`,
        [reviewerId, reviewerRole, notes || null, refundChannel, offGateway === 'wallet' ? `wallet:${returnId}` : null, returnId]
      );
      if (!changed(claimed)) throw new Error('Return request has already been acted upon');

      if (toWallet) {
        const out = await payouts.refundCustomer({
          client, orderId: returnRecord.order_id, userId: returnRecord.user_id, amount: refundAmount,
          purpose: 'return_refund', sourceType: 'return', sourceId: returnId, payeeUpi: returnRecord.refund_upi,
        });
        const settled = out.channel === 'wallet';
        await client.query(
          `UPDATE orders SET return_status = $1, payment_status = $2, updated_at = ${NOW} WHERE id = $3`,
          [settled ? 'refunded' : 'refund_pending', settled ? 'refunded' : 'refund_pending', returnRecord.order_id]
        );
      } else {
        // Sent to Razorpay after the commit: a gateway call cannot be rolled back.
        await client.query(
          `UPDATE orders SET return_status = 'refund_pending', payment_status = 'refund_pending', updated_at = ${NOW} WHERE id = $1`,
          [returnRecord.order_id]
        );
      }
    });

    if (refundPaise > 0) {
      try {
        if (offGateway === 'wallet') {
          await ledgerService.recordTransaction({
            referenceType: 'ORDER_REFUND', referenceId: returnRecord.order_id,
            postingKey: `RETURN_REFUND:${returnId}`,
            description: `Refund to wallet for return #${returnId}`,
            entries: [
              { entryType: 'DEBIT', accountType: 'SELLER_PAYABLE', accountId: returnRecord.shop_id, amountPaise: refundPaise },
              { entryType: 'CREDIT', accountType: 'CUSTOMER_WALLET', accountId: returnRecord.user_id, amountPaise: refundPaise },
            ],
          });
        } else {
          await ledgerService.recordOrderRefund({ orderId: returnRecord.order_id, shopId: returnRecord.shop_id, refundAmountPaise: refundPaise, reason: `return ${returnId}`, postingKey: `RETURN_REFUND:${returnId}` });
        }
      } catch (ledgerErr) {
        logger.warn(`⚠️ Ledger logging notice for return ${returnId}: ${ledgerErr.message}`);
      }
    }

    if (offGateway === 'wallet') {
      await notifyCustomer(returnRecord.user_id, returnRecord.order_id, 'Return accepted: refunded to your wallet', `₹${refundAmount} is in your LocalSampark wallet.`);
      return {
        success: true, status: 'refund_completed', returnId, orderId: returnRecord.order_id,
        refundAmount, refundChannel, refundReferenceId: `wallet:${returnId}`, verifiedBy: reviewerId, verifiedRole: reviewerRole,
      };
    }
    if (offGateway === 'manual_payout') {
      await notifyCustomer(returnRecord.user_id, returnRecord.order_id, 'Return accepted: refund on its way',
        returnRecord.refund_upi
          ? `₹${refundAmount} will be sent to ${returnRecord.refund_upi}. We will tell you when it is sent.`
          : `₹${refundAmount} will be refunded to you; our team will contact you for your UPI ID.`);
      return {
        success: true, status: 'refund_pending', returnId, orderId: returnRecord.order_id,
        refundAmount, refundChannel, refundReferenceId: null, verifiedBy: reviewerId, verifiedRole: reviewerRole,
      };
    }

    const gateway = await require('../../../services/orderLifecycle.service').refundThroughGateway(returnRecord.order_id);
    if (gateway.refunded) {
      await query(`UPDATE order_returns SET refund_reference_id = $1, updated_at = ${NOW} WHERE id = $2`, [gateway.refundId, returnId]);
      await query(`UPDATE orders SET return_status = 'refunded', updated_at = ${NOW} WHERE id = $1`, [returnRecord.order_id]);
      await notifyCustomer(returnRecord.user_id, returnRecord.order_id, 'Return accepted: refund sent', `₹${refundAmount} is on its way back to your original payment method.`);
    } else {
      await notifyCustomer(returnRecord.user_id, returnRecord.order_id, 'Return accepted: refund pending', `Your refund of ₹${refundAmount} to your original payment method is being processed.`);
    }
    return {
      success: true,
      status: gateway.refunded ? 'refund_completed' : 'refund_pending',
      returnId, orderId: returnRecord.order_id, refundAmount, refundChannel,
      refundReferenceId: gateway.refunded ? gateway.refundId : null,
      refundPendingReason: gateway.refunded ? undefined : gateway.reason,
      verifiedBy: reviewerId, verifiedRole: reviewerRole,
    };
  }
}

const service = new ReturnService();
service.ReturnError = ReturnError;
service.REASON_CODES = REASONS;
module.exports = service;

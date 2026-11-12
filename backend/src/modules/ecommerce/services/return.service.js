const crypto = require('crypto');
const { query, queryOne, withTransaction } = require('../../../config/database');
const ledgerService = require('../../../services/ledger.service');
const logger = require('../../../config/logger');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

class ReturnService {
  /**
   * Submits a customer return / replacement request.
   */
  async submitReturnRequest({ orderId, userId, returnType = 'return', reason, items = [], evidenceUrls = [] }) {
    if (!orderId || !reason) {
      throw new Error('orderId and reason are required');
    }

    const order = await queryOne(
      'SELECT id, user_id, shop_id, order_status, status, total_amount, payment_method, delivered_at, created_at FROM orders WHERE id = $1',
      [String(orderId)]
    );

    if (!order) {
      throw new Error('Order not found');
    }

    if (String(order.user_id) !== String(userId)) {
      throw new Error('You can only submit returns for your own orders');
    }

    const currentStatus = String(order.order_status || order.status || '').toLowerCase();
    if (currentStatus !== 'delivered') {
      throw new Error(`Cannot return order in '${currentStatus}' status. Order must be delivered.`);
    }

    // Check category-aware return window (48h for food/grocery/perishable; 7 days for retail)
    const shop = await queryOne('SELECT category FROM local_shops WHERE id = $1', [order.shop_id]);
    // The window the product page states (services/catalogRules.js).
    const windowHours = require('../../../services/catalogRules').returnWindowHours(shop?.category);

    const deliveredTimestamp = order.delivered_at || order.created_at;
    const elapsedHours = (Date.now() - new Date(deliveredTimestamp).getTime()) / (1000 * 60 * 60);

    if (elapsedHours > windowHours) {
      throw new Error(`Return window of ${windowHours} hours has expired for this order`);
    }

    // Check if an active return is already pending
    const existing = await queryOne(
      "SELECT id, status FROM order_returns WHERE order_id = $1 AND status != 'rejected' LIMIT 1",
      [String(orderId)]
    );
    if (existing) {
      throw new Error(`A return request (${existing.status}) is already on file for this order`);
    }

    const returnId = crypto.randomUUID();
    const refundAmount = Number(order.total_amount || 0);
    const itemsJson = JSON.stringify(Array.isArray(items) ? items : []);
    const evidenceJson = JSON.stringify(Array.isArray(evidenceUrls) ? evidenceUrls : []);

    await query(
      `INSERT INTO order_returns
         (id, order_id, user_id, shop_id, return_type, reason, items, evidence_urls, refund_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_review', ${NOW}, ${NOW})`,
      [returnId, String(orderId), order.user_id, order.shop_id, returnType, String(reason).trim(), itemsJson, evidenceJson, refundAmount]
    );

    await query(
      `UPDATE orders SET return_status = 'return_requested', updated_at = ${NOW} WHERE id = $1`,
      [String(orderId)]
    );

    return {
      id: returnId,
      orderId: String(orderId),
      returnType,
      refundAmount,
      status: 'pending_review',
      windowHours,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves returns pending administrative or franchise review.
   */
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
      `SELECT r.id, r.order_id, r.user_id, r.shop_id, r.return_type, r.reason,
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

    const list = (rows.rows || rows || []).map((row) => {
      let parsedItems = [];
      let parsedEvidence = [];
      try { parsedItems = typeof row.items === 'string' ? JSON.parse(row.items) : row.items || []; } catch {}
      try { parsedEvidence = typeof row.evidence_urls === 'string' ? JSON.parse(row.evidence_urls) : row.evidence_urls || []; } catch {}
      return {
        ...row,
        items: parsedItems,
        evidence_urls: parsedEvidence
      };
    });

    return list;
  }

  /**
   * Multi-tier review and verification action (Super Admin, Territory Admin, Franchise Owner).
   */
  async verifyAndProcessReturn({ returnId, adminUser, action, rejectionReason = '', notes = '' }) {
    if (!['approve', 'reject'].includes(action)) {
      throw new Error("action must be 'approve' or 'reject'");
    }

    const returnRecord = await queryOne('SELECT * FROM order_returns WHERE id = $1', [returnId]);
    if (!returnRecord) {
      throw new Error('Return request not found');
    }

    if (returnRecord.status !== 'pending_review') {
      throw new Error(`Return request has already been acted upon (current status: ${returnRecord.status})`);
    }

    const order = await queryOne('SELECT * FROM orders WHERE id = $1', [returnRecord.order_id]);
    if (!order) {
      throw new Error('Order not found');
    }

    const adminRole = adminUser.role || 'admin';
    const adminId = adminUser.id || adminUser.userId;

    if (action === 'reject') {
      if (!rejectionReason || !rejectionReason.trim()) {
        throw new Error('rejectionReason is mandatory when rejecting a return');
      }

      await query(
        `UPDATE order_returns
            SET status = 'rejected', rejection_reason = $1, verified_by = $2, verified_role = $3,
                verification_notes = $4, verified_at = ${NOW}, updated_at = ${NOW}
          WHERE id = $5`,
        [rejectionReason.trim(), adminId, adminRole, notes || null, returnId]
      );

      await query(
        `UPDATE orders SET return_status = 'return_rejected', updated_at = ${NOW} WHERE id = $1`,
        [returnRecord.order_id]
      );

      return {
        success: true,
        status: 'rejected',
        returnId,
        rejectionReason: rejectionReason.trim()
      };
    }

    // Action: Approve & Process Hybrid Refund
    const refundAmount = Number(returnRecord.refund_amount || order.total_amount || 0);
    const refundPaise = Math.round(refundAmount * 100);
    const isCod = String(order.payment_method || '').toLowerCase() === 'cod';
    const refundChannel = isCod ? 'wallet' : 'source_gateway';
    const refundReferenceId = isCod
      ? `WAL-RFND-${Date.now().toString().slice(-8)}`
      : `GW-RFND-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Execute refund disbursal
    if (isCod) {
      // Credit Customer Wallet
      let wallet = await queryOne('SELECT id, balance FROM wallets WHERE user_id = $1', [returnRecord.user_id]);
      if (!wallet) {
        const walletId = crypto.randomUUID();
        await query(
          `INSERT INTO wallets (id, user_id, balance, currency, created_at, updated_at)
           VALUES ($1, $2, $3, 'INR', ${NOW}, ${NOW})`,
          [walletId, returnRecord.user_id, refundAmount]
        );
      } else {
        await query(
          `UPDATE wallets SET balance = balance + $1, updated_at = ${NOW} WHERE id = $2`,
          [refundAmount, wallet.id]
        );
      }

      // Record wallet transaction
      const activeWallet = wallet || (await queryOne('SELECT id FROM wallets WHERE user_id = $1', [returnRecord.user_id]));
      if (activeWallet) {
        await query(
          `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, reference_id, status, created_at)
           VALUES ($1, $2, $3, 'credit', 'refund', $4, 'completed', ${NOW})`,
          [crypto.randomUUID(), activeWallet.id, refundAmount, returnRecord.order_id]
        );
      }
    }

    // Record double-entry ledger entries if amounts > 0
    if (refundPaise > 0) {
      try {
        await ledgerService.recordTransaction({
          referenceType: 'ORDER_REFUND',
          referenceId: returnRecord.order_id,
          description: `Verified refund for return #${returnId} (${refundChannel})`,
          entries: [
            { entryType: 'DEBIT', accountType: 'SELLER_PAYABLE', accountId: returnRecord.shop_id, amountPaise: refundPaise },
            { entryType: 'CREDIT', accountType: 'CUSTOMER_WALLET', accountId: returnRecord.user_id, amountPaise: refundPaise }
          ]
        });
      } catch (ledgerErr) {
        logger.warn(`⚠️ Ledger logging notice for return ${returnId}: ${ledgerErr.message}`);
      }
    }

    // Update order_returns and orders status
    await query(
      `UPDATE order_returns
          SET status = 'verified_approved', verified_by = $1, verified_role = $2,
              verification_notes = $3, verified_at = ${NOW}, refund_channel = $4,
              refund_reference_id = $5, updated_at = ${NOW}
        WHERE id = $6`,
      [adminId, adminRole, notes || null, refundChannel, refundReferenceId, returnId]
    );

    await query(
      `UPDATE orders
          SET return_status = 'refunded', payment_status = 'refunded', updated_at = ${NOW}
        WHERE id = $1`,
      [returnRecord.order_id]
    );

    return {
      success: true,
      status: 'refund_completed',
      returnId,
      orderId: returnRecord.order_id,
      refundAmount,
      refundChannel,
      refundReferenceId,
      verifiedBy: adminId,
      verifiedRole: adminRole
    };
  }
}

module.exports = new ReturnService();

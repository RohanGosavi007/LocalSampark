/**
 * ═══════════════════════════════════════════════════════════════════════
 * Payout Reconciliation Service
 * 10x Plan: Section 20.2.3 — Automated Payout Engine
 * ═══════════════════════════════════════════════════════════════════════
 */
const { query, queryOne, queryMany, withTransaction } = require('../config/database');
const logger = require('../config/logger');
const crypto = require('crypto');

class PayoutService {

  /**
   * Calculate payouts for all shops for a given period
   */
  static async calculatePayouts(periodStart, periodEnd) {
    const shops = await queryMany(
      `SELECT DISTINCT ls.id as shop_id, ls.name as shop_name, ls.category,
              COALESCE(ls.commission_rate, 10.0) as commission_rate
       FROM orders o
       JOIN local_shops ls ON o.shop_id = ls.id
       WHERE o.order_status = 'delivered'
         AND o.delivered_at IS NOT NULL
         AND o.created_at >= $1 AND o.created_at < $2`,
      [periodStart, periodEnd]
    );

    const payouts = [];

    for (const shop of shops) {
      try {
        const payout = await this.calculateShopPayout(shop.shop_id, periodStart, periodEnd, shop.commission_rate);
        payouts.push(payout);
      } catch (error) {
        logger.error(`Payout calculation failed for shop ${shop.shop_id}: ${error.message}`);
      }
    }

    logger.info(`💰 Calculated ${payouts.length} payouts for period ${periodStart} → ${periodEnd}`);
    return payouts;
  }

  /**
   * Calculate payout for a single shop
   */
  static async calculateShopPayout(shopId, periodStart, periodEnd, commissionRate = 10.0) {
    // Get all delivered orders in the period
    const orders = await queryMany(
      `SELECT id, total_amount, delivery_fee, payment_method
       FROM orders
       WHERE shop_id = $1
         AND order_status = 'delivered'
         AND created_at >= $2 AND created_at < $3`,
      [shopId, periodStart, periodEnd]
    );

    if (orders.length === 0) return null;

    // Calculate financials
    const grossGMV = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalDeliveryFees = orders.reduce((sum, o) => sum + parseFloat(o.delivery_fee || 0), 0);
    const orderAmount = grossGMV - totalDeliveryFees;

    const platformCommission = orderAmount * (commissionRate / 100);
    const paymentGatewayFee = grossGMV * 0.02; // 2% Razorpay fee
    const gstOnCommission = platformCommission * 0.18; // 18% GST on commission
    const tdsDeducted = platformCommission > 50000 ? platformCommission * 0.01 : 0; // 1% TDS above ₹50K
    const netPayout = grossGMV - platformCommission - paymentGatewayFee - gstOnCommission - tdsDeducted;

    // Create payout record
    const payoutId = crypto.randomUUID();
    await query(
      `INSERT INTO shop_payouts (id, shop_id, period_start, period_end,
        gross_gmv, total_orders, platform_commission, commission_rate,
        payment_gateway_fee, delivery_deductions, gst_on_commission,
        tds_deducted, net_payout, payout_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'calculated')`,
      [payoutId, shopId, periodStart, periodEnd,
       grossGMV.toFixed(2), orders.length, platformCommission.toFixed(2), commissionRate,
       paymentGatewayFee.toFixed(2), totalDeliveryFees.toFixed(2), gstOnCommission.toFixed(2),
       tdsDeducted.toFixed(2), netPayout.toFixed(2)]
    );

    // Create line items for audit trail
    for (const order of orders) {
      const lineId = crypto.randomUUID();
      const orderAmt = parseFloat(order.total_amount);
      const lineCommission = orderAmt * (commissionRate / 100);
      const lineGateway = orderAmt * 0.02;
      const lineNet = orderAmt - lineCommission - lineGateway;

      await query(
        `INSERT INTO payout_line_items (id, payout_id, order_id, order_amount, commission_amount, gateway_fee, net_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [lineId, payoutId, order.id, orderAmt.toFixed(2), lineCommission.toFixed(2), lineGateway.toFixed(2), lineNet.toFixed(2)]
      );
    }

    return {
      payoutId,
      shopId,
      grossGMV: parseFloat(grossGMV.toFixed(2)),
      totalOrders: orders.length,
      platformCommission: parseFloat(platformCommission.toFixed(2)),
      paymentGatewayFee: parseFloat(paymentGatewayFee.toFixed(2)),
      gstOnCommission: parseFloat(gstOnCommission.toFixed(2)),
      tdsDeducted: parseFloat(tdsDeducted.toFixed(2)),
      netPayout: parseFloat(netPayout.toFixed(2)),
    };
  }

  /**
   * Get payout history for a shop
   */
  static async getShopPayouts(shopId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const payouts = await queryMany(
      `SELECT * FROM shop_payouts WHERE shop_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [shopId, limit, offset]
    );
    const total = await queryOne(
      `SELECT COUNT(*) as cnt FROM shop_payouts WHERE shop_id = $1`, [shopId]
    );
    return { payouts, total: total ? parseInt(total.cnt) : 0, page, limit };
  }

  /**
   * Get payout details with line items
   */
  static async getPayoutDetails(payoutId) {
    const payout = await queryOne(`SELECT * FROM shop_payouts WHERE id = $1`, [payoutId]);
    if (!payout) return null;

    const lineItems = await queryMany(
      `SELECT pli.*, o.created_at as order_date, o.payment_method
       FROM payout_line_items pli
       LEFT JOIN orders o ON pli.order_id = o.id
       WHERE pli.payout_id = $1
       ORDER BY o.created_at ASC`,
      [payoutId]
    );

    return { ...payout, lineItems };
  }

  /**
   * Approve a calculated payout (admin action)
   */
  static async approvePayout(payoutId, adminId) {
    const payout = await queryOne(`SELECT * FROM shop_payouts WHERE id = $1`, [payoutId]);
    if (!payout) throw new Error('Payout not found');
    if (payout.payout_status !== 'calculated') {
      throw new Error(`Cannot approve payout in status: ${payout.payout_status}`);
    }

    await query(
      `UPDATE shop_payouts SET payout_status = 'approved', approved_by = $1, approved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = $2`,
      [adminId, payoutId]
    );

    logger.info(`💰 Payout ${payoutId} approved by admin ${adminId}`);
    return { payoutId, status: 'approved' };
  }

  /**
   * Mark payout as initiated (after bank transfer trigger)
   */
  static async markPayoutInitiated(payoutId, reference) {
    await query(
      `UPDATE shop_payouts SET payout_status = 'initiated', payout_reference = $1, updated_at = datetime('now')
       WHERE id = $2`,
      [reference, payoutId]
    );
  }

  /**
   * Mark payout as completed (webhook confirmation)
   */
  static async markPayoutCompleted(payoutId) {
    await query(
      `UPDATE shop_payouts SET payout_status = 'completed', paid_at = datetime('now'), updated_at = datetime('now')
       WHERE id = $1`,
      [payoutId]
    );
  }
}

module.exports = PayoutService;

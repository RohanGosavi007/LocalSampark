/**
 * ═══════════════════════════════════════════════════════════════════════
 * Shop settlement
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Squaring up with a shop for the orders delivered in a period. Money can be
 * in three places when an order is delivered, and the settlement depends on
 * which:
 *
 *   paid online or from the wallet     the platform holds it → it owes the shop
 *   cash, collected by a platform      the rider holds it for the platform
 *   rider                              → the platform owes the shop
 *   cash, collected by the shop        the shop holds all of it, the platform's
 *   (pickup, or its own delivery)      share included → the shop owes the platform
 *
 * For every order, whichever of those it was:
 *
 *   the shop earns      the items
 *                     + the delivery charge, if the shop delivered it itself
 *                       (a platform rider's delivery charge is the platform's:
 *                       it pays the rider out of it)
 *   the platform takes  commission on the items, at the rate fixed when the
 *                       order was placed, plus the shop's per-order fee
 *                     + GST on that commission
 *                     + the payment gateway's cost, on an order paid online
 *   the shop has        the order total, if it collected the cash
 *   already received
 *
 * The platform fee and small-order fee are the platform's own charges to the
 * customer. They never enter the shop's earnings; a shop that collected cash
 * collected them too, which is why its line comes out negative by that much
 * more.
 *
 * A period can come out negative — a shop that mostly takes cash at the
 * counter owes more commission than the platform owes it. That payout is
 * recorded as dues and deducted from the shop's next payout rather than lost.
 *
 * The previous version charged commission on the delivery fee, never paid out
 * a cash order (nor collected commission on one), and before that read a
 * column that does not exist and so never calculated anything.
 */
const { query, queryOne, queryMany, withTransaction } = require('../config/database');
const logger = require('../config/logger');
const crypto = require('crypto');
const commission = require('./commission.service');
const platformConfig = require('./platformConfig.service');
const ledger = require('./ledger.service');

// An order ready to be settled: delivered, paid — by whatever route — and not
// yet in any payout. `o` is the orders alias.
const SETTLEABLE = `LOWER(o.order_status) = 'delivered'
          AND o.delivered_at IS NOT NULL
          AND LOWER(COALESCE(o.payment_status, '')) = 'paid'
          AND NOT EXISTS (SELECT 1 FROM payout_line_items pli WHERE pli.order_id = o.id)`;

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
// What is written to the monetary columns: always two decimal places.
const fixed = (value) => money(value).toFixed(2);
const lower = (value) => String(value || '').toLowerCase();

/** Who was holding the customer's money when the order was delivered. */
function collectedBy(order) {
  if (lower(order.payment_method) !== 'cod') return 'platform';
  if (lower(order.cash_collected_by) === 'shop') return 'shop';
  if (lower(order.cash_collected_by) === 'rider') return 'rider';
  // A cash order from before collection was recorded: with a platform rider
  // the rider took the cash, otherwise the shop did.
  return order.assigned_agent_id ? 'rider' : 'shop';
}

/**
 * One order's settlement. `terms` is { percent, convenienceFee } — the rate
 * fixed on the order when it was placed. `config` is the platform settings.
 */
function settleOrder(order, terms, config) {
  const total = Number(order.total_amount) || 0;
  const deliveryFee = Number(order.delivery_fee) || 0;
  const platformFees = (Number(order.platform_fee) || 0) + (Number(order.small_order_fee) || 0);
  // Orders placed before `subtotal` was recorded: the items are what is left
  // of the total once the charges are taken off (a discount was the platform's).
  const items = order.subtotal === null || order.subtotal === undefined
    ? Math.max(0, total + (Number(order.discount) || 0) - deliveryFee - platformFees)
    : Number(order.subtotal) || 0;

  const holder = collectedBy(order);
  const shopDelivered = lower(order.fulfillment_method) !== 'pickup' && !order.assigned_agent_id;
  const shopDeliveryFee = shopDelivered ? deliveryFee : 0;

  const sales = money(items + shopDeliveryFee);
  const commissionAmount = money(items * (terms.percent / 100) + (terms.convenienceFee || 0));
  const gst = money(commissionAmount * (config.gst_on_commission_percent / 100));
  // The gateway's cost is charged on what went through the gateway for the
  // shop. A wallet or cash order did not go through it at all.
  const gatewayFee = lower(order.payment_method) === 'razorpay' ? money(sales * (config.gateway_fee_percent / 100)) : 0;
  const shopHolds = holder === 'shop' ? money(total) : 0;

  return {
    orderId: order.id,
    collectedBy: holder,
    items: money(items),
    sales,
    commissionAmount,
    gst,
    gatewayFee,
    shopHolds,
    platformFeesHeldByShop: holder === 'shop' ? money(platformFees) : 0,
    shopDelivered,
    net: money(sales - commissionAmount - gst - gatewayFee - shopHolds),
  };
}

class PayoutService {

  /** Settle every shop that has orders delivered in the period. */
  static async calculatePayouts(periodStart, periodEnd) {
    const shops = await queryMany(
      `SELECT DISTINCT ls.id AS shop_id
         FROM orders o
         JOIN local_shops ls ON o.shop_id = ls.id
        WHERE ${SETTLEABLE}
          AND o.delivered_at >= $1 AND o.delivered_at < $2`,
      [periodStart, periodEnd]
    );

    const payouts = [];

    for (const shop of shops) {
      try {
        const payout = await this.calculateShopPayout(shop.shop_id, periodStart, periodEnd);
        payouts.push(payout);
      } catch (error) {
        logger.error(`Payout calculation failed for shop ${shop.shop_id}: ${error.message}`);
      }
    }

    logger.info(`💰 Calculated ${payouts.filter(Boolean).length} payouts for period ${periodStart} → ${periodEnd}`);
    return payouts;
  }

  /**
   * The commission a shop is charged today, as a percentage: its own rate,
   * else its category's, else the platform default. Orders carry the rate
   * they were placed at; this is for an order that has none recorded.
   */
  static async commissionRateFor(shopId) {
    return commission.rateForShopId(shopId);
  }

  /**
   * Settle one shop for a period. Returns null when there is nothing to
   * settle. The payout row, its lines and the dues it absorbs are written
   * together.
   *
   * `commissionRate`, when given, overrides the rate for orders that have
   * none of their own recorded.
   */
  static async calculateShopPayout(shopId, periodStart, periodEnd, commissionRate) {
    const orders = await queryMany(
      `SELECT o.id, o.total_amount, o.subtotal, o.discount, o.delivery_fee, o.platform_fee, o.small_order_fee,
              o.payment_method, o.cash_collected_by, o.assigned_agent_id, o.fulfillment_method, o.commission_percent,
              sc.commission_percent AS locked_percent, sc.convenience_fee AS locked_convenience_fee
         FROM orders o
         LEFT JOIN shop_commissions sc ON CAST(sc.order_id AS TEXT) = CAST(o.id AS TEXT) AND sc.order_type = 'product_order'
        WHERE o.shop_id = $1
          AND ${SETTLEABLE}
          AND o.delivered_at >= $2 AND o.delivered_at < $3`,
      [shopId, periodStart, periodEnd]
    );

    if (orders.length === 0) return null;

    const config = await platformConfig.all();
    const usable = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    let fallbackRate = null;
    const rateWhenUnrecorded = async () => {
      if (fallbackRate === null) {
        fallbackRate = usable(commissionRate) ? Number(commissionRate) : await this.commissionRateFor(shopId);
      }
      return fallbackRate;
    };

    const lines = [];
    for (const order of orders) {
      let percent;
      if (usable(order.locked_percent)) percent = Number(order.locked_percent);
      else if (usable(order.commission_percent)) percent = Number(order.commission_percent);
      else percent = await rateWhenUnrecorded();
      lines.push(settleOrder(order, { percent, convenienceFee: Number(order.locked_convenience_fee) || 0 }, config));
    }

    const sum = (pick) => money(lines.reduce((total, line) => total + pick(line), 0));
    const grossSales = sum((l) => l.sales);
    const itemSales = sum((l) => l.items);
    const platformCommission = sum((l) => l.commissionAmount);
    const gstOnCommission = sum((l) => l.gst);
    const paymentGatewayFee = sum((l) => l.gatewayFee);
    const shopCollected = sum((l) => l.shopHolds);
    const platformFeesDue = sum((l) => l.platformFeesHeldByShop);
    // Tax deducted at source on the shop's sales through the platform
    // (Income-tax Act s.194-O). The rate is a platform setting; confirm it,
    // and whether a given shop is exempt, with the platform's accountant.
    const tdsDeducted = money(itemSales * (config.tds_on_sales_percent / 100));

    // Dues from earlier periods that came out negative and have not yet been
    // taken off a payout.
    const owed = await queryMany(
      "SELECT id, net_payout FROM shop_payouts WHERE shop_id = $1 AND payout_status = 'dues' AND absorbed_into IS NULL",
      [shopId]
    );
    const carriedDues = money(owed.reduce((total, row) => total + Math.abs(Number(row.net_payout) || 0), 0));

    const netPayout = money(grossSales - platformCommission - gstOnCommission - paymentGatewayFee - tdsDeducted - shopCollected - carriedDues);
    const status = netPayout < 0 ? 'dues' : 'calculated';
    const effectiveRate = itemSales > 0 ? money((platformCommission / itemSales) * 100) : 0;

    const payoutId = crypto.randomUUID();
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO shop_payouts (id, shop_id, period_start, period_end,
          gross_gmv, total_orders, total_deliveries, platform_commission, commission_rate,
          payment_gateway_fee, delivery_deductions, gst_on_commission,
          tds_deducted, net_payout, payout_status,
          shop_collected_amount, platform_fees_due, carried_dues)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [payoutId, shopId, periodStart, periodEnd,
          fixed(grossSales), orders.length, lines.filter((l) => l.shopDelivered).length, fixed(platformCommission), effectiveRate,
          // delivery_deductions: nothing is deducted for delivery. A platform
          // rider's delivery charge was never part of the shop's sales.
          fixed(paymentGatewayFee), fixed(0), fixed(gstOnCommission),
          fixed(tdsDeducted), fixed(netPayout), status,
          fixed(shopCollected), fixed(platformFeesDue), fixed(carriedDues)]
      );

      // Line items: the audit trail, and what marks an order as settled.
      for (const line of lines) {
        await client.query(
          `INSERT INTO payout_line_items (id, payout_id, order_id, order_amount, commission_amount, gateway_fee, net_amount, collected_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [crypto.randomUUID(), payoutId, line.orderId, fixed(line.sales), fixed(line.commissionAmount), fixed(line.gatewayFee), fixed(line.net), line.collectedBy]
        );
        await client.query(
          "UPDATE shop_commissions SET status = 'settled', settled_at = CURRENT_TIMESTAMP WHERE order_id = $1 AND status = 'pending'",
          [line.orderId]
        );
      }

      for (const row of owed) {
        await client.query(
          'UPDATE shop_payouts SET absorbed_into = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND absorbed_into IS NULL',
          [payoutId, row.id]
        );
      }
    });

    return {
      payoutId,
      shopId,
      status,
      grossGMV: grossSales,
      totalOrders: orders.length,
      platformCommission,
      paymentGatewayFee,
      gstOnCommission,
      tdsDeducted,
      shopCollected,
      platformFeesDue,
      carriedDues,
      netPayout,
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
   * Approve a calculated payout (admin action). A payout recorded as dues is
   * money the shop owes; there is nothing to approve or send.
   */
  static async approvePayout(payoutId, adminId) {
    const payout = await queryOne(`SELECT * FROM shop_payouts WHERE id = $1`, [payoutId]);
    if (!payout) throw new Error('Payout not found');
    if (payout.payout_status !== 'calculated') {
      throw new Error(`Cannot approve payout in status: ${payout.payout_status}`);
    }

    await query(
      `UPDATE shop_payouts SET payout_status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
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
      `UPDATE shop_payouts SET payout_status = 'initiated', payout_reference = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reference, payoutId]
    );
  }

  /**
   * Mark payout as completed (webhook confirmation) and book the disbursement
   * into the double-entry ledger (idempotent per payoutId).
   */
  static async markPayoutCompleted(payoutId) {
    return withTransaction(async (client) => {
      const payout = (await client.query(
        'SELECT id, shop_id, net_payout FROM shop_payouts WHERE id = $1',
        [payoutId]
      )).rows[0];

      await client.query(
        `UPDATE shop_payouts SET payout_status = 'completed', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [payoutId]
      );

      if (payout && Number(payout.net_payout) > 0) {
        await ledger.postSellerPayout(client, {
          payoutId: payout.id,
          shopId: payout.shop_id,
          amountPaise: Math.round(Number(payout.net_payout) * 100),
        });
      }
    });
  }
}

module.exports = PayoutService;
module.exports.settleOrder = settleOrder;
module.exports.collectedBy = collectedBy;

/**
 * ═══════════════════════════════════════════════════════════════════════
 * Payout Routes — Shop Settlement API
 * 10x Plan: Section 20.2.3 — Automated Payout Reconciliation
 * ═══════════════════════════════════════════════════════════════════════
 */
const express = require('express');
const router = express.Router();
const PayoutService = require('../../../services/payout.service');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireShopParam, isPlatformAdmin } = require('../../../middleware/shop-owner.middleware');
const logger = require('../../../config/logger');
const { recordAudit } = require('../../crm/services/adminAudit.service');

// Compared against 'ADMIN' / 'SUPER_ADMIN'; roles are stored lower case, so no
// administrator could calculate or approve a payout.
const requireAdmin = (req, res, next) => {
  if (!isPlatformAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/v1/shops/:shopId/payouts
 * Get payout history for a shop (vendor or admin)
 */
router.get('/:shopId/payouts', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const data = await PayoutService.getShopPayouts(shopId, parseInt(page), parseInt(limit));
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/shops/:shopId/payouts/:payoutId
 * Get detailed payout with line items
 */
router.get('/:shopId/payouts/:payoutId', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const data = await PayoutService.getPayoutDetails(req.params.payoutId);
    // The payout must be this shop's: owning one shop is not a pass to read
    // another's payout by its id.
    if (!data || (data.shop_id && String(data.shop_id) !== String(req.shop.id))) {
      return res.status(404).json({ error: 'Payout not found' });
    }
    res.json({ success: true, payout: data });
  } catch (error) { next(error); }
});

/**
 * POST /api/v1/admin/payouts/calculate
 * Trigger payout calculation for a period (admin only)
 */
router.post('/calculate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { period_start, period_end } = req.body;
    if (!period_start || !period_end) {
      return res.status(400).json({ error: 'period_start and period_end are required' });
    }

    const payouts = await PayoutService.calculatePayouts(period_start, period_end);
    res.json({
      success: true,
      message: `Calculated ${payouts.filter(Boolean).length} payouts`,
      payouts: payouts.filter(Boolean),
    });
  } catch (error) { next(error); }
});

/**
 * PUT /api/v1/admin/payouts/:payoutId/approve
 * Approve a calculated payout (admin only)
 */
router.put('/:payoutId/approve', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const adminId = req.user.id || req.user.userId;
    const result = await PayoutService.approvePayout(req.params.payoutId, adminId);
    await recordAudit(req, { action: 'approve_payout', targetType: 'shop_payout', targetId: req.params.payoutId, details: result });
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

const ledgerService = require('../../../services/ledger.service');
const platformConfig = require('../../../services/platformConfig.service');
const commission = require('../../../services/commission.service');
const { queryOne, queryMany } = require('../../../config/database');

/**
 * Settlement Statement Handler (S4)
 * Returns daily/periodic settlement statement with 0% launch commission breakdown,
 * COD collection reconciliation, and double-entry ledger balance.
 */
async function handleSettlementStatement(req, res, next) {
  try {
    const { shopId } = req.params;
    const format = req.query.format || (req.path.endsWith('/csv') ? 'csv' : 'json');
    const periodStart = req.query.start || '1970-01-01';
    const periodEnd = req.query.end || '2099-12-31';

    // 1. Fetch double-entry ledger balance for seller
    const ledger = await ledgerService.getAccountBalance('SELLER_PAYABLE', shopId);

    // 2. Fetch delivered orders for the shop
    const orders = await queryMany(
      `SELECT o.id, o.created_at, o.delivered_at, o.total_amount, o.subtotal, o.discount,
              o.delivery_fee, o.platform_fee, o.small_order_fee, o.payment_method,
              o.cash_collected_by, o.assigned_agent_id, o.fulfillment_method, o.commission_percent
         FROM orders o
        WHERE CAST(o.shop_id AS TEXT) = $1
          AND (LOWER(o.order_status) = 'delivered' OR LOWER(o.status) = 'delivered')
          AND o.delivered_at >= $2 AND o.delivered_at <= $3
        ORDER BY o.delivered_at DESC`,
      [String(shopId), periodStart, periodEnd]
    );

    const config = {
      gst_on_commission_percent: await platformConfig.get('gst_on_commission_percent'),
      gateway_fee_percent: await platformConfig.get('gateway_fee_percent'),
    };
    const shop = await queryOne('SELECT id, category_id, commission_override_percent, convenience_fee_override FROM local_shops WHERE CAST(id AS TEXT) = $1', [String(shopId)]);
    const shopRate = await commission.rateForShop(shop);
    const shopConvenience = await commission.convenienceFeeForShop(shop);

    let grossSales = 0;
    let totalCommission = 0;
    let totalGst = 0;
    let totalGatewayFees = 0;
    let totalCodCollectedByShop = 0;
    let totalNet = 0;

    const lineItems = orders.map((o) => {
      const terms = {
        percent: o.commission_percent !== null && o.commission_percent !== undefined ? Number(o.commission_percent) : shopRate,
        convenienceFee: shopConvenience,
      };
      const settled = PayoutService.settleOrder(o, terms, config);
      grossSales += settled.sales;
      totalCommission += settled.commissionAmount;
      totalGst += settled.gst;
      totalGatewayFees += settled.gatewayFee;
      totalCodCollectedByShop += settled.shopHolds;
      totalNet += settled.net;
      return {
        orderId: o.id,
        date: o.delivered_at || o.created_at,
        paymentMethod: o.payment_method,
        sales: settled.sales,
        commission: settled.commissionAmount,
        gst: settled.gst,
        gatewayFee: settled.gatewayFee,
        codCollectedByShop: settled.shopHolds,
        netPayable: settled.net,
      };
    });

    const summary = {
      shopId,
      periodStart,
      periodEnd,
      totalOrders: orders.length,
      grossSales: Math.round(grossSales * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      commissionPercent: shopRate, // 0% default at launch
      totalGst: Math.round(totalGst * 100) / 100,
      totalGatewayFees: Math.round(totalGatewayFees * 100) / 100,
      totalCodCollectedByShop: Math.round(totalCodCollectedByShop * 100) / 100,
      netSettlementPayable: Math.round(totalNet * 100) / 100,
      ledgerBalancePaise: Number(ledger.balancePaise || 0),
      ledgerBalanceRupees: Math.round((Number(ledger.balancePaise || 0) / 100) * 100) / 100,
    };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=settlement-statement-${shopId}.csv`);
      const csvLines = [
        'Date,OrderId,PaymentMethod,GrossSales,Commission,GST,GatewayFee,CODCollectedByShop,NetPayable',
        ...lineItems.map(it => `${it.date},${it.orderId},${it.paymentMethod},${it.sales.toFixed(2)},${it.commission.toFixed(2)},${it.gst.toFixed(2)},${it.gatewayFee.toFixed(2)},${it.codCollectedByShop.toFixed(2)},${it.netPayable.toFixed(2)}`),
        `TOTAL,,TOTALS,${summary.grossSales.toFixed(2)},${summary.totalCommission.toFixed(2)},${summary.totalGst.toFixed(2)},${summary.totalGatewayFees.toFixed(2)},${summary.totalCodCollectedByShop.toFixed(2)},${summary.netSettlementPayable.toFixed(2)}`
      ];
      return res.send(csvLines.join('\n'));
    }

    res.json({
      success: true,
      summary,
      lineItems,
    });
  } catch (error) {
    next(error);
  }
}

router.get(['/:shopId/settlements/statement', '/:shopId/payouts/statement'], authenticate, requireShopParam(), handleSettlementStatement);
router.get(['/:shopId/settlements/statement/csv', '/:shopId/payouts/statement/csv'], authenticate, requireShopParam(), handleSettlementStatement);

module.exports = router;

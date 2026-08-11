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
const logger = require('../../../config/logger');

const requireAdmin = (req, res, next) => {
  const role = req.user?.role;
  if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /api/v1/shops/:shopId/payouts
 * Get payout history for a shop (vendor or admin)
 */
router.get('/:shopId/payouts', authenticate, async (req, res, next) => {
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
router.get('/:shopId/payouts/:payoutId', authenticate, async (req, res, next) => {
  try {
    const data = await PayoutService.getPayoutDetails(req.params.payoutId);
    if (!data) return res.status(404).json({ error: 'Payout not found' });
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
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

module.exports = router;

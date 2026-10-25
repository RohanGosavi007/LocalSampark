/**
 * ═══════════════════════════════════════════════════════════════════════
 * Shop Analytics Routes — Owner Dashboard API
 * 10x Plan: Section 20.3.2 — Analytics API Endpoints
 * ═══════════════════════════════════════════════════════════════════════
 */
const express = require('express');
const router = express.Router();
const ShopAnalyticsService = require('../../../services/shopAnalytics.service');
const { authenticate } = require('../../../middleware/auth.middleware');
// A shop's revenue, order counts, customers and stock are its own. Every route
// here took the shop from the URL with `authenticate` alone, so any signed-in
// account — a competitor included — could read them.
const { requireShopParam } = require('../../../middleware/shop-owner.middleware');
const logger = require('../../../config/logger');

/**
 * GET /api/v1/shops/:shopId/analytics/overview
 * Full dashboard summary — combines all analytics
 */
router.get('/:shopId/analytics/overview', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { query: dbQuery, queryOne } = require('../../../config/database');
    
    const shop = await queryOne(`SELECT * FROM local_shops WHERE id = $1`, [shopId]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const dashboard = await ShopAnalyticsService.getFullDashboard(shopId, shop);
    res.json({ success: true, shopId, ...dashboard });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/shops/:shopId/analytics/revenue
 * Revenue trend (daily/weekly/monthly)
 */
router.get('/:shopId/analytics/revenue', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { period = 'daily', days = 30 } = req.query;
    const data = await ShopAnalyticsService.getRevenueTrend(shopId, period, parseInt(days));
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/shops/:shopId/analytics/orders
 * Order volume + status breakdown + hourly distribution
 */
router.get('/:shopId/analytics/orders', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { days = 30 } = req.query;
    const data = await ShopAnalyticsService.getOrderBreakdown(shopId, parseInt(days));
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/shops/:shopId/analytics/customers
 * New vs returning, top customers, retention rate
 */
router.get('/:shopId/analytics/customers', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { days = 30 } = req.query;
    const data = await ShopAnalyticsService.getCustomerAnalytics(shopId, parseInt(days));
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/shops/:shopId/analytics/competitors
 * Zone competitor benchmarking
 */
router.get('/:shopId/analytics/competitors', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { queryOne } = require('../../../config/database');
    const shop = await queryOne(`SELECT category, region_id FROM local_shops WHERE id = $1`, [shopId]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const data = await ShopAnalyticsService.getCompetitorAnalysis(shopId, shop.category, shop.region_id);
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/shops/:shopId/analytics/peak-hours
 * Heatmap data (7 days × 24 hours)
 */
router.get('/:shopId/analytics/peak-hours', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { days = 30 } = req.query;
    const data = await ShopAnalyticsService.getPeakHours(shopId, parseInt(days));
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
});

/**
 * GET /api/v1/shops/:shopId/analytics/inventory
 * Stock levels, low-stock alerts
 */
router.get('/:shopId/analytics/inventory', authenticate, requireShopParam(), async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const data = await ShopAnalyticsService.getInventoryStatus(shopId);
    res.json({ success: true, ...data });
  } catch (error) { next(error); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const pool = require('../config/database');
const AnalyticsService = require('../services/analytics.service');

// GET /api/v1/ai-analytics/:shopId/predictions
router.get('/:shopId/predictions', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const predictions = await AnalyticsService.getInventoryBurnRate(shopId);
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// GET /api/v1/ai-analytics/:shopId/inventory-burn
router.get('/:shopId/inventory-burn', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    
    // Heuristic: Calculate average daily sales per product over last 30 days
    // Predict out-of-stock date based on current stock
    const result = await pool.query(
      `SELECT p.id, p.name, p.stock, 
        COALESCE(SUM(oi.quantity), 0) / 30.0 as avg_daily_sales,
        CASE 
          WHEN COALESCE(SUM(oi.quantity), 0) = 0 THEN 'Stable'
          WHEN (p.stock / (SUM(oi.quantity) / 30.0)) < 7 THEN 'Critical (Under 7 Days)'
          WHEN (p.stock / (SUM(oi.quantity) / 30.0)) < 14 THEN 'Warning (Under 14 Days)'
          ELSE 'Healthy'
        END as burn_status
       FROM products p
       LEFT JOIN order_items oi ON p.id = oi.product_id
       LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= NOW() - INTERVAL '30 days'
       WHERE p.shop_id = $1
       GROUP BY p.id, p.name, p.stock
       ORDER BY avg_daily_sales DESC
       LIMIT 50`,
      [shopId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate burn rate' });
  }
});

// GET /api/v1/ai-analytics/:shopId/upsell-suggestions
router.get('/:shopId/upsell-suggestions', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    
    // Heuristic: Find frequently bought together items by looking at same order_items
    const result = await pool.query(
      `SELECT p1.name as product_a, p2.name as product_b, COUNT(*) as co_occurrence
       FROM order_items oi1
       JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id != oi2.product_id
       JOIN products p1 ON oi1.product_id = p1.id
       JOIN products p2 ON oi2.product_id = p2.id
       WHERE p1.shop_id = $1
       GROUP BY p1.name, p2.name
       ORDER BY co_occurrence DESC
       LIMIT 10`,
      [shopId]
    );

    // De-duplicate symmetrical pairs (A+B vs B+A) manually or use a hash map
    const uniquePairs = [];
    const seen = new Set();
    
    for (const row of result.rows) {
      const key1 = row.product_a + '_' + row.product_b;
      const key2 = row.product_b + '_' + row.product_a;
      if (!seen.has(key1) && !seen.has(key2)) {
        seen.add(key1);
        uniquePairs.push({
          trigger_item: row.product_a,
          upsell_item: row.product_b,
          confidence_score: parseInt(row.co_occurrence, 10) * 5 // Arbitrary scaling for UI display
        });
      }
    }

    res.json(uniquePairs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate upsell suggestions' });
  }
});

// GET /api/v1/ai-analytics/:shopId/surge
const surgeService = require('../services/surge.service');
router.get('/:shopId/surge', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const surge = await surgeService.getSurgeSuggestion(shopId);
    res.json(surge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get surge pricing' });
  }
});

module.exports = router;

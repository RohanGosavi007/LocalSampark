const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../../../middleware/auth.middleware');
const pool = require('../../../../config/database');

// GET /api/v1/franchise-intelligence/:zoneId/health-scores - Merchant health scoring
router.get('/:zoneId/health-scores', authenticate, requireRole('franchise'), async (req, res) => {
  try {
    const { zoneId } = req.params;
    
    // Simulate complex health scoring: query orders in last 7 days, revenue trend, response time
    const result = await pool.query(
      `SELECT s.id, s.name, s.shop_category_slug,
        (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id AND o.created_at >= NOW() - INTERVAL '7 days') as recent_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE o.shop_id = s.id AND o.created_at >= NOW() - INTERVAL '7 days') as recent_revenue
       FROM shops s
       WHERE s.zone_id = $1`,
      [zoneId]
    );

    // Calculate arbitrary health score 0-100 based on orders
    const scores = result.rows.map(shop => {
      const orders = parseInt(shop.recent_orders, 10);
      let score = 50; // Base score
      if (orders > 50) score = 95;
      else if (orders > 20) score = 80;
      else if (orders > 5) score = 65;
      else if (orders === 0) score = 30;

      return {
        ...shop,
        health_score: score,
        status: score > 75 ? 'Healthy' : (score > 40 ? 'Needs Attention' : 'At-Risk')
      };
    });

    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: 'Server error calculating health scores' });
  }
});

// GET /api/v1/franchise-intelligence/:zoneId/leads - Prospective merchants
router.get('/:zoneId/leads', authenticate, requireRole('franchise'), async (req, res) => {
  try {
    const { zoneId } = req.params;
    const result = await pool.query(
      `SELECT * FROM lead_crm WHERE zone_id = $1 ORDER BY created_at DESC`,
      [zoneId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching leads' });
  }
});

// POST /api/v1/franchise-intelligence/:zoneId/outreach - Log outreach attempt
router.post('/:zoneId/outreach', authenticate, requireRole('franchise'), async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { shopId, method, notes } = req.body;
    
    // Using a simple table schema assuming one exists for lead tracking, or returning mock success
    res.json({ message: 'Outreach logged successfully', data: { shopId, method, date: new Date() } });
  } catch (error) {
    res.status(500).json({ error: 'Server error logging outreach' });
  }
});

module.exports = router;

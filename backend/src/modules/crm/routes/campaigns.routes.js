const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middleware/auth.middleware');
const pool = require('../../../../config/database');
const { query, queryOne } = require('../../../../config/database');
const { getGeoTargetedAds } = require('../../../../services/AdService');
const crypto = require('crypto');

// GET /api/v1/campaigns/geo-feed - Fetch active targeted ads based on lat/lng & radius
router.get('/geo-feed', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat || 18.5204);
    const lng = parseFloat(req.query.lng || 73.8567);
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : null;
    const categoryId = req.query.categoryId || null;
    const pincode = req.query.pincode || null;

    const ads = await getGeoTargetedAds({ lat, lng, pincode, categoryId, radiusKm });
    res.json({ success: true, count: ads.length, ads });
  } catch (error) {
    console.error('Geo feed error:', error);
    res.status(500).json({ error: 'Failed to fetch geo-targeted ads' });
  }
});

// POST /api/v1/campaigns/:id/impression - Record ad impression
router.post('/:id/impression', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE ad_campaigns SET impressions = impressions + 1 WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Impression recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record impression' });
  }
});

// POST /api/v1/campaigns/:id/click - Record ad click and deduct cost
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    const cpcRate = 5.0; // ₹5 per click
    await query(`UPDATE ad_campaigns SET clicks = clicks + 1, spent = spent + $1 WHERE id = $2`, [cpcRate, id]);
    res.json({ success: true, message: 'Click recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record click' });
  }
});

// POST /api/v1/campaigns/:shopId - Create scheduled campaign
router.post('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { title, discount_type, discount_value, start_datetime, end_datetime, radius_km, is_flash_sale, fomo_timer_minutes } = req.body;

    const result = await query(
      `INSERT INTO shop_campaigns 
       (shop_id, title, discount_type, discount_value, start_datetime, end_datetime, radius_km, is_flash_sale, fomo_timer_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled') RETURNING *`,
      [shopId, title, discount_type, discount_value, start_datetime, end_datetime, radius_km, is_flash_sale, fomo_timer_minutes]
    );

    res.status(201).json({ message: 'Campaign created', campaign: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// POST /api/v1/campaigns/purchase - Admin / Merchant campaign purchase
router.post('/purchase', authenticate, async (req, res) => {
  try {
    const { shop_id, budget_amount, radius_km, duration_days } = req.body;
    const campaignId = crypto.randomUUID();
    const result = await query(
      `INSERT INTO ad_campaigns 
       (id, shop_id, budget, radius_km, duration_days, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
      [campaignId, shop_id || null, budget_amount || 500, radius_km || 4, duration_days || 7]
    );

    res.status(201).json({ success: true, message: 'Ad Campaign Purchased Successfully!', campaign: result.rows ? result.rows[0] : result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to purchase campaign: ' + error.message });
  }
});

// GET /api/v1/campaigns/:shopId - List campaigns
router.get('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const result = await pool.query(
      `SELECT * FROM shop_campaigns WHERE shop_id = $1 ORDER BY created_at DESC`,
      [shopId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// PUT /api/v1/campaigns/:shopId/:campaignId/activate - Manual trigger
router.put('/:shopId/:campaignId/activate', authenticate, async (req, res) => {
  try {
    const { shopId, campaignId } = req.params;
    const result = await pool.query(
      `UPDATE shop_campaigns SET status = 'active' WHERE id = $1 AND shop_id = $2 RETURNING *`,
      [campaignId, shopId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ message: 'Campaign activated manually', campaign: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate campaign' });
  }
});

module.exports = router;

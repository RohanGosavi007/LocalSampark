const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const pool = require('../config/database');

// POST /api/v1/campaigns/:shopId - Create scheduled campaign
router.post('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { title, discount_type, discount_value, start_datetime, end_datetime, radius_km, is_flash_sale, fomo_timer_minutes } = req.body;

    const result = await pool.query(
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

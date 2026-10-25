const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const pool = require('../../../config/database');

// POST /api/v1/trust-reviews/:shopId - Upload video review
router.post('/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { video_url, rating, review_text } = req.body;
    const userId = req.user.id;

    // An empty body used to reach the INSERT and come back as a 500, a rating of
    // 99 was stored as sent, and video_url went straight into an <a>/<video> on
    // the shop page — so it has to be an http(s) URL, not `javascript:`.
    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ error: 'rating must be a whole number from 1 to 5' });
    }
    if (video_url !== undefined && video_url !== null && video_url !== '') {
      let parsed;
      try { parsed = new URL(String(video_url)); } catch { parsed = null; }
      if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || String(video_url).length > 2000) {
        return res.status(400).json({ error: 'video_url must be an http(s) URL' });
      }
    }
    if (review_text !== undefined && review_text !== null && String(review_text).length > 2000) {
      return res.status(400).json({ error: 'review_text is too long' });
    }

    // Verify if user actually ordered from this shop
    const orderCheck = await pool.query(`SELECT id FROM orders WHERE user_id = $1 AND shop_id = $2 AND order_status = 'delivered' LIMIT 1`,
      [userId, shopId]
    );

    const isVerifiedBuyer = orderCheck.rowCount > 0;

    const result = await pool.query(`INSERT INTO trust_reviews (shop_id, user_id, video_url, rating, review_text, is_verified_buyer)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [shopId, userId, video_url, rating, review_text, isVerifiedBuyer]
    );

    res.status(201).json({ message: 'Review posted', review: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post review' });
  }
});

// GET /api/v1/trust-reviews/feed - Community feed
router.get('/feed', authenticate, async (req, res) => {
  try {
    const { zoneId } = req.query;
    // Join with shops to get shop name, join with users to get user name
    const result = await pool.query(`SELECT tr.*, s.name as shop_name, u.full_name as user_name 
       FROM trust_reviews tr
       JOIN local_shops s ON tr.shop_id = s.id
       JOIN users u ON tr.user_id = u.id
       WHERE s.region_id = $1
       ORDER BY tr.created_at DESC
       LIMIT 50`,
      [zoneId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

module.exports = router;

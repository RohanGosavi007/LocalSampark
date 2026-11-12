const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate } = require('../../../middleware/auth.middleware');
const { query, queryOne } = require('../../../config/database');
const { isFullAdmin } = require('../../../../../packages/shared/src/roles');

const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

// POST /api/v1/trust-reviews/:shopId - Submit verified buyer review
router.post('/:shopId', authenticate, async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const { video_url, rating, review_text, orderId } = req.body || {};
    const userId = req.user.id || req.user.userId;

    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, error: 'rating must be a whole number from 1 to 5' });
    }

    if (video_url !== undefined && video_url !== null && video_url !== '') {
      let parsed;
      try { parsed = new URL(String(video_url)); } catch { parsed = null; }
      if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || String(video_url).length > 2000) {
        return res.status(400).json({ success: false, error: 'video_url must be an http(s) URL' });
      }
    }

    if (review_text !== undefined && review_text !== null && String(review_text).length > 2000) {
      return res.status(400).json({ success: false, error: 'review_text is too long (max 2000 characters)' });
    }

    // Verify shop exists
    const shop = await queryOne('SELECT id, name FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) {
      return res.status(404).json({ success: false, error: 'Shop not found' });
    }

    // Statutory Verified Buyer Check (Consumer Protection Rules 2020)
    let orderParams = [userId, shopId];
    let orderQuery = "SELECT id FROM orders WHERE user_id = $1 AND shop_id = $2 AND (order_status = 'delivered' OR status = 'delivered')";
    if (orderId) {
      orderParams.push(String(orderId));
      orderQuery += ` AND id = $${orderParams.length}`;
    }
    orderQuery += ' LIMIT 1';

    const verifiedOrder = await queryOne(orderQuery, orderParams);
    if (!verifiedOrder) {
      return res.status(403).json({
        success: false,
        error: 'Only verified buyers who have received a delivered order can review this shop'
      });
    }

    const reviewId = crypto.randomUUID();
    const finalOrderId = orderId ? String(orderId) : verifiedOrder.id;

    // Prevent duplicate review for the same delivered order
    const existing = await queryOne('SELECT id FROM trust_reviews WHERE user_id = $1 AND order_id = $2', [userId, finalOrderId]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this delivered order' });
    }

    await query(
      `INSERT INTO trust_reviews
         (id, shop_id, user_id, order_id, video_url, rating, review_text, is_verified_buyer, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, ${NOW})`,
      [reviewId, shopId, userId, finalOrderId, video_url || null, stars, review_text ? String(review_text).trim() : '']
    );

    // Automatically recalculate and update shop rating average
    // C11: the customer's public review of the shop, and the shop's rating,
    // come from services/reviews.service.js. This used to set the rating to
    // the average of trust_reviews alone (5.0 when it had none), while other
    // paths set it from other tables.
    const publicReview = await require('../../../services/reviews.service').submit({
      userId, shopId, orderId: finalOrderId, rating: stars, text: review_text, mode: 'upsert',
    });

    const created = await queryOne('SELECT * FROM trust_reviews WHERE id = $1', [reviewId]);

    res.status(201).json({
      success: true,
      message: 'Verified buyer review posted successfully',
      review: created,
      shopRating: publicReview.shopRating
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/trust-reviews/:reviewId/reply - Shop owner / Admin reply to review
router.post('/:reviewId/reply', authenticate, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { replyText } = req.body || {};
    const userId = req.user.id || req.user.userId;

    if (!replyText || !String(replyText).trim()) {
      return res.status(400).json({ success: false, error: 'replyText is required' });
    }

    const review = await queryOne('SELECT * FROM trust_reviews WHERE id = $1', [reviewId]);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    // Verify caller is shop owner or admin
    const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [review.shop_id]);
    const isOwner = shop && String(shop.owner_id) === String(userId);
    const isAdmin = isFullAdmin(req.user.role) || req.user.isSuperAdmin || ['admin', 'super_admin'].includes(String(req.user.role).toLowerCase());

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Only the shop owner or admin can reply to this review' });
    }

    const cleanReply = String(replyText).trim();
    await query(
      `UPDATE trust_reviews
          SET seller_reply_text = $1, seller_replied_at = ${NOW}
        WHERE id = $2`,
      [cleanReply, reviewId]
    );

    res.json({
      success: true,
      message: 'Seller reply recorded successfully',
      reviewId,
      sellerReplyText: cleanReply
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/trust-reviews/shop/:shopId - List reviews for a specific shop
router.get('/shop/:shopId', async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const rows = await query(
      `SELECT tr.*, u.full_name AS customer_name, u.avatar_url AS customer_avatar
         FROM trust_reviews tr
         LEFT JOIN users u ON u.id = tr.user_id
        WHERE tr.shop_id = $1
        ORDER BY tr.created_at DESC
        LIMIT 100`,
      [shopId]
    );

    res.json({ success: true, reviews: rows.rows || rows || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/trust-reviews/feed - Community reviews feed
router.get('/feed', authenticate, async (req, res, next) => {
  try {
    const { zoneId } = req.query;
    const conditions = [];
    const params = [];

    if (zoneId) {
      params.push(zoneId);
      conditions.push(`s.region_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT tr.*, s.name as shop_name, u.full_name as user_name
         FROM trust_reviews tr
         JOIN local_shops s ON tr.shop_id = s.id
         JOIN users u ON tr.user_id = u.id
        ${whereClause}
        ORDER BY tr.created_at DESC
        LIMIT 50`,
      params
    );

    res.json({ success: true, reviews: rows.rows || rows || [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

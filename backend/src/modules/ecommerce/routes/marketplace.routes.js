const express = require('express');
const router = express.Router();
const { query, queryOne, queryMany } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════
// LISTINGS
// ═══════════════════════════════════════════════════════════════

// GET / — Browse listings with filters
router.get('/', async (req, res, next) => {
  try {
    const { category, condition, min_price, max_price, search, sort = 'newest', lat, lng, radius = 10, page = 1, limit = 24 } = req.query;
    let sql = `SELECT l.*, u.full_name as seller_name, u.profile_photo as seller_photo FROM marketplace_listings l LEFT JOIN users u ON l.seller_id = u.id WHERE l.status = 'active'`;
    const params = [];

    if (category) { params.push(category); sql += ` AND l.category = $${params.length}`; }
    if (condition) { params.push(condition); sql += ` AND l.condition = $${params.length}`; }
    if (min_price) { params.push(parseFloat(min_price)); sql += ` AND l.price >= $${params.length}`; }
    if (max_price) { params.push(parseFloat(max_price)); sql += ` AND l.price <= $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (l.title LIKE $${params.length} OR l.description LIKE $${params.length})`; }

    const sortMap = { newest: 'l.created_at DESC', oldest: 'l.created_at ASC', 'price-asc': 'l.price ASC', 'price-desc': 'l.price DESC', popular: 'l.views_count DESC' };
    sql += ` ORDER BY ${sortMap[sort] || 'l.created_at DESC'}`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    let listings = await queryMany(sql, params);

    // Geo filter in JS
    if (lat && lng) {
      const uLat = parseFloat(lat), uLng = parseFloat(lng), r = parseFloat(radius);
      listings = listings.filter(l => {
        if (!l.latitude || !l.longitude) return true;
        const dLat = (l.latitude - uLat) * Math.PI / 180;
        const dLng = (l.longitude - uLng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(uLat*Math.PI/180)*Math.cos(l.latitude*Math.PI/180)*Math.sin(dLng/2)**2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= r;
      });
    }

    // Parse photo_urls JSON
    listings = listings.map(l => ({
      ...l,
      photo_urls: (() => { try { return JSON.parse(l.photo_urls || '[]'); } catch { return []; } })()
    }));

    res.json({ success: true, listings, page: parseInt(page), total: listings.length });
  } catch (error) { next(error); }
});

// GET /categories — DB-driven categories
router.get('/categories', async (req, res, next) => {
  try {
    const cats = await queryMany('SELECT * FROM marketplace_categories WHERE is_active = 1 ORDER BY display_order ASC');
    res.json({ success: true, categories: cats });
  } catch (error) { next(error); }
});

// GET /flash-deals — Active time-limited deals
router.get('/flash-deals', async (req, res, next) => {
  try {
    const deals = await queryMany(`SELECT l.*, u.full_name as seller_name FROM marketplace_listings l
      LEFT JOIN users u ON l.seller_id = u.id
      WHERE l.status = 'active' AND l.flash_deal_until IS NOT NULL AND l.flash_deal_until > datetime('now')
      ORDER BY l.flash_deal_until ASC LIMIT 20`);
    res.json({ success: true, deals: deals.map(d => ({ ...d, photo_urls: (() => { try { return JSON.parse(d.photo_urls || '[]'); } catch { return []; } })() })) });
  } catch (error) { next(error); }
});

// GET /:id — Single listing detail
router.get('/:id', async (req, res, next) => {
  try {
    if (req.params.id === 'categories' || req.params.id === 'flash-deals' || req.params.id === 'saved') return next();
    const listing = await queryOne(`SELECT l.*, u.full_name as seller_name, u.profile_photo as seller_photo, u.phone_number as seller_phone
      FROM marketplace_listings l LEFT JOIN users u ON l.seller_id = u.id WHERE l.id = $1`, [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    // Increment views
    await query('UPDATE marketplace_listings SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1', [req.params.id]);

    // Get offers count
    const offersCount = await queryOne(`SELECT COUNT(*) as count FROM marketplace_offers WHERE listing_id = $1`, [req.params.id]);

    listing.photo_urls = (() => { try { return JSON.parse(listing.photo_urls || '[]'); } catch { return []; } })();
    listing.offers_count = offersCount?.count || 0;
    listing.seller_phone = listing.seller_phone ? listing.seller_phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') : null;

    res.json({ success: true, listing });
  } catch (error) { next(error); }
});

// POST / — Create listing
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, category, condition = 'Good', price, is_negotiable = true, photo_urls = [],
            latitude, longitude, delivery_available = false, zone, flash_deal_until } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Title and price are required' });

    const id = crypto.randomUUID();
    await query(`INSERT INTO marketplace_listings (id, seller_id, title, description, category, condition, price, is_negotiable,
      photo_urls, latitude, longitude, delivery_available, zone, flash_deal_until, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active')`,
      [id, req.user.id, title, description||null, category||null, condition, price, is_negotiable?1:0,
       JSON.stringify(photo_urls), latitude||null, longitude||null, delivery_available?1:0, zone||null, flash_deal_until||null]);

    res.status(201).json({ success: true, listingId: id, message: 'Listing created' });
  } catch (error) { next(error); }
});

// PUT /:id — Edit listing
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await queryOne('SELECT * FROM marketplace_listings WHERE id = $1', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (String(listing.seller_id) !== String(req.user.id)) return res.status(403).json({ error: 'Not your listing' });

    const { title, description, category, condition, price, is_negotiable, photo_urls, status } = req.body;
    const sets = [], params = [];
    if (title) { params.push(title); sets.push(`title = $${params.length}`); }
    if (description !== undefined) { params.push(description); sets.push(`description = $${params.length}`); }
    if (category) { params.push(category); sets.push(`category = $${params.length}`); }
    if (condition) { params.push(condition); sets.push(`condition = $${params.length}`); }
    if (price !== undefined) { params.push(price); sets.push(`price = $${params.length}`); }
    if (is_negotiable !== undefined) { params.push(is_negotiable?1:0); sets.push(`is_negotiable = $${params.length}`); }
    if (photo_urls) { params.push(JSON.stringify(photo_urls)); sets.push(`photo_urls = $${params.length}`); }
    if (status) { params.push(status); sets.push(`status = $${params.length}`); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id);
    await query(`UPDATE marketplace_listings SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
    res.json({ success: true, message: 'Listing updated' });
  } catch (error) { next(error); }
});

// DELETE /:id — Remove listing
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const listing = await queryOne('SELECT * FROM marketplace_listings WHERE id = $1', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (String(listing.seller_id) !== String(req.user.id) && !req.user.is_admin) return res.status(403).json({ error: 'Not your listing' });
    await query(`UPDATE marketplace_listings SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Listing removed' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// OFFERS / NEGOTIATION
// ═══════════════════════════════════════════════════════════════

router.post('/:id/offer', authenticate, async (req, res, next) => {
  try {
    const { offer_amount, message } = req.body;
    if (!offer_amount || offer_amount <= 0) return res.status(400).json({ error: 'offer_amount required' });

    const listing = await queryOne('SELECT * FROM marketplace_listings WHERE id = $1', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (String(listing.seller_id) === String(req.user.id)) return res.status(400).json({ error: 'Cannot offer on own listing' });

    const offerId = crypto.randomUUID();
    await query(`INSERT INTO marketplace_offers (id, listing_id, buyer_id, offer_amount, message, status) VALUES ($1,$2,$3,$4,$5,'pending')`,
      [offerId, req.params.id, req.user.id, offer_amount, message||null]);
    res.status(201).json({ success: true, offerId, message: 'Offer submitted' });
  } catch (error) { next(error); }
});

router.get('/:id/offers', authenticate, async (req, res, next) => {
  try {
    const offers = await queryMany(`SELECT o.*, u.full_name as buyer_name FROM marketplace_offers o
      LEFT JOIN users u ON o.buyer_id = u.id WHERE o.listing_id = $1 ORDER BY o.created_at DESC`, [req.params.id]);
    res.json({ success: true, offers });
  } catch (error) { next(error); }
});

router.put('/offers/:id/respond', authenticate, async (req, res, next) => {
  try {
    const { action, counter_amount } = req.body;
    const offer = await queryOne('SELECT * FROM marketplace_offers WHERE id = $1', [req.params.id]);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const listing = await queryOne('SELECT * FROM marketplace_listings WHERE id = $1', [offer.listing_id]);
    if (!listing || String(listing.seller_id) !== String(req.user.id)) return res.status(403).json({ error: 'Only seller can respond' });

    if (action === 'accept') {
      await query(`UPDATE marketplace_offers SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
      await query(`UPDATE marketplace_listings SET status = 'sold', sold_to = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [offer.buyer_id, offer.listing_id]);
      res.json({ success: true, message: 'Offer accepted, item marked as sold' });
    } else if (action === 'reject') {
      await query(`UPDATE marketplace_offers SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
      res.json({ success: true, message: 'Offer rejected' });
    } else if (action === 'counter') {
      if (!counter_amount) return res.status(400).json({ error: 'counter_amount required' });
      await query(`UPDATE marketplace_offers SET status = 'countered', counter_amount = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [counter_amount, req.params.id]);
      res.json({ success: true, message: 'Counter offer sent' });
    } else {
      return res.status(400).json({ error: 'action must be accept, reject, or counter' });
    }
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// SAVED / WISHLIST
// ═══════════════════════════════════════════════════════════════

router.post('/:id/save', authenticate, async (req, res, next) => {
  try {
    const existing = await queryOne('SELECT * FROM marketplace_saved WHERE user_id = $1 AND listing_id = $2', [req.user.id, req.params.id]);
    if (existing) {
      await query('DELETE FROM marketplace_saved WHERE id = $1', [existing.id]);
      return res.json({ success: true, saved: false, message: 'Removed from saved' });
    }
    const id = crypto.randomUUID();
    await query('INSERT INTO marketplace_saved (id, user_id, listing_id) VALUES ($1,$2,$3)', [id, req.user.id, req.params.id]);
    res.json({ success: true, saved: true, message: 'Saved to wishlist' });
  } catch (error) { next(error); }
});

router.get('/saved', authenticate, async (req, res, next) => {
  try {
    const saved = await queryMany(`SELECT l.*, u.full_name as seller_name, ms.created_at as saved_at
      FROM marketplace_saved ms
      INNER JOIN marketplace_listings l ON ms.listing_id = l.id
      LEFT JOIN users u ON l.seller_id = u.id
      WHERE ms.user_id = $1 ORDER BY ms.created_at DESC`, [req.user.id]);
    res.json({ success: true, saved: saved.map(s => ({ ...s, photo_urls: (() => { try { return JSON.parse(s.photo_urls || '[]'); } catch { return []; } })() })) });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════════

router.get('/:id/chat', authenticate, async (req, res, next) => {
  try {
    const listing = await queryOne('SELECT * FROM marketplace_listings WHERE id = $1', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const isSeller = String(listing.seller_id) === String(req.user.id);
    let chat;
    if (isSeller) {
      const chats = await queryMany(`SELECT c.*, u.full_name as buyer_name FROM marketplace_chats c
        LEFT JOIN users u ON c.buyer_id = u.id WHERE c.listing_id = $1 ORDER BY c.last_message_at DESC`, [req.params.id]);
      return res.json({ success: true, chats });
    } else {
      chat = await queryOne(`SELECT * FROM marketplace_chats WHERE listing_id = $1 AND buyer_id = $2`, [req.params.id, req.user.id]);
      if (!chat) return res.json({ success: true, messages: [] });
    }

    const messages = await queryMany(`SELECT m.*, u.full_name as sender_name FROM marketplace_chat_messages m
      LEFT JOIN users u ON m.sender_id = u.id WHERE m.chat_id = $1 ORDER BY m.created_at ASC`, [chat.id]);
    res.json({ success: true, chatId: chat.id, messages });
  } catch (error) { next(error); }
});

router.post('/:id/chat', authenticate, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const listing = await queryOne('SELECT * FROM marketplace_listings WHERE id = $1', [req.params.id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    let chat = await queryOne(`SELECT * FROM marketplace_chats WHERE listing_id = $1 AND buyer_id = $2`, [req.params.id, req.user.id]);
    if (!chat) {
      const chatId = crypto.randomUUID();
      await query(`INSERT INTO marketplace_chats (id, listing_id, buyer_id, seller_id, last_message, last_message_at)
        VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)`, [chatId, req.params.id, req.user.id, listing.seller_id, message]);
      chat = { id: chatId };
    } else {
      await query(`UPDATE marketplace_chats SET last_message = $1, last_message_at = CURRENT_TIMESTAMP WHERE id = $2`, [message, chat.id]);
    }

    const msgId = crypto.randomUUID();
    await query(`INSERT INTO marketplace_chat_messages (id, chat_id, sender_id, message) VALUES ($1,$2,$3,$4)`, [msgId, chat.id, req.user.id, message]);
    res.status(201).json({ success: true, chatId: chat.id, messageId: msgId });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════

router.post('/:id/report', authenticate, async (req, res, next) => {
  try {
    const { reason, details } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason required' });
    const id = crypto.randomUUID();
    await query(`INSERT INTO marketplace_reports (id, listing_id, reporter_id, reason, details, status) VALUES ($1,$2,$3,$4,$5,'pending')`,
      [id, req.params.id, req.user.id, reason, details||null]);
    res.status(201).json({ success: true, message: 'Report submitted' });
  } catch (error) { next(error); }
});

// ═══════════════════════════════════════════════════════════════
// INVENTORY (existing endpoint preserved)
// ═══════════════════════════════════════════════════════════════

router.put('/products/:productId/inventory', authenticate, async (req, res, next) => {
  try {
    const { stock, price } = req.body;
    if (stock === undefined && price === undefined) return res.status(400).json({ error: 'Provide stock, price, or both' });

    const product = await queryOne(`SELECT p.id, p.shop_id, s.owner_id FROM shop_products p LEFT JOIN local_shops s ON p.shop_id = s.id WHERE p.id = $1`, [req.params.productId]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (String(product.owner_id) !== String(req.user.id) && !req.user.is_admin) return res.status(403).json({ error: 'Only shop owner can change inventory' });

    const sets = [], params = [];
    if (stock !== undefined) {
      const n = parseInt(stock, 10);
      if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: 'stock must be non-negative integer' });
      params.push(n); sets.push(`inventory_count = $${params.length}`);
      params.push(n > 0); sets.push(`is_available = $${params.length}`);
    }
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) return res.status(400).json({ error: 'price must be non-negative' });
      params.push(p); sets.push(`price = $${params.length}`);
    }

    params.push(req.params.productId);
    await query(`UPDATE shop_products SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length}`, params);
    res.json({ success: true, productId: req.params.productId });
  } catch (error) { next(error); }
});

module.exports = router;

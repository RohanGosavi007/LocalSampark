const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    let listings;
    if (category) {
      listings = await query('SELECT * FROM marketplace_listings WHERE category = $1 AND status = \'active\' ORDER BY created_at DESC', [category]);
    } else {
      listings = await query('SELECT * FROM marketplace_listings WHERE status = \'active\' ORDER BY created_at DESC');
    }
    res.json(listings);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, category, condition, price, isNegotiable, photoUrls, latitude, longitude } = req.body;
    const geom = `ST_GeomFromText('POINT(${longitude || 73.8567} ${latitude || 18.5204})', 4326)`;

    const listing = await queryOne(`INSERT INTO marketplace_listings (seller_id, title, description, category, condition, price, is_negotiable, photo_urls, coordinate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${geom})
       RETURNING *`,
      [req.user.id, title, description, category, condition, price, isNegotiable !== false, JSON.stringify(photoUrls || [])]
    );

    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
});

// ─── INVENTORY ───────────────────────────────────────────────────────────────
// The mobile marketplace screen has always called this; it was never
// implemented. Only the owner of the shop selling the product may change it.
router.put('/products/:productId/inventory', authenticate, async (req, res, next) => {
  try {
    const { stock, price } = req.body;
    if (stock === undefined && price === undefined) {
      return res.status(400).json({ error: 'Provide stock, price, or both' });
    }

    const product = await queryOne(
      `SELECT p.id, p.shop_id, s.owner_id
         FROM shop_products p
         LEFT JOIN local_shops s ON p.shop_id = s.id
        WHERE p.id = $1`,
      [req.params.productId]
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (String(product.owner_id) !== String(req.user.id) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only the shop owner can change inventory' });
    }

    const sets = [];
    const params = [];
    if (stock !== undefined) {
      const n = parseInt(stock, 10);
      if (!Number.isInteger(n) || n < 0) {
        return res.status(400).json({ error: 'stock must be a non-negative integer' });
      }
      params.push(n);
      sets.push(`inventory_count = $${params.length}`);
      // Keep availability consistent with stock rather than leaving a
      // zero-stock product listed as available.
      params.push(n > 0);
      sets.push(`is_available = $${params.length}`);
    }
    if (price !== undefined) {
      const p = Number(price);
      if (!Number.isFinite(p) || p < 0) {
        return res.status(400).json({ error: 'price must be a non-negative number' });
      }
      params.push(p);
      sets.push(`price = $${params.length}`);
    }

    params.push(req.params.productId);
    await query(
      `UPDATE shop_products SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${params.length}`,
      params
    );

    res.json({ success: true, productId: req.params.productId });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

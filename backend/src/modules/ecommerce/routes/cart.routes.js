const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../../../middleware/auth.middleware');
const { query, queryOne } = require('../../../config/database');
const crypto = require('crypto');
// NOW() is PostgreSQL-only; SQLite needs CURRENT_TIMESTAMP.
const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';
const useSqlite = process.env.USE_SQLITE === 'true';

// GET Cart Items
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User ID or Session ID is required' });
    }

    // One join instead of Prisma's nested include. That include reached
    // product -> shop -> category, i.e. `products` and `shops`, neither of
    // which exists in this schema: the catalogue is `shop_products` and the
    // shops are `local_shops`. It also read `pricePaise`, a column that does
    // not exist — the price lives in `price`, in rupees.
    const ownerColumn = userId ? 'c.user_id' : 'c.session_id';
    const rows = await query(
      `SELECT c.id, c.quantity, c.custom_options,
              p.id AS product_id, p.name AS product_name, p.price, p.image_url,
              s.id AS shop_id, s.name AS shop_name, s.category AS shop_category
         FROM cart_items c
         JOIN shop_products p ON p.id = c.product_id
         LEFT JOIN local_shops s ON s.id = p.shop_id
        WHERE ${ownerColumn} = $1
        ORDER BY c.created_at DESC`,
      [userId || sessionId]
    ).then((r) => r.rows || r || []);

    const formattedItems = rows.map((row) => {
      let customOptions = null;
      try {
        customOptions = row.custom_options ? JSON.parse(row.custom_options) : null;
      } catch {
        // A malformed blob should not fail the whole cart.
        customOptions = null;
      }
      return {
        id: row.id,
        quantity: row.quantity,
        customOptions,
        product: {
          id: row.product_id,
          name: row.product_name,
          price: row.price,
          imageUrl: row.image_url || null,
          shop: {
            id: row.shop_id,
            name: row.shop_name,
            category: row.shop_category || 'Shop',
          },
        },
      };
    });

    res.json({ success: true, cartItems: formattedItems });
  } catch (error) {
    console.error('Cart GET Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cart' });
  }
});

// POST Add to Cart
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { productId, quantity, customOptions } = req.body;
    const userId = req.user ? req.user.id : null;
    const sessionId = req.body.sessionId || req.headers['x-session-id'];

    if ((!userId && !sessionId) || !productId || quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SQLite fallback — Prisma targets the remote PostgreSQL database
    if (useSqlite) {
      // Stock check against local shop_products.
      //
      // This selected `stock_qty`, a column that exists in no migration and no
      // schema, so SQLite raised "no such column" and every add-to-cart on the
      // SQLite path returned 500 before an item could ever be added. The real
      // stock columns are `inventory_count` gated by `track_inventory`, which is
      // exactly what checkout.service.js checks and decrements — so the cart
      // guard now agrees with the guard that actually blocks the order.
      if (quantity > 0) {
        const product = await queryOne(
          'SELECT inventory_count, track_inventory FROM shop_products WHERE id = $1',
          [productId]
        );
        if (
          product &&
          Number(product.track_inventory) === 1 &&
          Number(product.inventory_count ?? 0) < quantity
        ) {
          return res.status(400).json({
            error: 'Insufficient inventory',
            available: Number(product.inventory_count ?? 0),
          });
        }
      }

      const customOptionsStr = customOptions ? JSON.stringify(customOptions) : null;
      const ownerCol = userId ? 'user_id' : 'session_id';
      const ownerVal = userId || sessionId;

      // Check for existing cart item
      const existing = await queryOne(
        `SELECT id, quantity FROM cart_items WHERE product_id = $1 AND ${ownerCol} = $2`,
        [productId, ownerVal]
      );

      if (existing) {
        if (quantity === 0) {
          await query('DELETE FROM cart_items WHERE id = $1', [existing.id]);
          return res.json({ success: true, message: 'Item removed' });
        } else {
          await query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [quantity, existing.id]);
          return res.json({ success: true, cartItem: { id: existing.id, productId, quantity } });
        }
      } else if (quantity > 0) {
        await query(
          `INSERT INTO cart_items (user_id, session_id, product_id, quantity, custom_options)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, sessionId, productId, quantity, customOptionsStr]
        );
        return res.json({ success: true, cartItem: { productId, quantity } });
      } else {
        return res.json({ success: true, message: 'Quantity is 0, nothing added' });
      }
    }

    if (quantity > 0) {
      const product = await queryOne(
        'SELECT stock_quantity, stock FROM shop_products WHERE id = $1',
        [productId]
      );
      // The table carries both columns. stock_quantity is authoritative where
      // populated; `stock` is the older one several seeders still write.
      const available = product ? (product.stock_quantity ?? product.stock) : null;
      if (available != null && available < quantity) {
        return res.status(400).json({ error: 'Insufficient inventory', available });
      }
    }

    const customOptionsStr = customOptions ? JSON.stringify(customOptions) : null;

    // An item is "the same line" when the product and the chosen options match
    // for this cart. IS NOT DISTINCT FROM would be neater, but SQLite has no
    // such operator, so the null case is spelled out.
    const ownerColumn = userId ? 'user_id' : 'session_id';
    const existingItem = await queryOne(
      `SELECT * FROM cart_items
        WHERE ${ownerColumn} = $1 AND product_id = $2
          AND ((custom_options IS NULL AND $3 IS NULL) OR custom_options = $3)
        LIMIT 1`,
      [userId || sessionId, productId, customOptionsStr]
    );

    let result;
    if (existingItem) {
      if (quantity === 0) {
        await query('DELETE FROM cart_items WHERE id = $1', [existingItem.id]);
        return res.json({ success: true, message: 'Item removed' });
      }
      await query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [quantity, existingItem.id]);
      result = { ...existingItem, quantity };
    } else {
      if (quantity <= 0) {
        return res.json({ success: true, message: 'Quantity is 0, nothing added' });
      }
      const newId = crypto.randomUUID();
      await query(
        `INSERT INTO cart_items
           (id, user_id, session_id, product_id, quantity, custom_options, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, ${NOW})`,
        [newId, userId || null, sessionId || null, productId, quantity, customOptionsStr]
      );
      result = {
        id: newId,
        user_id: userId || null,
        session_id: sessionId || null,
        product_id: productId,
        quantity,
        custom_options: customOptionsStr,
      };
    }

    res.json({ success: true, cartItem: result });
  } catch (error) {
    console.error('Cart POST Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update cart' });
  }
});

module.exports = router;

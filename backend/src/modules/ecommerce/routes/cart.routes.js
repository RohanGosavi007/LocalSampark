const express = require('express');
const router = express.Router();
const { optionalAuth, authenticate } = require('../../../middleware/auth.middleware');
const { query, queryOne } = require('../../../config/database');
const crypto = require('crypto');
const logger = require('../../../config/logger');

// NOW() is PostgreSQL-only; SQLite needs CURRENT_TIMESTAMP.
const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';
const useSqlite = process.env.USE_SQLITE === 'true';

// GET Cart Items (with multi-shop grouping D6 & stock/price revalidation C6)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User ID or Session ID is required' });
    }

    const ownerColumn = userId ? 'c.user_id' : 'c.session_id';
    const rows = await query(
      `SELECT c.id, c.quantity, c.custom_options,
              p.id AS product_id, p.name AS product_name, p.price, p.image_url,
              COALESCE(p.inventory_count, p.stock, 0) AS current_stock,
              s.id AS shop_id, s.name AS shop_name, s.category AS shop_category,
              COALESCE(s.delivery_fee, 0) AS delivery_fee,
              COALESCE(s.min_order_amount, 0) AS min_order_amount
         FROM cart_items c
         JOIN shop_products p ON p.id = c.product_id
         LEFT JOIN local_shops s ON s.id = p.shop_id
        WHERE ${ownerColumn} = $1
        ORDER BY c.created_at DESC`,
      [userId || sessionId]
    ).then((r) => r.rows || r || []);

    const formattedItems = [];
    const shopsMap = new Map();
    let totalItems = 0;
    let grandSubtotal = 0;

    for (const row of rows) {
      let customOptions = null;
      try {
        customOptions = row.custom_options ? JSON.parse(row.custom_options) : null;
      } catch {
        customOptions = null;
      }

      const price = Number(row.price) || 0;
      const quantity = Number(row.quantity) || 1;
      const itemSubtotal = price * quantity;
      const availableStock = Number(row.current_stock) || 0;
      const isOutOfStock = availableStock < quantity;

      const itemObj = {
        id: row.id,
        quantity,
        customOptions,
        price,
        itemSubtotal,
        availableStock,
        isOutOfStock,
        product: {
          id: row.product_id,
          name: row.product_name,
          price,
          imageUrl: row.image_url || null,
          availableStock,
          isOutOfStock,
          shop: {
            id: row.shop_id,
            name: row.shop_name,
            category: row.shop_category || 'Shop',
          },
        },
      };

      formattedItems.push(itemObj);
      totalItems += quantity;
      grandSubtotal += itemSubtotal;

      // Group per shop (D6 multi-shop cart model)
      const shopId = row.shop_id || 'unknown';
      if (!shopsMap.has(shopId)) {
        shopsMap.set(shopId, {
          shop: {
            id: row.shop_id,
            name: row.shop_name,
            category: row.shop_category || 'Shop',
            deliveryFee: Number(row.delivery_fee) || 0,
            minOrderAmount: Number(row.min_order_amount) || 0,
          },
          items: [],
          subtotal: 0,
          deliveryFee: Number(row.delivery_fee) || 0,
          total: 0,
          meetsMinOrder: false,
          hasOutOfStockItems: false
        });
      }

      const shopGroup = shopsMap.get(shopId);
      shopGroup.items.push(itemObj);
      shopGroup.subtotal += itemSubtotal;
      if (isOutOfStock) {
        shopGroup.hasOutOfStockItems = true;
      }
    }

    let totalDeliveryFee = 0;
    const shops = Array.from(shopsMap.values()).map((sg) => {
      sg.meetsMinOrder = sg.subtotal >= sg.shop.minOrderAmount;
      sg.total = sg.subtotal + sg.deliveryFee;
      totalDeliveryFee += sg.deliveryFee;
      return sg;
    });

    const grandTotal = grandSubtotal + totalDeliveryFee;

    res.json({
      success: true,
      cartItems: formattedItems,
      shops,
      summary: {
        totalItems,
        subtotal: grandSubtotal,
        deliveryFeeTotal: totalDeliveryFee,
        grandTotal
      }
    });
  } catch (error) {
    logger.error('Cart GET Error: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch cart' });
  }
});

// POST Add or Update Cart Item
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { productId, quantity, customOptions } = req.body;
    const userId = req.user ? req.user.id : null;
    const sessionId = req.body.sessionId || req.headers['x-session-id'];

    if ((!userId && !sessionId) || !productId || quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty)) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    if (qty > 0) {
      const product = await queryOne(
        'SELECT COALESCE(inventory_count, stock, 0) AS stock_available, track_inventory FROM shop_products WHERE id = $1',
        [productId]
      );

      if (product && Number(product.track_inventory ?? 1) === 1) {
        const available = Number(product.stock_available ?? 0);
        if (available < qty) {
          return res.status(400).json({
            error: 'Insufficient inventory',
            available
          });
        }
      }
    }

    const customOptionsStr = customOptions ? JSON.stringify(customOptions) : null;
    const ownerCol = userId ? 'user_id' : 'session_id';
    const ownerVal = userId || sessionId;

    const optionsCondition = process.env.USE_SQLITE === 'true'
      ? '((custom_options IS NULL AND $3 IS NULL) OR custom_options = $3)'
      : '(custom_options IS NOT DISTINCT FROM $3::text)';

    // Check for existing cart item
    const existingItem = await queryOne(
      `SELECT * FROM cart_items
        WHERE ${ownerCol} = $1 AND product_id = $2
          AND ${optionsCondition}
        LIMIT 1`,
      [ownerVal, productId, customOptionsStr]
    );

    let result;
    if (existingItem) {
      if (qty <= 0) {
        await query('DELETE FROM cart_items WHERE id = $1', [existingItem.id]);
        return res.json({ success: true, message: 'Item removed', action: 'deleted' });
      }
      await query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [qty, existingItem.id]);
      result = { ...existingItem, quantity: qty };
    } else {
      if (qty <= 0) {
        return res.json({ success: true, message: 'Quantity is 0, nothing added' });
      }
      let newId;
      if (process.env.USE_SQLITE === 'true') {
        newId = crypto.randomUUID();
        await query(
          `INSERT INTO cart_items
             (id, user_id, session_id, product_id, quantity, custom_options, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, ${NOW})`,
          [newId, userId || null, sessionId || null, productId, qty, customOptionsStr]
        );
      } else {
        const inserted = await query(
          `INSERT INTO cart_items
             (user_id, session_id, product_id, quantity, custom_options, created_at)
           VALUES ($1, $2, $3, $4, $5, ${NOW})
           RETURNING id`,
          [userId || null, sessionId || null, productId, qty, customOptionsStr]
        );
        newId = inserted.rows?.[0]?.id || inserted?.[0]?.id;
      }

      result = {
        id: newId,
        user_id: userId || null,
        session_id: sessionId || null,
        product_id: productId,
        quantity: qty,
        custom_options: customOptionsStr
      };
    }

    res.json({
      success: true,
      cartItem: {
        ...result,
        productId: result.product_id || result.productId,
        product_id: result.product_id || result.productId
      }
    });
  } catch (error) {
    logger.error('Cart POST Error: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to update cart' });
  }
});

// POST Merge Guest Cart on Login (C6)
router.post('/merge', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.body.sessionId || req.headers['x-session-id'];

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required to merge cart' });
    }

    // Fetch guest items
    const guestItems = await query(
      'SELECT id, product_id, quantity, custom_options FROM cart_items WHERE session_id = $1',
      [sessionId]
    ).then((r) => r.rows || r || []);

    if (guestItems.length === 0) {
      return res.json({ success: true, message: 'No guest items to merge', mergedCount: 0 });
    }

    let mergedCount = 0;
    for (const item of guestItems) {
      const optionsCondition = process.env.USE_SQLITE === 'true'
        ? '((custom_options IS NULL AND $3 IS NULL) OR custom_options = $3)'
        : '(custom_options IS NOT DISTINCT FROM $3::text)';

      // Check if user already has this product with same options
      const existingUserItem = await queryOne(
        `SELECT id, quantity FROM cart_items
          WHERE user_id = $1 AND product_id = $2
            AND ${optionsCondition}
          LIMIT 1`,
        [userId, item.product_id, item.custom_options]
      );

      if (existingUserItem) {
        const newQty = existingUserItem.quantity + item.quantity;
        await query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [newQty, existingUserItem.id]);
        await query('DELETE FROM cart_items WHERE id = $1', [item.id]);
      } else {
        await query('UPDATE cart_items SET user_id = $1, session_id = NULL WHERE id = $2', [userId, item.id]);
      }
      mergedCount++;
    }

    logger.info(`[Cart] Merged ${mergedCount} items from session ${sessionId} to user ${userId}`);
    res.json({ success: true, message: `Merged ${mergedCount} items`, mergedCount });
  } catch (error) {
    logger.error('Cart Merge Error: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to merge cart' });
  }
});

// DELETE Single Cart Item
router.delete('/:itemId', optionalAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user ? req.user.id : null;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User ID or Session ID is required' });
    }

    const ownerCol = userId ? 'user_id' : 'session_id';
    const ownerVal = userId || sessionId;

    const deleted = await query(
      `DELETE FROM cart_items WHERE id = $1 AND ${ownerCol} = $2`,
      [itemId, ownerVal]
    );

    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    logger.error('Cart Item DELETE Error: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to delete cart item' });
  }
});

// DELETE Clear Entire Cart
router.delete('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User ID or Session ID is required' });
    }

    const ownerCol = userId ? 'user_id' : 'session_id';
    const ownerVal = userId || sessionId;

    await query(`DELETE FROM cart_items WHERE ${ownerCol} = $1`, [ownerVal]);

    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    logger.error('Cart DELETE Error: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to clear cart' });
  }
});

module.exports = router;

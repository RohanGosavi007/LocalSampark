const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
const { optionalAuth } = require('../../../middleware/auth.middleware');

// GET Cart Items
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User ID or Session ID is required' });
    }

    let cartQuery = `
      SELECT c.*, p.name as product_name, p.price as product_price, 
             s.id as shop_id, s.name as shop_name, s.category as shop_category
      FROM cart_items c
      JOIN shop_products p ON c.product_id = p.id
      JOIN local_shops s ON p.shop_id = s.id
      WHERE `;
    
    let params = [];
    if (userId) {
      cartQuery += `c.user_id = ?`;
      params.push(userId);
    } else {
      cartQuery += `c.session_id = ?`;
      params.push(sessionId);
    }

    const items = await query(cartQuery, params);
    
    // Format response to match existing frontend expectations
    const formattedItems = (items.rows || items).map(item => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.product_price,
        shop: {
          id: item.shop_id,
          name: item.shop_name,
          category: item.shop_category
        }
      }
    }));

    res.json({ success: true, cartItems: formattedItems });
  } catch (error) {
    console.error('Cart GET Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cart' });
  }
});

// POST Add to Cart
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user ? req.user.id : null;
    const sessionId = req.body.sessionId || req.headers['x-session-id'];

    if ((!userId && !sessionId) || !productId || quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (quantity > 0) {
      const product = await queryOne('SELECT track_inventory, inventory_count FROM shop_products WHERE id = ?', [productId]);
      if (product && product.track_inventory === 1 && product.inventory_count < quantity) {
        return res.status(400).json({ error: 'Insufficient inventory', available: product.inventory_count });
      }
    }

    // Check if item exists
    let existingItem;
    if (userId) {
      existingItem = await queryOne('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
    } else {
      existingItem = await queryOne('SELECT id, quantity FROM cart_items WHERE session_id = ? AND product_id = ?', [sessionId, productId]);
    }

    let result;
    if (existingItem) {
      if (quantity === 0) {
        await query('DELETE FROM cart_items WHERE id = ?', [existingItem.id]);
        return res.json({ success: true, message: 'Item removed' });
      } else {
        await query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, existingItem.id]);
        result = await queryOne('SELECT * FROM cart_items WHERE id = ?', [existingItem.id]);
      }
    } else {
      if (quantity > 0) {
        const insertRes = await query(
          'INSERT INTO cart_items (user_id, session_id, product_id, quantity) VALUES (?, ?, ?, ?)',
          [userId || null, sessionId || null, productId, quantity]
        );
        result = await queryOne('SELECT * FROM cart_items WHERE id = ?', [insertRes.lastID]);
      } else {
        return res.json({ success: true, message: 'Quantity is 0, nothing added' });
      }
    }

    res.json({ success: true, cartItem: result });
  } catch (error) {
    console.error('Cart POST Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update cart' });
  }
});

module.exports = router;

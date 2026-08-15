const express = require('express');
const router = express.Router();
const prisma = require('../../../../prisma/client');
const { optionalAuth } = require('../../../middleware/auth.middleware');
const { query, queryOne } = require('../../../config/database');
const useSqlite = process.env.USE_SQLITE === 'true';

// GET Cart Items
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: 'User ID or Session ID is required' });
    }

    const whereClause = userId ? { userId } : { sessionId };

    const items = await prisma.cartItem.findMany({
      where: whereClause,
      include: {
        product: {
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                categoryType: true,
                category: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });

    // Format response to match existing frontend expectations
    const formattedItems = items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      customOptions: item.customOptions ? JSON.parse(item.customOptions) : null,
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.pricePaise, // Keeping standard fields
        shop: {
          id: item.product.shop.id,
          name: item.product.shop.name,
          category: item.product.shop.category?.name || 'Shop'
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
    const { productId, quantity, customOptions } = req.body;
    const userId = req.user ? req.user.id : null;
    const sessionId = req.body.sessionId || req.headers['x-session-id'];

    if ((!userId && !sessionId) || !productId || quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SQLite fallback — Prisma targets the remote PostgreSQL database
    if (useSqlite) {
      // Stock check against local shop_products
      if (quantity > 0) {
        const product = await queryOne(
          'SELECT stock_qty FROM shop_products WHERE id = $1',
          [productId]
        );
        if (product && product.stock_qty !== null && product.stock_qty < quantity) {
          return res.status(400).json({ error: 'Insufficient inventory', available: product.stock_qty });
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
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stockQuantity: true }
      });
      if (product && product.stockQuantity < quantity) {
        return res.status(400).json({ error: 'Insufficient inventory', available: product.stockQuantity });
      }
    }

    const customOptionsStr = customOptions ? JSON.stringify(customOptions) : null;
    const whereClause = {
      productId: productId,
      customOptions: customOptionsStr
    };
    if (userId) {
      whereClause.userId = userId;
    } else {
      whereClause.sessionId = sessionId;
    }

    let existingItem = await prisma.cartItem.findFirst({
      where: whereClause
    });

    let result;
    if (existingItem) {
      if (quantity === 0) {
        await prisma.cartItem.delete({ where: { id: existingItem.id } });
        return res.json({ success: true, message: 'Item removed' });
      } else {
        result = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity }
        });
      }
    } else {
      if (quantity > 0) {
        result = await prisma.cartItem.create({
          data: {
            userId: userId || null,
            sessionId: sessionId || null,
            productId: productId,
            quantity: quantity,
            customOptions: customOptionsStr
          }
        });
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

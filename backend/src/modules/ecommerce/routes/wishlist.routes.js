const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticate, optionalAuth } = require('../../../middleware/auth.middleware');
const { query, queryOne } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * GET /api/v1/wishlist
 * Returns all saved products in the authenticated user's wishlist.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const items = await query(
      `SELECT w.id, w.product_id, w.shop_id, w.created_at,
              p.name AS product_name, p.price, p.mrp, p.image_url,
              COALESCE(p.inventory_count, p.stock, 0) AS current_stock,
              p.is_available,
              s.name AS shop_name, s.category AS shop_category,
              COALESCE(s.delivery_fee, 0) AS delivery_fee
         FROM shop_wishlists w
         JOIN shop_products p ON p.id = w.product_id
         LEFT JOIN local_shops s ON s.id = w.shop_id
        WHERE w.user_id = $1
        ORDER BY w.created_at DESC`,
      [userId]
    ).then((r) => r.rows || r || []);

    res.json({
      success: true,
      count: items.length,
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        shopId: item.shop_id,
        productName: item.product_name,
        price: Number(item.price) || 0,
        mrp: Number(item.mrp) || Number(item.price) || 0,
        imageUrl: item.image_url,
        currentStock: Number(item.current_stock) || 0,
        isAvailable: Boolean(item.is_available ?? true),
        shopName: item.shop_name,
        shopCategory: item.shop_category,
        deliveryFee: Number(item.delivery_fee) || 0,
        createdAt: item.created_at
      }))
    });
  } catch (error) {
    logger.error('[Wishlist GET] Error: ' + error.message);
    next(error);
  }
});

/**
 * POST /api/v1/wishlist/:productId
 * Adds a product to the user's wishlist (idempotent).
 */
router.post('/:productId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const product = await queryOne(
      'SELECT id, shop_id, name FROM shop_products WHERE id = $1',
      [productId]
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const existing = await queryOne(
      'SELECT id FROM shop_wishlists WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (existing) {
      return res.json({
        success: true,
        saved: true,
        id: existing.id,
        message: 'Product already in wishlist'
      });
    }

    const id = crypto.randomUUID();
    await query(
      'INSERT INTO shop_wishlists (id, user_id, product_id, shop_id) VALUES ($1, $2, $3, $4)',
      [id, userId, productId, product.shop_id]
    );

    logger.info(`[Wishlist] Added product ${productId} to user ${userId} wishlist`);
    res.status(201).json({
      success: true,
      saved: true,
      id,
      message: 'Product added to wishlist'
    });
  } catch (error) {
    logger.error('[Wishlist POST] Error: ' + error.message);
    next(error);
  }
});

/**
 * DELETE /api/v1/wishlist/:productId
 * Removes a product from the user's wishlist.
 */
router.delete('/:productId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    await query(
      'DELETE FROM shop_wishlists WHERE user_id = $1 AND (product_id = $2 OR id = $2)',
      [userId, productId]
    );

    logger.info(`[Wishlist] Removed product ${productId} from user ${userId} wishlist`);
    res.json({
      success: true,
      saved: false,
      message: 'Product removed from wishlist'
    });
  } catch (error) {
    logger.error('[Wishlist DELETE] Error: ' + error.message);
    next(error);
  }
});

/**
 * POST /api/v1/wishlist/:productId/move-to-cart
 * Quick add-to-cart: Moves a saved item from wishlist into the shopping cart.
 */
router.post('/:productId/move-to-cart', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const wishlistItem = await queryOne(
      'SELECT id, product_id FROM shop_wishlists WHERE user_id = $1 AND (product_id = $2 OR id = $2)',
      [userId, productId]
    );

    if (!wishlistItem) {
      return res.status(404).json({ success: false, error: 'Product not found in wishlist' });
    }

    const actualProductId = wishlistItem.product_id;

    // Check product inventory
    const product = await queryOne(
      'SELECT id, name, price, COALESCE(inventory_count, stock, 0) AS stock_available, track_inventory FROM shop_products WHERE id = $1',
      [actualProductId]
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product is no longer available' });
    }

    if (Number(product.track_inventory ?? 1) === 1 && Number(product.stock_available ?? 0) < 1) {
      return res.status(400).json({ success: false, error: 'Product is currently out of stock' });
    }

    // Add or increment in cart_items
    const existingCartItem = await queryOne(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2 AND custom_options IS NULL LIMIT 1',
      [userId, actualProductId]
    );

    if (existingCartItem) {
      await query(
        'UPDATE cart_items SET quantity = quantity + 1 WHERE id = $1',
        [existingCartItem.id]
      );
    } else {
      const cartItemId = crypto.randomUUID();
      await query(
        'INSERT INTO cart_items (id, user_id, product_id, quantity) VALUES ($1, $2, $3, 1)',
        [cartItemId, userId, actualProductId]
      );
    }

    // Remove from wishlist
    await query('DELETE FROM shop_wishlists WHERE id = $1', [wishlistItem.id]);

    logger.info(`[Wishlist] Moved product ${actualProductId} to cart for user ${userId}`);
    res.json({
      success: true,
      message: 'Product moved to cart successfully',
      productId: actualProductId
    });
  } catch (error) {
    logger.error('[Wishlist Move to Cart] Error: ' + error.message);
    next(error);
  }
});

module.exports = router;

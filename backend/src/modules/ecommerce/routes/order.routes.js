const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne, transaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { sendNewOrderNotification, sendOrderConfirmation } = require('../../core/services/email.service');


// Validate Coupon
router.post('/validate-coupon', authenticate, async (req, res, next) => {
  try {
    const { code, cartTotal } = req.body;
    if (!code || !cartTotal) {
      return res.status(400).json({ error: 'Coupon code and cart total are required' });
    }

    // Mock validation logic
    const validCoupons = {
      'WELCOME50': { type: 'fixed', value: 50, minOrder: 200, message: 'â‚¹50 off on your first order!' },
      'FREEDELIVERY': { type: 'free_delivery', value: 0, minOrder: 150, message: 'Free delivery applied!' },
      'SAVE10': { type: 'percentage', value: 10, maxDiscount: 100, minOrder: 300, message: '10% off applied!' }
    };

    const coupon = validCoupons[code.toUpperCase()];

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon code' });
    }

    if (cartTotal < coupon.minOrder) {
      return res.status(400).json({ error: `Minimum order value for this coupon is â‚¹${coupon.minOrder}` });
    }

    let discount = 0;
    if (coupon.type === 'fixed') {
      discount = coupon.value;
    } else if (coupon.type === 'percentage') {
      discount = (cartTotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.type === 'free_delivery') {
      // Handled on frontend
      discount = 0; 
    }

    res.json({
      success: true,
      coupon: {
        code: code.toUpperCase(),
        type: coupon.type,
        discount,
        message: coupon.message
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── ORDER HISTORY & STATUS ──────────────────────────────────────────────────
// The mobile useOrders hook has always called these three endpoints; they were
// never implemented, so order history and status updates returned 404.

const ORDER_STATUSES = [
  'pending', 'confirmed', 'preparing', 'ready',
  'assigned', 'out_for_delivery', 'delivered', 'cancelled'
];

async function attachItems(orders) {
  if (orders.length === 0) return orders;

  // One batched fetch rather than a query per order.
  const itemRows = await query(
    `SELECT order_id, product_id, name, price, quantity
       FROM order_items
      WHERE order_id = ANY($1::uuid[])`,
    [orders.map((o) => o.id)]
  );

  const byOrder = new Map();
  for (const row of itemRows.rows || itemRows) {
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, []);
    byOrder.get(row.order_id).push(row);
  }
  for (const o of orders) o.items = byOrder.get(o.id) || [];
  return orders;
}

// A user's own order history.
router.get('/user/:userId', authenticate, async (req, res, next) => {
  try {
    if (String(req.params.userId) !== String(req.user.id) && !req.user.is_admin) {
      return res.status(403).json({ error: 'You can only view your own orders' });
    }

    const result = await query(
      `SELECT o.*, s.name AS shop_name, s.photo_urls AS shop_photos
         FROM orders o
         LEFT JOIN local_shops s ON o.shop_id = s.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT 100`,
      [req.params.userId]
    );

    res.json({ success: true, orders: await attachItems(result.rows || result) });
  } catch (error) {
    next(error);
  }
});

// A shop owner's incoming orders. Rows carry customer contact details, so this
// is restricted to the shop's owner.
router.get('/shop/:shopId', authenticate, async (req, res, next) => {
  try {
    const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [req.params.shopId]);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    if (String(shop.owner_id) !== String(req.user.id) && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorised to view orders for this shop' });
    }

    const result = await query(
      `SELECT o.*, u.full_name AS customer_name, u.phone_number AS customer_phone
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
        WHERE o.shop_id = $1
        ORDER BY o.created_at DESC
        LIMIT 200`,
      [req.params.shopId]
    );

    res.json({ success: true, orders: await attachItems(result.rows || result) });
  } catch (error) {
    next(error);
  }
});

router.put('/:orderId/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }

    const order = await queryOne(
      `SELECT o.id, o.user_id, s.owner_id
         FROM orders o
         LEFT JOIN local_shops s ON o.shop_id = s.id
        WHERE o.id = $1`,
      [req.params.orderId]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isOwner = String(order.owner_id) === String(req.user.id);
    const isCustomerCancelling = String(order.user_id) === String(req.user.id) && status === 'cancelled';
    if (!isOwner && !isCustomerCancelling && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorised to update this order' });
    }

    await query(
      'UPDATE orders SET order_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, req.params.orderId]
    );

    const io = req.app.get('io');
    if (io) io.to(`order_${req.params.orderId}`).emit('ORDER_STATUS_UPDATED', { orderId: req.params.orderId, status });

    res.json({ success: true, orderId: req.params.orderId, status });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /my-orders — the signed-in user's order history.
 *
 * apps/mobile/app/orders/index.js has always called this; only
 * /orders/user/:userId existed, which the screen has no user id to fill in.
 * It is declared ahead of any '/:id' route so the literal path is matched
 * first rather than being captured as an id.
 *
 * items_count is aggregated here because the list renders it per row;
 * fetching order_items separately would be N+1 across the whole history.
 */
router.get('/my-orders', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT o.id,
              o.total_amount,
              o.order_status AS status,
              o.created_at,
              o.fulfillment_method,
              COALESCE(s.name, 'LocalSampark') AS shop_name,
              (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT 100`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows || result || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /:orderId — a single order.
 *
 * The tracking screen calls /orders/:id expecting `data.order`. The only
 * per-order route in the codebase was GET /tracking/:orderId, which returns a
 * deliveryRoute row and a completely different shape.
 *
 * Scoped to the requesting user: order ids are UUIDs, but that is obscurity,
 * not authorisation.
 */
router.get('/:orderId', authenticate, async (req, res, next) => {
  try {
    const order = await queryOne(
      `SELECT o.*,
              COALESCE(s.name, 'LocalSampark') AS shop_name
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
        WHERE o.id = $1 AND o.user_id = $2`,
      [req.params.orderId, req.user.id]
    );

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const items = await query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [req.params.orderId]
    );

    res.json({
      success: true,
      order: { ...order, status: order.order_status || order.status },
      items: items.rows || items || [],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

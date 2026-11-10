const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne, transaction } = require('../../../config/database');
const { placeholders } = require('../../../utils/sqlList');
const lifecycle = require('../../../services/orderLifecycle.service');
const { authenticate } = require('../../../middleware/auth.middleware');
const { sendNewOrderNotification, sendOrderConfirmation } = require('../../core/services/email.service');
const couponService = require('../../../services/coupon.service');
const invoiceService = require('../../../services/invoice.service');
const { getOrderTrackingPayload } = require('../../services/routes/tracking.routes');
const returnController = require('../controllers/return.controller');


// Validate Coupon (Database-backed)
router.post('/validate-coupon', authenticate, async (req, res, next) => {
  try {
    const { code, cartTotal, shopId } = req.body;
    if (!code || cartTotal === undefined || cartTotal === null) {
      return res.status(400).json({ error: 'Coupon code and cart total are required' });
    }

    try {
      const result = await couponService.validateCoupon({
        code,
        cartTotal,
        userId: req.user?.id,
        shopId
      });

      res.json({
        success: true,
        coupon: result.coupon
      });
    } catch (err) {
      if (err instanceof couponService.CouponError) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      throw err;
    }
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
      WHERE order_id IN (${placeholders(orders.length)})`,
    orders.map((o) => o.id)
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

// The rules are in services/orderLifecycle.service.js. This handler let a
// shop set any status from any other, with no check on payment.
router.put('/:orderId/status', authenticate, async (req, res, next) => {
  try {
    let outcome;
    try {
      outcome = await lifecycle.changeStatus({
        orderId: req.params.orderId,
        to: req.body.status,
        user: req.user,
        reason: req.body.reason || req.body.cancellationReason,
      });
    } catch (error) {
      if (error instanceof lifecycle.LifecycleError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      throw error;
    }

    const io = req.app.get('io');
    if (io && !outcome.unchanged) {
      io.to(`order_${req.params.orderId}`).emit('ORDER_STATUS_UPDATED', { orderId: req.params.orderId, status: outcome.to });
    }

    res.json({ success: true, orderId: req.params.orderId, status: outcome.to, refund: outcome.refund });
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



/**
 * PUT /orders/:orderId/accept
 * Kitchen display: Accept incoming order (pending -> confirmed) (S3)
 */
router.put('/:orderId/accept', authenticate, async (req, res, next) => {
  try {
    let outcome;
    try {
      outcome = await lifecycle.changeStatus({
        orderId: req.params.orderId,
        to: 'confirmed',
        user: req.user,
      });
    } catch (error) {
      if (error instanceof lifecycle.LifecycleError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      throw error;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${req.params.orderId}`).emit('ORDER_STATUS_UPDATED', { orderId: req.params.orderId, status: 'confirmed' });
    }

    res.json({ success: true, orderId: req.params.orderId, status: 'confirmed' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /orders/:orderId/reject
 * Kitchen display: Reject order with mandatory reason (pending -> cancelled) (S3)
 */
router.put('/:orderId/reject', authenticate, async (req, res, next) => {
  try {
    const reason = req.body.reason || req.body.cancellationReason || req.body.reason_code;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    let outcome;
    try {
      outcome = await lifecycle.changeStatus({
        orderId: req.params.orderId,
        to: 'cancelled',
        user: req.user,
        reason: String(reason).trim(),
      });
    } catch (error) {
      if (error instanceof lifecycle.LifecycleError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      throw error;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${req.params.orderId}`).emit('ORDER_STATUS_UPDATED', { orderId: req.params.orderId, status: 'cancelled', reason: String(reason).trim() });
    }

    res.json({ success: true, orderId: req.params.orderId, status: 'cancelled', reason: String(reason).trim(), refund: outcome.refund });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /orders/:orderId/packing-slip
 * 80mm ESC/POS Monospace Thermal Packing Slip Generator (S3)
 */
router.get('/:orderId/packing-slip', authenticate, async (req, res, next) => {
  try {
    const order = await queryOne(
      `SELECT o.*,
              s.name AS shop_name, s.address AS shop_address, s.phone AS shop_phone,
              s.gstin, s.fssai_license_number, s.owner_id AS shop_owner_id,
              u.full_name AS customer_name, u.phone_number AS customer_phone
         FROM orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
         LEFT JOIN users u ON u.id = o.user_id
        WHERE o.id = $1`,
      [req.params.orderId]
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isOwner = order.shop_owner_id && String(order.shop_owner_id) === String(req.user.id);
    const isCustomer = order.user_id && String(order.user_id) === String(req.user.id);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.is_admin;
    if (!isOwner && !isCustomer && !isAdmin) {
      return res.status(403).json({ error: 'Not authorised to view packing slip for this order' });
    }

    const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.orderId]);
    const items = itemsRes.rows || itemsRes || [];

    const W = 48; // 48-char standard for 80mm thermal receipt
    const div = '-'.repeat(W);
    const eqDiv = '='.repeat(W);
    const center = (str) => {
      const s = String(str || '').slice(0, W);
      const pad = Math.max(0, Math.floor((W - s.length) / 2));
      return ' '.repeat(pad) + s;
    };
    const row = (left, right) => {
      const l = String(left || '');
      const r = String(right || '');
      const spaces = Math.max(1, W - l.length - r.length);
      return l + ' '.repeat(spaces) + r;
    };

    const lines = [];
    lines.push(eqDiv);
    lines.push(center('LOCAL SAMPARK'));
    lines.push(center('KITCHEN PACKING SLIP'));
    lines.push(eqDiv);
    lines.push(center(order.shop_name || 'Local Shop'));
    if (order.shop_address) lines.push(center(order.shop_address));
    const complianceParts = [];
    if (order.fssai_license_number) complianceParts.push(`FSSAI: ${order.fssai_license_number}`);
    if (order.gstin) complianceParts.push(`GSTIN: ${order.gstin}`);
    if (complianceParts.length > 0) lines.push(center(complianceParts.join(' | ')));
    lines.push(div);
    lines.push(row(`Order : #${String(order.id).slice(0, 8).toUpperCase()}`, `Status: ${(order.order_status || order.status || 'PENDING').toUpperCase()}`));
    lines.push(row(`Date  : ${new Date(order.created_at || Date.now()).toLocaleString('en-IN')}`, `Type: ${(order.fulfillment_method || 'DELIVERY').toUpperCase()}`));
    lines.push(div);
    lines.push(row('Customer:', order.customer_name || 'Guest User'));
    if (order.customer_phone) lines.push(row('Phone   :', order.customer_phone));
    if (order.delivery_address) lines.push(row('Address :', String(order.delivery_address).slice(0, 38)));
    lines.push(div);
    lines.push(row('ITEM', 'QTY   AMOUNT'));
    lines.push(div);

    for (const it of items) {
      const itemName = String(it.name || 'Item').slice(0, 32);
      const qtyStr = `x${it.quantity}`;
      const amtStr = `Rs. ${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)}`;
      lines.push(row(itemName, `${qtyStr.padEnd(5)} ${amtStr}`));
    }

    lines.push(div);
    if (order.subtotal !== null && order.subtotal !== undefined) {
      lines.push(row('Subtotal:', `Rs. ${Number(order.subtotal).toFixed(2)}`));
    }
    if (Number(order.delivery_fee) > 0) {
      lines.push(row('Delivery Fee:', `Rs. ${Number(order.delivery_fee).toFixed(2)}`));
    }
    if (Number(order.discount) > 0) {
      lines.push(row('Discount:', `-Rs. ${Number(order.discount).toFixed(2)}`));
    }
    lines.push(row('GRAND TOTAL:', `Rs. ${Number(order.total_amount || 0).toFixed(2)}`));
    lines.push(div);

    const isCod = String(order.payment_method || '').toUpperCase() === 'COD';
    lines.push(center(`PAYMENT: ${isCod ? 'CASH ON DELIVERY (COD)' : 'PAID ONLINE'}`));
    if (isCod) {
      lines.push(center(`*** COLLECT Rs. ${Number(order.total_amount || 0).toFixed(2)} CASH ***`));
    }
    if (order.special_instructions) {
      lines.push(div);
      lines.push(`Notes: ${order.special_instructions}`);
    }
    lines.push(eqDiv);
    lines.push(center('Thank You for Supporting Local!'));
    lines.push(eqDiv);

    const textSlip = lines.join('\n');

    if (req.query.format === 'json') {
      return res.json({
        success: true,
        orderId: order.id,
        slipText: textSlip,
        metadata: {
          shopName: order.shop_name,
          customerName: order.customer_name,
          itemsCount: items.length,
          totalAmount: Number(order.total_amount || 0),
          isCod,
        }
      });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(textSlip);
  } catch (error) {
    next(error);
  }
});

// ─── AFTER-ORDER EXPERIENCE (C10, C11, C12, C13) ──────────────────────────────

// GET /orders/:id/tracking - Real-time tracking and delivery milestone timeline
router.get('/:id/tracking', authenticate, async (req, res, next) => {
  try {
    const tracking = await getOrderTrackingPayload(req.params.id, req.user);
    res.json({ success: true, tracking });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// GET /orders/:id/invoice - JSON invoice metadata
router.get('/:id/invoice', authenticate, async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await queryOne('SELECT user_id, shop_id FROM orders WHERE id = $1', [orderId]);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const requesterId = req.user?.id || req.user?.userId;
    const isStaff = ['admin', 'super_admin', 'superadmin', 'territory_admin', 'franchise_owner'].includes(String(req.user?.role || '').toLowerCase()) || req.user?.isSuperAdmin;

    if (!isStaff && String(order.user_id) !== String(requesterId)) {
      // Check if user is the shop owner
      const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [order.shop_id]);
      if (!shop || String(shop.owner_id) !== String(requesterId)) {
        return res.status(403).json({ success: false, error: 'Not authorized to view invoice for this order' });
      }
    }

    const invoice = await invoiceService.generateOrderInvoice(orderId);
    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
});

// GET /orders/:id/invoice/pdf - Stream GST Section 31 Tax Invoice PDF
router.get('/:id/invoice/pdf', authenticate, async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await queryOne('SELECT user_id, shop_id FROM orders WHERE id = $1', [orderId]);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const requesterId = req.user?.id || req.user?.userId;
    const isStaff = ['admin', 'super_admin', 'superadmin', 'territory_admin', 'franchise_owner'].includes(String(req.user?.role || '').toLowerCase()) || req.user?.isSuperAdmin;

    if (!isStaff && String(order.user_id) !== String(requesterId)) {
      const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [order.shop_id]);
      if (!shop || String(shop.owner_id) !== String(requesterId)) {
        return res.status(403).json({ success: false, error: 'Not authorized to download invoice for this order' });
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${orderId}.pdf"`);

    await invoiceService.streamInvoicePdf(orderId, res);
  } catch (error) {
    next(error);
  }
});

// POST /orders/:id/returns - Submit customer return / refund request
router.post('/:id/returns', authenticate, returnController.submitReturn);

// POST /orders/:id/support - Submit support ticket or grievance linked to order
router.post('/:id/support', authenticate, async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { subject, description, category = 'order_issue', isStatutory = false } = req.body || {};
    const userId = req.user.id || req.user.userId;

    if (!subject || !description) {
      return res.status(400).json({ success: false, error: 'subject and description are required' });
    }

    const order = await queryOne('SELECT user_id, shop_id FROM orders WHERE id = $1', [orderId]);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (String(order.user_id) !== String(userId)) {
      return res.status(403).json({ success: false, error: 'You can only request support for your own orders' });
    }

    const ticketId = crypto.randomUUID();
    const isStatutoryBool = Boolean(isStatutory);
    const priority = isStatutoryBool ? 'high' : 'medium';
    const officer = isStatutoryBool ? 'Rohan Gosavi (Grievance Officer)' : null;
    const isStatutoryParam = process.env.USE_SQLITE === 'true' ? (isStatutoryBool ? 1 : 0) : isStatutoryBool;
    const NOW = process.env.USE_SQLITE === 'true' ? 'CURRENT_TIMESTAMP' : 'NOW()';

    await query(
      `INSERT INTO support_tickets
         (id, user_id, order_id, subject, description, category, priority, status, is_statutory, acknowledged_at, grievance_officer, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, ${NOW}, $9, ${NOW}, ${NOW})`,
      // order_id is kept on the ticket now (migration 137); it was only echoed back.
      [ticketId, userId, String(orderId), String(subject).trim(), String(description).trim(), String(category).toLowerCase(), priority, isStatutoryParam, officer]
    );

    const ticket = await queryOne('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
    const createdAtTime = new Date(ticket.created_at || Date.now()).getTime();
    const slaDueAt = new Date(createdAtTime + (30 * 24 * 60 * 60 * 1000)).toISOString();

    res.status(201).json({
      success: true,
      ticket: {
        id: ticket.id,
        orderId,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        isStatutory: isStatutoryBool,
        acknowledgedAt: ticket.acknowledged_at,
        grievanceOfficer: ticket.grievance_officer,
        slaDueAt,
        createdAt: ticket.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


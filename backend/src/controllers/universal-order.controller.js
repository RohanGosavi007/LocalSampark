const { query, queryOne, queryMany, withTransaction } = require('../config/database');
const { placeholders } = require('../utils/sqlList');
const payments = require('../services/payments.service');

const MAX_LINES = 100;
const MAX_QUANTITY = 999;

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

/**
 * POST /universal-orders — book or reserve from a shop's universal catalogue,
 * to be paid at the shop.
 *
 * Prices come from the catalogue. paymentMethod is recorded as 'cod'; nothing
 * is collected here (see the note where other methods are refused).
 *
 * It used to record no payment method at all (the client put one in `notes`),
 * so every order looked the same to the shop whether or not it was paid for.
 */
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shopId, orderType, scheduledTime, deliveryAddress, notes, items } = req.body || {};

    if (!shopId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }
    if (items.length > MAX_LINES) {
      return res.status(400).json({ success: false, message: `An order can hold at most ${MAX_LINES} lines` });
    }

    const method = payments.paymentMethod((req.body || {}).paymentMethod);
    if (!method) {
      return res.status(400).json({ success: false, message: 'paymentMethod must be cod, razorpay or wallet' });
    }

    const itemIds = items.map((i) => i && i.id);
    if (itemIds.some((id) => !id)) {
      return res.status(400).json({ success: false, message: 'Every order item requires an id' });
    }

    // A quantity is a whole number of at least one. It was `Number(q) || 1`,
    // which let -5 through: a negative line reduced the total, and enough of
    // them made an order that cost nothing or less.
    const quantities = items.map((i) => (i.quantity === undefined || i.quantity === null ? 1 : Number(i.quantity)));
    if (quantities.some((q) => !Number.isInteger(q) || q < 1 || q > MAX_QUANTITY)) {
      return res.status(400).json({ success: false, message: 'Each item needs a whole quantity of at least 1' });
    }

    // Server-authoritative pricing: never trust client-supplied prices.
    const catalogRows = await queryMany(
      `SELECT id, price, is_active FROM universal_catalog_items WHERE shop_id = $1 AND id IN (${placeholders(itemIds.length, 2)})`,
      [shopId, ...itemIds]
    );
    const catalog = new Map(catalogRows.map((row) => [String(row.id), row]));

    for (const item of items) {
      const row = catalog.get(String(item.id));
      // is_active is BOOLEAN on PostgreSQL and 0/1 on SQLite; `=== false` alone
      // let a withdrawn item be ordered on SQLite.
      if (!row || row.is_active === false || row.is_active === 0 || row.is_active === '0') {
        return res.status(400).json({ success: false, message: `Item ${item.id} is unavailable for this shop` });
      }
    }

    const computedTotal = Math.round(
      items.reduce((sum, item, index) => sum + Number(catalog.get(String(item.id)).price) * quantities[index], 0) * 100
    ) / 100;
    if (!Number.isFinite(computedTotal) || computedTotal < 0) {
      return res.status(400).json({ success: false, message: 'This order cannot be priced' });
    }

        // These orders are paid at the shop. Money taken here — from a wallet or
    // through Razorpay — would sit with the platform: shop settlement
    // (services/payout.service.js) works from the `orders` table and never
    // sees this one, so the shop would not be paid for it. To pay in advance,
    // the same catalogue can be ordered through POST /checkout, which is
    // settled.
    if (method !== 'cod') {
      return res.status(400).json({
        success: false,
        code: 'PAY_AT_SHOP_ONLY',
        message: 'This order is paid at the shop. To pay online or from your wallet, order through checkout.',
      });
    }

    const orderId = await withTransaction(async (client) => {
      const orderResult = await client.query(
        `INSERT INTO universal_orders
           (shop_id, user_id, status, total_amount, order_type, scheduled_time, delivery_address, notes,
            payment_method, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          shopId,
          userId,
          'PENDING',
          computedTotal,
          orderType || 'retail',
          scheduledTime || null,
          deliveryAddress || null,
          notes ? String(notes).slice(0, 1000) : null,
          method,
          'pending',
        ]
      );
      const newOrderId = orderResult.rows[0].id;

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        await client.query(
          `INSERT INTO universal_order_items (order_id, item_id, quantity, price_at_time, meta_data)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newOrderId,
            item.id,
            quantities[index],
            catalog.get(String(item.id)).price,
            item.metaData ? JSON.stringify(item.metaData) : null,
          ]
        );
      }

      return newOrderId;
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId,
      totalAmount: computedTotal,
      paymentMethod: method,
      paymentStatus: 'pending',
    });
  } catch (error) {
    console.error('Error creating universal order:', error);
    res.status(500).json({ success: false, message: 'Server error creating order' });
  }
};

exports.getShopOrders = async (req, res) => {
  try {
    const { shopId } = req.params;

    // Ownership guard: order rows expose customer name and phone.
    const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    if (String(shop.owner_id) !== String(req.user.id) && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: 'Not authorised to view orders for this shop' });
    }

    const orders = await queryMany(
      `SELECT o.*, u.full_name AS customer_name, u.phone AS customer_phone
         FROM universal_orders o
         JOIN users u ON o.user_id = u.id
        WHERE o.shop_id = $1
        ORDER BY o.created_at DESC`,
      [shopId]
    );

    if (orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    // Single batched fetch instead of one query per order (N+1).
    const itemRows = await queryMany(
      `SELECT oi.*, c.title, c.item_type
         FROM universal_order_items oi
         JOIN universal_catalog_items c ON oi.item_id = c.id
        WHERE oi.order_id IN (${placeholders(orders.length)})`,
      orders.map((o) => o.id)
    );

    const itemsByOrder = new Map();
    for (const row of itemRows) {
      if (!itemsByOrder.has(row.order_id)) itemsByOrder.set(row.order_id, []);
      itemsByOrder.get(row.order_id).push(row);
    }
    for (const order of orders) {
      order.items = itemsByOrder.get(order.id) || [];
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching shop orders:', error);
    res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await queryMany(
      `SELECT o.*, s.name AS shop_name
         FROM universal_orders o
         LEFT JOIN local_shops s ON o.shop_id = s.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT 100`,
      [req.user.id]
    );

    if (orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    const itemRows = await queryMany(
      `SELECT oi.*, c.title, c.item_type
         FROM universal_order_items oi
         JOIN universal_catalog_items c ON oi.item_id = c.id
        WHERE oi.order_id IN (${placeholders(orders.length)})`,
      orders.map((o) => o.id)
    );

    const itemsByOrder = new Map();
    for (const row of itemRows) {
      if (!itemsByOrder.has(row.order_id)) itemsByOrder.set(row.order_id, []);
      itemsByOrder.get(row.order_id).push(row);
    }
    for (const order of orders) {
      order.items = itemsByOrder.get(order.id) || [];
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const order = await queryOne(
      `SELECT o.id, o.user_id, s.owner_id
         FROM universal_orders o
         LEFT JOIN local_shops s ON o.shop_id = s.id
        WHERE o.id = $1`,
      [orderId]
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isOwner = String(order.owner_id) === String(req.user.id);
    const isCustomerCancelling = String(order.user_id) === String(req.user.id) && status === 'CANCELLED';
    if (!isOwner && !isCustomerCancelling && !req.user.is_admin) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this order' });
    }

    await query(
      `UPDATE universal_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, orderId]
    );

    res.json({ success: true, message: 'Order status updated', orderId, status });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server error updating order' });
  }
};

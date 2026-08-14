const { query, queryOne, queryMany, withTransaction } = require('../config/database');

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shopId, orderType, totalAmount, scheduledTime, deliveryAddress, notes, items } = req.body;

    if (!shopId || !totalAmount || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }

    const itemIds = items.map((i) => i.id);
    if (itemIds.some((id) => !id)) {
      return res.status(400).json({ success: false, message: 'Every order item requires an id' });
    }

    // Server-authoritative pricing: never trust client-supplied prices.
    const catalogRows = await queryMany(
      `SELECT id, price, is_active FROM universal_catalog_items WHERE shop_id = $1 AND id = ANY($2::int[])`,
      [shopId, itemIds]
    );
    const catalog = new Map(catalogRows.map((row) => [String(row.id), row]));

    for (const item of items) {
      const row = catalog.get(String(item.id));
      if (!row || row.is_active === false) {
        return res.status(400).json({ success: false, message: `Item ${item.id} is unavailable for this shop` });
      }
    }

    const computedTotal = items.reduce(
      (sum, item) => sum + Number(catalog.get(String(item.id)).price) * (Number(item.quantity) || 1),
      0
    );

    const orderId = await withTransaction(async (client) => {
      const orderResult = await client.query(
        `INSERT INTO universal_orders
           (shop_id, user_id, status, total_amount, order_type, scheduled_time, delivery_address, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          shopId,
          userId,
          'PENDING',
          computedTotal,
          orderType || 'retail',
          scheduledTime || null,
          deliveryAddress || null,
          notes || null,
        ]
      );
      const newOrderId = orderResult.rows[0].id;

      for (const item of items) {
        await client.query(
          `INSERT INTO universal_order_items (order_id, item_id, quantity, price_at_time, meta_data)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newOrderId,
            item.id,
            Number(item.quantity) || 1,
            catalog.get(String(item.id)).price,
            item.metaData ? JSON.stringify(item.metaData) : null,
          ]
        );
      }

      return newOrderId;
    });

    res.status(201).json({ success: true, message: 'Order created successfully', orderId, totalAmount: computedTotal });
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
        WHERE oi.order_id = ANY($1::int[])`,
      [orders.map((o) => o.id)]
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
        WHERE oi.order_id = ANY($1::int[])`,
      [orders.map((o) => o.id)]
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

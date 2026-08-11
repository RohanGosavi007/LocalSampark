const { query, queryOne, queryMany, withTransaction } = require('../config/database');

exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shopId, orderType, totalAmount, scheduledTime, deliveryAddress, notes, items } = req.body;

    if (!shopId || !totalAmount || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }

    let orderId;

    await withTransaction(async () => {
      // Create the main order
      const orderResult = await query(
        `INSERT INTO universal_orders (shop_id, user_id, status, total_amount, order_type, scheduled_time, delivery_address, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [shopId, userId, 'PENDING', totalAmount, orderType || 'retail', scheduledTime || null, deliveryAddress || null, notes || null]
      );
      orderId = orderResult.lastID;

      // Create order items
      for (const item of items) {
        await query(
          `INSERT INTO universal_order_items (order_id, item_id, quantity, price_at_time, meta_data) 
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.id, item.quantity || 1, item.price, item.metaData ? JSON.stringify(item.metaData) : null]
        );
      }
    });

    res.json({ success: true, message: 'Order created successfully', orderId });
  } catch (error) {
    console.error('Error creating universal order:', error);
    res.status(500).json({ success: false, message: 'Server error creating order' });
  }
};

exports.getShopOrders = async (req, res) => {
  try {
    const { shopId } = req.params;
    const orders = await queryMany(`
      SELECT o.*, u.full_name as customer_name, u.phone as customer_phone 
      FROM universal_orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.shop_id = ? 
      ORDER BY o.created_at DESC`, 
    [shopId]);

    // Fetch items for each order
    for (let order of orders) {
      const items = await queryMany(`
        SELECT oi.*, c.title, c.item_type 
        FROM universal_order_items oi
        JOIN universal_catalog_items c ON oi.item_id = c.id
        WHERE oi.order_id = ?`, 
      [order.id]);
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching shop orders:', error);
    res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
};

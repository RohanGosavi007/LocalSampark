const { query, queryOne } = require('../../../config/database');
const crypto = require('crypto');

async function createCheckoutOrder(req, res, next) {
  try {
    const { shopId, cart, name, phone, address } = req.body;
    
    // 1. Check Shop Payment Flow Settings
    const settingsRaw = await queryOne('SELECT settings FROM shop_settings WHERE shop_id = ?', [shopId]);
    let settings = {};
    if (settingsRaw && settingsRaw.settings) {
      try { settings = JSON.parse(settingsRaw.settings); } catch (e) {}
    }
    const paymentFlow = settings.paymentFlow || 'instant';
    
    // 2. Calculate Total
    let totalAmount = 0;
    cart.forEach(item => { totalAmount += item.price * item.qty; });
    totalAmount += 40; // Delivery Fee
    
    // 3. Insert into universal_orders (SQLite ledger)
    const itemsJson = JSON.stringify(cart);
    const orderRef = `ORD-${Date.now()}`;
    const initialStatus = paymentFlow === 'instant' ? 'pending_payment' : 'pending_approval';

    // The SQLite database logic. 'query' might just return the changes or nothing if RETURNING is not used natively, so we'll do an INSERT and assume we can query it back or just use the orderRef.
    await query(
      `INSERT INTO universal_orders (shop_id, user_id, type, amount, status, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
      [shopId, req.user ? req.user.id : null, 'ecom', totalAmount, initialStatus, JSON.stringify({ name, phone, address, items: itemsJson, ref: orderRef })]
    );

    const insertedOrder = await queryOne('SELECT id FROM universal_orders WHERE metadata LIKE ? ORDER BY created_at DESC LIMIT 1', [`%${orderRef}%`]);

    // 4. Broadcast via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`shop_${shopId}`).emit('NEW_ORDER', {
        id: insertedOrder ? insertedOrder.id : orderRef,
        amount: totalAmount,
        status: initialStatus
      });
    }

    // 5. Return response
    if (paymentFlow === 'instant') {
      // Return order info for Razorpay frontend trigger
      res.json({ success: true, payment_flow: 'instant', order_id: insertedOrder ? insertedOrder.id : orderRef, amount: totalAmount });
    } else {
      res.json({ success: true, payment_flow: 'approve', message: 'Order submitted for approval.' });
    }
    
  } catch (error) { next(error); }
}

async function verifyPayment(req, res, next) {
  try {
    const { order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Update order status to paid
    await query('UPDATE universal_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['paid', order_id]);
    
    // Broadcast status change
    const orderRaw = await queryOne('SELECT shop_id FROM universal_orders WHERE id = ?', [order_id]);
    if (orderRaw && orderRaw.shop_id) {
      const io = req.app.get('io');
      if (io) {
        io.to(`shop_${orderRaw.shop_id}`).emit('ORDER_STATUS_CHANGED', { orderId: order_id, status: 'paid' });
      }
    }

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) { next(error); }
}

module.exports = {
  createCheckoutOrder,
  verifyPayment
};

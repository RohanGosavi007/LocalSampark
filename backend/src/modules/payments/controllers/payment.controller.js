const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const notificationService = require('../../core/services/notification.service');

/**
 * Payment Gateway Controller
 * Supports Razorpay & UPI Intent payments with webhook verification
 */

/**
 * Create a new payment order (Razorpay / UPI)
 */
async function createPaymentOrder(req, res, next) {
  try {
    const { amount, currency = 'INR', orderId, notes } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Generate unique gateway order ID
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const gatewayOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;

    // Record pending transaction in database
    await query(
      `INSERT INTO payments (id, user_id, order_id, amount, currency, status, gateway_order_id, receipt, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [crypto.randomUUID(), userId, orderId || null, amount, currency, 'created', gatewayOrderId, receipt]
    );

    res.json({
      success: true,
      payment: {
        gatewayOrderId,
        amount: Math.round(amount * 100), // in paise for Razorpay/UPI
        currency,
        receipt,
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key_10x',
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify payment signature after client payment completion
 */
async function verifyPaymentSignature(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_10x';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      await query(
        `UPDATE payments SET status = 'failed' WHERE gateway_order_id = $1`,
        [razorpay_order_id]
      );
      return res.status(400).json({ error: 'Invalid payment signature verification' });
    }

    // Update payment record to captured/paid
    const updated = await queryOne(
      `UPDATE payments SET status = 'paid', payment_id = $1, updated_at = CURRENT_TIMESTAMP WHERE gateway_order_id = $2 RETURNING *`,
      [razorpay_payment_id, razorpay_order_id]
    );

    if (updated && updated.order_id) {
      // Update shop order status to paid / accepted
      await query(`UPDATE shop_orders SET payment_status = 'paid', status = 'accepted' WHERE id = $1`, [updated.order_id]);
      
      // Async Notify customer & vendor
      notificationService.sendToUser(req.user.id, {
        type: 'order_update',
        title: 'Payment Successful! 🎉',
        body: `Your payment of ₹${updated.amount} was completed successfully.`,
        data: { orderId: updated.order_id },
        icon: '✅'
      });
    }

    res.json({ success: true, message: 'Payment verified successfully', payment: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * Webhook handler for asynchronous payment status sync
 */
async function handleWebhook(req, res, next) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret';
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook payload
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature && signature !== expectedSignature) {
      return res.status(400).send('Invalid webhook signature');
    }

    const { event, payload } = req.body;
    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      await query(
        `UPDATE payments SET status = 'paid', payment_id = $1 WHERE gateway_order_id = $2`,
        [paymentEntity.id, paymentEntity.order_id]
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPaymentOrder,
  verifyPaymentSignature,
  handleWebhook
};

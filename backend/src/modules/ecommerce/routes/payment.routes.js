const express = require('express');
const router = express.Router();
const PaymentGatewayEngine = require('../../../services/payment.gateway');
const { query } = require('../../../config/database');

// Webhook Handler for Payment Callbacks (Razorpay/Cashfree)
router.post('/webhook/:provider', express.raw({ type: 'application/json' }), async (req, res) => {
  const { provider } = req.params;
  const payload = req.body;
  const signature = req.headers['x-razorpay-signature'] || req.headers['x-webhook-signature'];

  try {
    // 1. Verify Signature for Security
    const payloadString = payload.toString('utf8');
    const isValid = PaymentGatewayEngine.verifyWebhookSignature(
      provider, 
      payloadString, 
      signature, 
      process.env.PAYMENT_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error(`[PaymentWebhook] Invalid signature for provider: ${provider}`);
      return res.status(400).send('Invalid signature');
    }

    // 2. Parse payload based on provider
    let orderId, paymentStatus, paymentRef;

    if (provider === 'razorpay') {
      const event = JSON.parse(payloadString);
      if (event.event === 'order.paid') {
        const paymentEntity = event.payload.payment.entity;
        orderId = paymentEntity.notes.internal_order_id; // mapped during creation
        paymentStatus = 'paid';
        paymentRef = paymentEntity.id;
      }
    } else if (provider === 'cashfree') {
      const event = JSON.parse(payloadString);
      if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
        orderId = event.data.order.order_id;
        paymentStatus = 'paid';
        paymentRef = event.data.payment.cf_payment_id;
      }
    }

    // 3. Update Database Idempotently
    if (orderId && paymentStatus === 'paid') {
      console.log(`[PaymentWebhook] Marking order ${orderId} as paid (Ref: ${paymentRef})`);
      
      // Update order status in database
      await query(`
        UPDATE shop_orders 
        SET payment_status = $1, 
            payment_gateway_ref = $2,
            status = 'accepted'
        WHERE id = $3 AND payment_status != 'paid'
      `, [paymentStatus, paymentRef, orderId]);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[PaymentWebhook] Error processing webhook:', error);
    res.status(500).send('Webhook Error');
  }
});

module.exports = router;

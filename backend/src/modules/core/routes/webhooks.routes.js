const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Stripe = require('stripe');
const { query } = require('../../../config/database');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

// Stripe webhook requires raw body
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error(`Stripe Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;
    if (orderId) {
      // Security: PostgreSQL uses $1, $2 (not ?). Idempotency: Only update if not already PAID.
      await query('UPDATE orders SET payment_status = $1 WHERE id = $2 AND payment_status != $1', ['PAID', orderId]);
    }
  }

  res.json({ received: true });
});

router.post('/razorpay', express.json(), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers['x-razorpay-signature'];
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const orderId = event.payload.payment?.entity?.notes?.orderId || event.payload.order?.entity?.receipt;
      if (orderId) {
        // Security: PostgreSQL uses $1, $2. Idempotency enforced.
        await query('UPDATE orders SET payment_status = $1 WHERE id = $2 AND payment_status != $1', ['PAID', orderId]);
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(`Razorpay Webhook Error: ${err.message}`);
    res.status(500).json({ error: 'Webhook Error' });
  }
});

router.post('/cashfree', express.json(), async (req, res) => {
  try {
    const event = req.body;
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = event.data.order.order_id;
      // In checkout.routes.js: `order_${orderId}_${Date.now()}`
      const match = orderId.match(/^order_([^_]+)_/);
      const actualOrderId = match ? match[1] : orderId;
      if (actualOrderId) {
        await query('UPDATE orders SET payment_status = ? WHERE id = ?', ['PAID', actualOrderId]);
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(`Cashfree Webhook Error: ${err.message}`);
    res.status(500).json({ error: 'Webhook Error' });
  }
});

module.exports = router;

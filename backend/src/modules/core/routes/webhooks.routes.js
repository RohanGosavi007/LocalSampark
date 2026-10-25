const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Stripe = require('stripe');
const { query } = require('../../../config/database');
const { webhookGuard, rawBodyOf } = require('../../../utils/webhookSignature');
const razorpay = require('../../../services/razorpay.service');
const payments = require('../../../services/payments.service');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Event-level replay guard, backed by the webhook_events table (migration 021).
 *
 * The handlers below are all conditional updates, so a replay is already inert
 * for them. This is defence in depth for whatever gets added later: the moment a
 * handler does something additive — crediting a wallet, releasing escrow —
 * a conditional UPDATE stops protecting it and only event de-duplication does.
 *
 * Fails open on a database error: a webhook that cannot reach the dedup table
 * should still be processed rather than silently dropped, since the conditional
 * updates remain the primary guard.
 */
async function alreadyProcessed(eventId) {
  if (!eventId) return false;
  try {
    const found = await query('SELECT event_id FROM webhook_events WHERE event_id = $1', [String(eventId)]);
    if ((found.rows || found || []).length > 0) {
      console.warn(`[webhook] duplicate delivery ignored: ${eventId}`);
      return true;
    }
    await query(
      'INSERT INTO webhook_events (id, event_id) VALUES ($1, $2)',
      [crypto.randomUUID(), String(eventId)]
    );
    return false;
  } catch (err) {
    console.error(`[webhook] dedup check failed for ${eventId}: ${err.message}`);
    return false;
  }
}

// express.raw() on each route serves a router mounted without the app's JSON
// parser. Under server.js that parser has already consumed the stream, and the
// original bytes are on req.rawBody; rawBodyOf() reads whichever is there.

// Stripe webhook requires raw body
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = rawBodyOf(req);
  if (rawBody === null) {
    return res.status(400).send('Webhook Error: raw body unavailable');
  }

  let event;
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } else if (!['development', 'test'].includes(process.env.NODE_ENV)) {
      // Previously fell through to a bare JSON.parse, so a production deploy
      // missing STRIPE_WEBHOOK_SECRET accepted unsigned payment callbacks.
      console.error('[webhook] rejected: STRIPE_WEBHOOK_SECRET not configured');
      return res.status(401).send('Webhook signature verification unavailable');
    } else {
      console.warn('[webhook] Stripe: no endpoint secret — signature NOT verified (development only)');
      event = JSON.parse(rawBody);
    }
  } catch (err) {
    console.error(`Stripe Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;
    if (orderId && !(await alreadyProcessed(event.id))) {
      // Security: PostgreSQL uses $1, $2 (not ?). Idempotency: Only update if not already PAID.
      await query('UPDATE orders SET payment_status = $1 WHERE id = $2 AND payment_status != $1', ['PAID', orderId]);
    }
  }

  res.json({ received: true });
});

/**
 * Razorpay.
 *
 * Verified against the raw body with RAZORPAY_WEBHOOK_SECRET, then handed to
 * payments.service, which finds the payment by the Razorpay order id in the
 * event and settles what that row says — the same code path the browser's
 * verification call ends in, so it does not matter which of the two arrives
 * first or whether both do.
 *
 * This used to read `notes.orderId` (or the receipt) from the event and run
 * `UPDATE orders SET payment_status = 'PAID' WHERE id = …`. That trusted a
 * free-text note for which order to settle, covered one of the three order
 * tables, and never looked at the amount.
 *
 * There is no development bypass here, unlike the other providers below:
 * without the secret the delivery is refused in every environment.
 */
async function razorpayWebhook(req, res) {
  try {
    if (!razorpay.isWebhookConfigured()) {
      console.error('[webhook] Razorpay rejected: RAZORPAY_WEBHOOK_SECRET is not configured');
      return res.status(503).json({ error: 'Webhook verification unavailable' });
    }

    const rawBody = rawBodyOf(req);
    const signature = req.headers['x-razorpay-signature'];
    if (rawBody === null || !razorpay.verifyWebhookSignature(rawBody, signature)) {
      console.error('[webhook] Razorpay rejected: signature mismatch');
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (_e) {
      return res.status(400).json({ error: 'Malformed payload' });
    }

    const outcome = await payments.handleWebhookEvent(event);
    if (outcome && outcome.rejected) {
      // Acknowledged all the same: a non-2xx makes Razorpay retry a delivery
      // that will be refused again for the same reason.
      console.error(`[webhook] Razorpay event not applied: ${outcome.rejected}`);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(`Razorpay Webhook Error: ${err.message}`);
    // 500, so Razorpay retries: the settlement is idempotent.
    res.status(500).json({ error: 'Webhook Error' });
  }
}

router.post('/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);

/**
 * Cashfree.
 *
 * This route previously had NO signature verification and issued an
 * unconditional `UPDATE orders SET payment_status = 'PAID'`. Since /webhooks is
 * mounted without auth, any unauthenticated caller could mark any order paid by
 * POSTing a PAYMENT_SUCCESS_WEBHOOK body with that order's id.
 *
 * Cashfree signs `timestamp + rawBody` with HMAC-SHA256, base64-encoded, sent as
 * x-webhook-signature alongside x-webhook-timestamp. Raw body is required — the
 * re-serialised JSON will not reproduce the provider's byte sequence.
 */
router.post('/cashfree', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secret = process.env.CASHFREE_WEBHOOK_SECRET;
    const rawBody = rawBodyOf(req);
    if (rawBody === null) return res.status(400).json({ error: 'Raw body unavailable' });
    const timestamp = req.headers['x-webhook-timestamp'] || '';

    const rejection = webhookGuard({
      secret,
      signature: req.headers['x-webhook-signature'],
      payload: `${timestamp}${rawBody}`,
      encoding: 'base64',
      providerName: 'Cashfree',
    });
    if (rejection) {
      console.error(`[webhook] rejected: ${rejection}`);
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (_e) {
      return res.status(400).json({ error: 'Malformed payload' });
    }

    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = event.data?.order?.order_id;
      if (orderId) {
        // In checkout.routes.js: `order_${orderId}_${Date.now()}`
        const match = orderId.match(/^order_([^_]+)_/);
        const actualOrderId = match ? match[1] : orderId;
        if (actualOrderId && !(await alreadyProcessed(event.data?.payment?.cf_payment_id || orderId))) {
          // Conditional, matching the Stripe and Razorpay handlers: a replayed
          // delivery must not re-apply the transition.
          await query(
            'UPDATE orders SET payment_status = $1 WHERE id = $2 AND payment_status != $1',
            ['PAID', actualOrderId]
          );
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(`Cashfree Webhook Error: ${err.message}`);
    res.status(500).json({ error: 'Webhook Error' });
  }
});

module.exports = router;
module.exports.razorpayWebhook = razorpayWebhook;

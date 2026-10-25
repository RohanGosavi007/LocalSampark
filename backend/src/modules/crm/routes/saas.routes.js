const logger = require('../../../config/logger.js');
const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate, enforceMultiTenancy, requireAdmin } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');
const PaymentGatewayEngine = require('../../../services/payment.gateway');
const { rawBodyOf } = require('../../../utils/webhookSignature');
const payments = require('../../../services/payments.service');
const { sendPaymentError } = require('../../payments/routes/razorpay.routes');

// GET /plans - List available SaaS tiers (Public/Authenticated)
router.get('/plans', async (req, res, next) => {
  try {
    let plans;
    try {
      const res = await query('SELECT * FROM saas_plans WHERE is_active = \'1\' OR is_active = \'1\'');
      plans = res.rows || res || [];
    } catch (e) {
      plans = [];
    }
    
        // An empty table used to be answered with three invented plans — "Starter
    // Merchant" at ₹499 and so on — that existed nowhere else: choosing one
    // and subscribing answered "Plan not found". The plans on sale are the
    // rows in saas_plans (seeds/run.js creates the standard two).
    res.json({ success: true, plans });
  } catch (err) {
    next(err);
  }
});

// GET /my-subscription - Get current vendor's subscription (Requires Multi-Tenancy)
router.get('/my-subscription', authenticate, enforceMultiTenancy, async (req, res, next) => {
  try {
    const sub = await queryOne(`
      SELECT vs.*, sp.name as plan_name, sp.price_monthly, sp.features_json 
      FROM vendor_subscriptions vs
      JOIN saas_plans sp ON vs.plan_id = sp.id
      WHERE vs.shop_id = $1 
      ORDER BY vs.created_at DESC LIMIT 1
    `, [req.shopId]);
    
    res.json({ success: true, subscription: sub, crmTier: req.crmTier });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /subscribe — buy 30 days of a plan for the caller's shop.
 *
 * This "mocked checkout session generation": it invented a gateway
 * subscription id, stored a pending subscription against it and answered
 * "Proceed to payment gateway" — with nothing to proceed to. The only thing
 * that could ever activate the subscription was a webhook naming that
 * invented id.
 *
 * It is now a payment like any other. The pending subscription is the thing
 * being paid for; payments.service opens a Razorpay order for the plan's
 * monthly price, and when that payment is verified (by POST
 * /payments/razorpay/verify or the Razorpay webhook) the subscription becomes
 * active for 30 days and the shop moves to the premium tier. Renewal is the
 * same call again. Without Razorpay keys it answers 503 and stores nothing.
 */
router.post('/subscribe', authenticate, enforceMultiTenancy, async (req, res, next) => {
  try {
    const { planId } = req.body || {};
    if (!planId) return res.status(400).json({ error: 'planId is required' });
    // Admins pass the tenancy check without a shop of their own.
    if (!req.shopId) return res.status(400).json({ error: 'A subscription is bought by the shop it is for.' });

    const plan = await queryOne('SELECT * FROM saas_plans WHERE id = $1 AND is_active = \'1\'', [planId]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (!(Number(plan.price_monthly) >= 1)) {
      return res.status(400).json({ error: 'This plan is free and needs no subscription.' });
    }
    if (!payments.onlinePaymentAvailable()) {
      return res.status(503).json({
        success: false,
        code: 'PAYMENTS_UNAVAILABLE',
        error: 'Online payment is not available right now.',
      });
    }

    // One open request per shop and plan: pressing Subscribe twice pays once.
    let subscription = await queryOne(
      "SELECT id FROM vendor_subscriptions WHERE shop_id = $1 AND plan_id = $2 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
      [req.shopId, planId]
    );
    if (!subscription) {
      subscription = { id: crypto.randomUUID() };
      await query(
        'INSERT INTO vendor_subscriptions (id, shop_id, plan_id, status) VALUES ($1, $2, $3, $4)',
        [subscription.id, req.shopId, planId, 'pending']
      );
    }

    const payment = await payments.createPayment({
      user: req.user, purpose: 'saas_subscription', referenceId: subscription.id,
    });

    res.status(201).json({ success: true, subscriptionId: subscription.id, plan: { id: plan.id, name: plan.name, price_monthly: Number(plan.price_monthly) }, payment });
  } catch (err) {
    sendPaymentError(res, err, next);
  }
});

// POST /webhook/billing - Idempotent Webhook Listener
router.post('/webhook/billing', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] || req.headers['x-webhook-signature'];
    // No literal default. This used to fall back to the string 'webhook_secret',
    // which is published in this file — anyone could forge a billing webhook and
    // drive a subscription state change. An unconfigured secret is now a
    // misconfiguration to surface, not a value to invent.
    const secret = process.env.SAAS_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;

    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    if (!secret) {
      console.error('[SaaS Webhook] rejected: SAAS_WEBHOOK_SECRET / PAYMENT_WEBHOOK_SECRET not configured');
      return res.status(503).json({ error: 'Webhook signature verification unavailable' });
    }

    // Not req.body.toString(): by the time this runs the app's JSON parser has
    // turned the body into an object, whose toString() is "[object Object]", so
    // no genuine delivery could ever verify.
    const rawPayload = rawBodyOf(req);
    if (rawPayload === null) {
      return res.status(400).json({ error: 'Raw webhook body unavailable' });
    }
    const isValid = PaymentGatewayEngine.verifyWebhookSignature('razorpay', rawPayload, signature, secret);
    
    if (!isValid) {
      console.error('[SaaS Webhook] Invalid cryptographic signature detected');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const parsedBody = JSON.parse(rawPayload);
    const { event_id, type, data } = parsedBody;
    
    if (!event_id || !type || !data || !data.gateway_subscription_id) {
      return res.status(400).json({ error: 'Invalid webhook payload structure' });
    }

    await withTransaction(async (dbClient) => {
      // 1. Check Idempotency (prevent duplicate processing)
      const existingEvent = await dbClient.query('SELECT event_id FROM webhook_events WHERE event_id = $1', [event_id]);
      if ((existingEvent.rows || existingEvent).length > 0) {
        logger.info(`Webhook ${event_id} already processed. Ignoring.`);
        return; // Idempotent success
      }

      // Record event
      await dbClient.query('INSERT INTO webhook_events (id, event_id) VALUES ($1, $2)', [crypto.randomUUID(), event_id]);

      // 2. Find associated subscription
      const sub = (await dbClient.query('SELECT * FROM vendor_subscriptions WHERE gateway_subscription_id = $1', [data.gateway_subscription_id])).rows?.[0] || (await dbClient.query('SELECT * FROM vendor_subscriptions WHERE gateway_subscription_id = $1', [data.gateway_subscription_id]))[0];
      
      if (!sub) {
        console.warn(`Subscription ${data.gateway_subscription_id} not found.`);
        return;
      }

      if (type === 'subscription.charged') {
        // Extend period by 30 days
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + 30);
        
        await dbClient.query('UPDATE vendor_subscriptions SET status = $1, current_period_end = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', ['active', newEnd.toISOString(), sub.id]);
        
        // Upgrade CRM Tier
        await dbClient.query('UPDATE local_shops SET crm_tier = $1, is_locked = 0 WHERE id = $2', ['premium', sub.shop_id]);
        
      } else if (type === 'subscription.halted' || type === 'subscription.cancelled') {
        await dbClient.query('UPDATE vendor_subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['cancelled', sub.id]);
        
        // Graceful Degradation: Downgrade tier, but don't delete shop
        await dbClient.query('UPDATE local_shops SET crm_tier = $1 WHERE id = $2', ['free', sub.shop_id]);
      }
    });

    res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /admin/subscriptions - Admin dashboard metrics
router.get('/admin/subscriptions', authenticate, requireAdmin, async (req, res, next) => {
  try {
    let subs;
    try {
      subs = await query(`
        SELECT vs.*, s.name as shop_name, sp.name as plan_name, sp.price_monthly 
        FROM vendor_subscriptions vs
        LEFT JOIN local_shops s ON vs.shop_id = s.id
        LEFT JOIN saas_plans sp ON vs.plan_id = sp.id
        ORDER BY vs.created_at DESC
      `);
    } catch (e) {
      try {
        subs = await query(`
          SELECT vs.*, s.name as shop_name, sp.name as plan_name, sp.price_monthly 
          FROM vendor_subscriptions vs
          LEFT JOIN local_shops s ON vs.shop_id = s.id
          LEFT JOIN saas_plans sp ON vs.plan_id = sp.id
          ORDER BY vs.created_at DESC
        `);
      } catch (e2) {
        subs = { rows: [] };
      }
    }
    
    res.json({ success: true, data: subs.rows || subs || [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

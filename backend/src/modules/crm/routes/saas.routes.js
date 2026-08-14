const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate, enforceMultiTenancy, requireAdmin } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');
const PaymentGatewayEngine = require('../../../services/payment.gateway');

// GET /plans - List available SaaS tiers (Public/Authenticated)
router.get('/plans', async (req, res, next) => {
  try {
    let plans;
    try {
      const res = await query('SELECT * FROM saas_plans WHERE is_active = true OR is_active = true');
      plans = res.rows || res || [];
    } catch (e) {
      plans = [];
    }
    
    if (!plans.length) {
      plans = [
        { id: 'plan_basic', name: 'Starter Merchant', price_monthly: 499, features_json: '["Up to 50 products","Standard Analytics","Basic Support"]' },
        { id: 'plan_growth', name: 'Growth Business', price_monthly: 999, features_json: '["Unlimited products","Real-time Analytics","Marketing Campaigns","Priority Support"]' },
        { id: 'plan_enterprise', name: 'Enterprise Super-Shop', price_monthly: 1999, features_json: '["Multi-location Management","Custom Domain","Dedicated Account Manager","AI Insights"]' }
      ];
    }
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

// POST /subscribe - Initiate subscription checkout
router.post('/subscribe', authenticate, enforceMultiTenancy, async (req, res, next) => {
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const plan = await queryOne('SELECT * FROM saas_plans WHERE id = $1 AND is_active = true', [planId]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Mocking Razorpay/Stripe Checkout Session Generation
    const mockGatewayId = `sub_${crypto.randomUUID().replace(/-/g, '').substring(0, 14)}`;

    await query('INSERT INTO vendor_subscriptions (id, shop_id, plan_id, status, gateway_subscription_id) VALUES ($1, $2, $3, $4, $5)',
      [crypto.randomUUID(), req.shopId, planId, 'pending', mockGatewayId]
    );

    res.json({ success: true, gateway_subscription_id: mockGatewayId, message: 'Proceed to payment gateway' });
  } catch (err) {
    next(err);
  }
});

// POST /webhook/billing - Idempotent Webhook Listener
router.post('/webhook/billing', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'] || req.headers['x-webhook-signature'];
    const secret = process.env.SAAS_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || 'webhook_secret';
    
    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    const rawPayload = req.body.toString('utf8');
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
        console.log(`Webhook ${event_id} already processed. Ignoring.`);
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
        LEFT JOIN shops s ON vs.shop_id = s.id
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

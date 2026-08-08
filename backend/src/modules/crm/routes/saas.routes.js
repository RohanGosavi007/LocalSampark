const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../../config/database');
const { authenticate, enforceMultiTenancy, requireAdmin } = require('../../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET /plans - List available SaaS tiers (Public/Authenticated)
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await query('SELECT * FROM saas_plans WHERE is_active = 1');
    res.json({ success: true, plans: plans.rows || plans });
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
      WHERE vs.shop_id = ? 
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

    const plan = await queryOne('SELECT * FROM saas_plans WHERE id = ? AND is_active = 1', [planId]);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Mocking Razorpay/Stripe Checkout Session Generation
    const mockGatewayId = `sub_${crypto.randomUUID().replace(/-/g, '').substring(0, 14)}`;

    await query(
      'INSERT INTO vendor_subscriptions (id, shop_id, plan_id, status, gateway_subscription_id) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), req.shopId, planId, 'pending', mockGatewayId]
    );

    res.json({ success: true, gateway_subscription_id: mockGatewayId, message: 'Proceed to payment gateway' });
  } catch (err) {
    next(err);
  }
});

// POST /webhook/billing - Idempotent Webhook Listener
router.post('/webhook/billing', async (req, res, next) => {
  try {
    const { event_id, type, data } = req.body;
    if (!event_id || !type || !data || !data.gateway_subscription_id) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
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
      const sub = (await dbClient.query('SELECT * FROM vendor_subscriptions WHERE gateway_subscription_id = ?', [data.gateway_subscription_id])).rows?.[0] || (await dbClient.query('SELECT * FROM vendor_subscriptions WHERE gateway_subscription_id = ?', [data.gateway_subscription_id]))[0];
      
      if (!sub) {
        console.warn(`Subscription ${data.gateway_subscription_id} not found.`);
        return;
      }

      if (type === 'subscription.charged') {
        // Extend period by 30 days
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + 30);
        
        await dbClient.query('UPDATE vendor_subscriptions SET status = ?, current_period_end = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['active', newEnd.toISOString(), sub.id]);
        
        // Upgrade CRM Tier
        await dbClient.query('UPDATE local_shops SET crm_tier = ?, is_locked = 0 WHERE id = ?', ['premium', sub.shop_id]);
        
      } else if (type === 'subscription.halted' || type === 'subscription.cancelled') {
        await dbClient.query('UPDATE vendor_subscriptions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['cancelled', sub.id]);
        
        // Graceful Degradation: Downgrade tier, but don't delete shop
        await dbClient.query('UPDATE local_shops SET crm_tier = ? WHERE id = ?', ['free', sub.shop_id]);
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
    const subs = await query(`
      SELECT vs.*, s.name as shop_name, sp.name as plan_name, sp.price_monthly 
      FROM vendor_subscriptions vs
      JOIN local_shops s ON vs.shop_id = s.id
      JOIN saas_plans sp ON vs.plan_id = sp.id
      ORDER BY vs.created_at DESC
    `);
    
    res.json({ success: true, data: subs.rows || subs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

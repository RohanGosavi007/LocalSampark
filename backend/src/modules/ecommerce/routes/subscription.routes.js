const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { withTransaction } = require('../../../config/database');
const payments = require('../../../services/payments.service');
const { requireShopParam } = require('../../../middleware/shop-owner.middleware');

// The shop is named in the body here, not the URL; give the URL guard what it reads.
const requireShopParamInBody = (req, res, next) => {
  req.params.shopId = (req.body || {}).shopId;
  return requireShopParam('shopId')(req, res, next);
};

// GET all subscription plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await query('SELECT * FROM subscription_plans WHERE is_active = true');
    res.json({ success: true, data: plans.rows || plans });
  } catch (error) {
    next(error);
  }
});

// GET user subscriptions
router.get('/my-subscriptions', authenticate, async (req, res, next) => {
  try {
    const subs = await query(`
      SELECT s.*, p.name as plan_name, p.provider_name, p.price, p.icon, p.schedule 
      FROM user_subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 AND s.status != 'cancelled'
    `, [req.user.id]);
    res.json({ success: true, data: subs.rows || subs });
  } catch (error) {
    next(error);
  }
});

// POST subscribe to a plan
router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const { planId, deliveryAddress, latitude, longitude } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    const geom = `${longitude || 73.8967},${latitude || 18.5786}`;
    const nextDeliveryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
    const subId = crypto.randomUUID();

    const subscription = await queryOne(`INSERT INTO user_subscriptions (id, user_id, plan_id, delivery_address, delivery_coordinate, next_delivery_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [subId, req.user.id, planId, deliveryAddress || '', geom, nextDeliveryDate]
    );

    res.status(201).json({ success: true, data: subscription, message: 'Successfully subscribed' });
  } catch (error) {
    next(error);
  }
});

// PUT pause subscription
router.put('/:id/pause', authenticate, async (req, res, next) => {
  try {
    const sub = await queryOne(`UPDATE user_subscriptions 
       SET status = 'paused', paused_until = $1 
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), req.params.id, req.user.id]
    );
    res.json({ success: true, data: sub });
  } catch (error) {
    next(error);
  }
});

// PUT resume subscription
router.put('/:id/resume', authenticate, async (req, res, next) => {
  try {
    const sub = await queryOne(`UPDATE user_subscriptions 
       SET status = 'active', paused_until = NULL 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, data: sub });
  } catch (error) {
    next(error);
  }
});

// DELETE cancel subscription
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await query(`UPDATE user_subscriptions 
       SET status = 'cancelled' 
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /subscriptions/vendor-saas/subscribe — buy a plan for your shop from
 * your wallet. (POST /saas/subscribe is the same purchase paid by Razorpay.)
 *
 * body: { shopId, planId }
 *
 * What this did: it took the price from the request. `price: 0` bought the
 * plan for nothing; a negative price passed the balance check and the debit
 * that followed — balance minus a negative number — paid the caller. It took
 * the shop from the request too, with no check that it was the caller's, and
 * set is_verified on it: any account could mark any shop on the platform as
 * verified, the badge the KYC review exists to grant. The debit and the
 * upgrade were separate statements, and nothing ever ended the plan.
 *
 * Now the price is the plan's (saas_plans.price_monthly), the shop must be the
 * caller's own, verification is left to the KYC review, the wallet debit and
 * the activation are one transaction, and the plan runs for 30 days.
 */
router.post('/vendor-saas/subscribe', authenticate, requireShopParamInBody, async (req, res, next) => {
  try {
    const shopId = req.shop.id;
    const planKey = String((req.body || {}).planId || (req.body || {}).plan_type || '').trim();
    if (!planKey) return res.status(400).json({ error: 'planId is required' });

    const plan = await queryOne(
      "SELECT id, name, price_monthly FROM saas_plans WHERE (id = $1 OR LOWER(name) = LOWER($1)) AND is_active = '1'",
      [planKey]
    );
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const price = Number(plan.price_monthly);
    if (!(price > 0)) return res.status(400).json({ error: 'This plan is free and needs no subscription.' });

    const subscriptionId = crypto.randomUUID();
    const expiresAt = await withTransaction(async (client) => {
      await payments.debitWallet({
        userId: req.user.id, amount: price, purpose: 'saas_subscription', referenceId: subscriptionId, client,
      });
      await client.query(
        'INSERT INTO vendor_subscriptions (id, shop_id, plan_id, status) VALUES ($1, $2, $3, $4)',
        [subscriptionId, shopId, plan.id, 'pending']
      );
      const periodEnd = await payments.activateSubscription(client, subscriptionId, `wallet:${subscriptionId}`);
      // The commercial term this endpoint has always carried: no platform
      // commission while the plan is active. Reset when the plan lapses.
      await client.query('UPDATE local_shops SET commission_override_percent = 0 WHERE id = $1', [shopId]);
      return periodEnd;
    });

    res.json({
      success: true,
      message: `Shop upgraded to the ${plan.name} plan. 0% transaction commission is active until it expires.`,
      shopId,
      plan: { id: plan.id, name: plan.name },
      subscriptionId,
      fee_deducted: price,
      expires_at: expiresAt
    });
  } catch (error) {
    if (error instanceof payments.PaymentError) {
      const message = error.code === 'INSUFFICIENT_BALANCE' ? 'Insufficient wallet balance for this plan.' : error.message;
      return res.status(error.status).json({ error: message, code: error.code });
    }
    next(error);
  }
});

module.exports = router;

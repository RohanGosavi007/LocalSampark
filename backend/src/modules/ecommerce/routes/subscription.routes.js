const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

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

// POST vendor SaaS subscription purchase (Pro/Enterprise 0% Commission)
router.post('/vendor-saas/subscribe', authenticate, async (req, res, next) => {
  try {
    const { shopId, plan_type = 'pro', price = 999 } = req.body;
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

    // Verify user balance
    const wallet = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]);
    if (!wallet || (wallet.balance || 0) < price) {
      return res.status(402).json({ error: `Insufficient wallet balance to subscribe to ${plan_type.toUpperCase()} plan (â‚¹${price}/mo).` });
    }

    // Deduct subscription fee
    await query('UPDATE wallets SET balance = balance - $1 WHERE user_id = $2', [price, req.user.id]);

    // Update shop commission override to 0% for SaaS subscribers and set expiry
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await query('UPDATE local_shops SET commission_override_percent = 0, is_verified = TRUE, is_premium = true, premium_expires_at = $2 WHERE id = $1',
      [shopId, expiresAt]
    );

    res.json({
      success: true,
      message: `Shop successfully upgraded to ${plan_type.toUpperCase()} SaaS Plan! 0% transaction commission active.`,
      shopId,
      plan_type,
      fee_deducted: price,
      expires_at: expiresAt
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

/**
 * The platform's commercial controls, for the admin console.
 *
 *   /admin/pricing               delivery charges, surge, fees, rider pay,
 *                                commission and cash-on-delivery settings
 *   /admin/plans                 the merchant plans on sale, and their prices
 *   /admin/delivery/cash         cash riders are holding, and recording deposits
 *   /admin/orders/refunds        refunds Razorpay has not yet accepted
 *
 * Reading needs an administrator. Changing a price, a plan or a rate needs a
 * super admin: each of these moves money for every customer and every shop.
 * Recording a cash deposit needs an administrator — it is done at the counter,
 * by whoever is handed the cash.
 */

const express = require('express');
const { recordAudit } = require('../services/adminAudit.service');
const crypto = require('crypto');

const router = express.Router();
const { query, queryOne, queryMany, withTransaction } = require('../../../config/database');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../../../middleware/auth.middleware');
const platformConfig = require('../../../services/platformConfig.service');
const pricing = require('../../../services/deliveryPricing.service');
const lifecycle = require('../../../services/orderLifecycle.service');

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

// ── Pricing settings ────────────────────────────────────────────────────────

/** Every setting with its value, default, limits and meaning — enough to render a form. */
router.get('/pricing', authenticate, requireAdmin, async (req, res, next) => {
  try {
    res.json({ success: true, settings: await platformConfig.describe() });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/pricing { settings: { delivery_per_km_fee: 9, platform_fee: 6, … } }
 *
 * Saved as a whole or not at all: one value out of range and nothing changes.
 * Takes effect on the next order placed; orders already placed keep the
 * charges and the commission rate they were placed at.
 */
router.put('/pricing', authenticate, requireAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const changes = req.body && typeof req.body.settings === 'object' && req.body.settings !== null ? req.body.settings : req.body;
    const outcome = await platformConfig.update(changes, req.user.id);
    if (outcome.errors) {
      return res.status(400).json({ success: false, error: 'Some settings are not valid. Nothing was changed.', errors: outcome.errors });
    }
    res.json({ success: true, updated: outcome.updated, settings: await platformConfig.describe() });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/pricing/preview { distanceKm, subtotal, settings? }
 *
 * What a delivery of that distance and item total would be charged, and what
 * its rider would be paid — with the settings in force, or with `settings`
 * laid over them, so a change can be tried before it is saved.
 */
router.post('/pricing/preview', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const distanceKm = Number(req.body && req.body.distanceKm);
    const subtotal = Number(req.body && req.body.subtotal) || 0;
    if (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > 200) {
      return res.status(400).json({ success: false, error: 'distanceKm must be a number from 0 to 200' });
    }

    const config = { ...(await platformConfig.all()) };
    const errors = {};
    for (const [key, raw] of Object.entries((req.body && req.body.settings) || {})) {
      const value = platformConfig.coerce(key, raw);
      if (value === undefined) errors[key] = 'Not a valid value for this setting';
      else config[key] = value;
    }
    if (Object.keys(errors).length) return res.status(400).json({ success: false, error: 'Some settings are not valid.', errors });

    const charges = pricing.deliveryCharges(distanceKm, subtotal, config);
    const smallOrderFee = config.small_order_threshold > 0 && subtotal < config.small_order_threshold ? config.small_order_fee : 0;
    res.json({
      success: true,
      preview: {
        ...charges,
        withinRange: distanceKm <= config.delivery_max_distance_km,
        platformFee: config.platform_fee,
        smallOrderFee,
        customerPays: money(subtotal + charges.deliveryFee + config.platform_fee + smallOrderFee),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Merchant plans ──────────────────────────────────────────────────────────

const MAX_PLAN_PRICE = 100000;

/** Reads a plan from a request body. Returns { errors } or { plan } holding only the fields supplied. */
function readPlan(body, { creating }) {
  const errors = {};
  const plan = {};
  const has = (key) => body[key] !== undefined;

  if (creating || has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2 || name.length > 60) errors.name = 'Name must be 2 to 60 characters';
    else plan.name = name;
  }

  const rawPrice = body.priceMonthly ?? body.price_monthly ?? body.price;
  if (creating || rawPrice !== undefined) {
    const price = Number(rawPrice);
    if (rawPrice === '' || rawPrice === null || rawPrice === undefined || !Number.isFinite(price) || price < 0 || price > MAX_PLAN_PRICE) {
      errors.priceMonthly = `Monthly price must be a number from 0 to ${MAX_PLAN_PRICE}`;
    } else {
      plan.price_monthly = money(price);
    }
  }

  const rawFeatures = body.features ?? body.features_json;
  if (rawFeatures !== undefined) {
    let features = rawFeatures;
    if (typeof features === 'string') {
      try { features = JSON.parse(features); } catch { features = null; }
    }
    if (!Array.isArray(features) || features.length > 30 || features.some((f) => typeof f !== 'string' || f.length > 120)) {
      errors.features = 'Features must be a list of up to 30 short lines of text';
    } else {
      plan.features_json = JSON.stringify(features.map((f) => f.trim()).filter(Boolean));
    }
  }

  const rawActive = body.isActive ?? body.is_active;
  if (rawActive !== undefined) {
    if (![true, false, 1, 0, '1', '0', 'true', 'false'].includes(rawActive)) errors.isActive = 'isActive must be true or false';
    else plan.is_active = [true, 1, '1', 'true'].includes(rawActive) ? '1' : '0';
  }

  return Object.keys(errors).length ? { errors } : { plan };
}

function presentPlan(row) {
  let features = [];
  try { features = JSON.parse(row.features_json || '[]'); } catch { features = []; }
  return {
    id: row.id,
    name: row.name,
    priceMonthly: Number(row.price_monthly) || 0,
    features: Array.isArray(features) ? features : [],
    isActive: Number(row.is_active) === 1 || row.is_active === true,
    activeSubscribers: Number(row.active_subscribers) || 0,
    createdAt: row.created_at,
  };
}

const PLAN_WITH_SUBSCRIBERS = `
  SELECT p.*, (SELECT COUNT(*) FROM vendor_subscriptions vs WHERE vs.plan_id = p.id AND vs.status = 'active') AS active_subscribers
    FROM saas_plans p`;

/** Every plan, on sale or withdrawn, with how many shops are on it. */
router.get('/plans', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const rows = await queryMany(`${PLAN_WITH_SUBSCRIBERS} ORDER BY p.price_monthly ASC, p.name ASC`);
    res.json({ success: true, plans: rows.map(presentPlan) });
  } catch (error) {
    next(error);
  }
});

router.post('/plans', authenticate, requireAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const { errors, plan } = readPlan(req.body || {}, { creating: true });
    if (errors) return res.status(400).json({ success: false, error: 'The plan is not valid.', errors });

    const taken = await queryOne('SELECT id FROM saas_plans WHERE LOWER(name) = LOWER($1)', [plan.name]);
    if (taken) return res.status(409).json({ success: false, error: 'A plan with that name already exists.' });

    const id = `plan_${crypto.randomUUID().slice(0, 8)}`;
    await query(
      'INSERT INTO saas_plans (id, name, price_monthly, features_json, is_active) VALUES ($1, $2, $3, $4, $5)',
      [id, plan.name, plan.price_monthly, plan.features_json || '[]', plan.is_active || '1']
    );
    const created = await queryOne(`${PLAN_WITH_SUBSCRIBERS} WHERE p.id = $1`, [id]);
    res.status(201).json({ success: true, plan: presentPlan(created) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/plans/:id — change a plan's name, price, features, or withdraw it.
 *
 * A new price is what the plan costs from now on: the next purchase and the
 * next renewal. A shop part-way through a period it has paid for keeps that
 * period; nothing is charged or refunded for it. A withdrawn plan can no
 * longer be bought, and shops on it keep it until their period ends.
 */
router.put('/plans/:id', authenticate, requireAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const existing = await queryOne('SELECT * FROM saas_plans WHERE id = $1', [req.params.id]);
    if (!existing) return res.status(404).json({ success: false, error: 'Plan not found' });

    const { errors, plan } = readPlan(req.body || {}, { creating: false });
    if (errors) return res.status(400).json({ success: false, error: 'The plan is not valid.', errors });
    const fields = Object.keys(plan);
    if (fields.length === 0) return res.status(400).json({ success: false, error: 'Nothing to change.' });

    if (plan.name) {
      const taken = await queryOne('SELECT id FROM saas_plans WHERE LOWER(name) = LOWER($1) AND id <> $2', [plan.name, req.params.id]);
      if (taken) return res.status(409).json({ success: false, error: 'A plan with that name already exists.' });
    }

    // Column names come from readPlan's fixed set, never from the request.
    const sets = fields.map((field, i) => `${field} = $${i + 1}`);
    await query(`UPDATE saas_plans SET ${sets.join(', ')} WHERE id = $${fields.length + 1}`, [...fields.map((f) => plan[f]), req.params.id]);

    const updated = await queryOne(`${PLAN_WITH_SUBSCRIBERS} WHERE p.id = $1`, [req.params.id]);
    res.json({ success: true, plan: presentPlan(updated) });
  } catch (error) {
    next(error);
  }
});

// ── Cash held by riders ─────────────────────────────────────────────────────

const agentBy = (id) => queryOne(
  `SELECT da.id, da.user_id, da.cash_in_hand, u.full_name, u.phone_number
     FROM delivery_agents da
     LEFT JOIN users u ON u.id = da.user_id
    WHERE CAST(da.id AS TEXT) = $1 OR CAST(da.user_id AS TEXT) = $1`,
  [String(id)]
);

/** Riders holding cash, most first, and the limit past which they take no more cash orders. */
router.get('/delivery/cash', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const riders = await queryMany(
      `SELECT da.id, da.user_id, da.cash_in_hand, u.full_name, u.phone_number
         FROM delivery_agents da
         LEFT JOIN users u ON u.id = da.user_id
        WHERE COALESCE(da.cash_in_hand, 0) > 0
        ORDER BY da.cash_in_hand DESC
        LIMIT 200`
    );
    const limit = await platformConfig.get('rider_cash_limit');
    res.json({
      success: true,
      limit,
      totalOutstanding: money(riders.reduce((sum, r) => sum + (Number(r.cash_in_hand) || 0), 0)),
      riders: riders.map((r) => ({
        id: r.id,
        userId: r.user_id,
        name: r.full_name,
        phone: r.phone_number,
        cashInHand: money(r.cash_in_hand),
        overLimit: limit > 0 && Number(r.cash_in_hand) >= limit,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** One rider's cash: what they hold and every collection and deposit behind it. */
router.get('/delivery/agents/:id/cash', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const agent = await agentBy(req.params.id);
    if (!agent) return res.status(404).json({ success: false, error: 'Delivery agent not found' });
    const ledger = await queryMany(
      'SELECT id, order_id, entry_type, amount, recorded_by, note, created_at FROM rider_cash_ledger WHERE rider_user_id = $1 ORDER BY created_at DESC LIMIT 200',
      [String(agent.user_id)]
    );
    res.json({ success: true, rider: { id: agent.id, userId: agent.user_id, name: agent.full_name, cashInHand: money(agent.cash_in_hand) }, ledger });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/delivery/agents/:id/cash-deposit { amount, note? }
 *
 * The rider has handed over cash (or paid it into the platform's account).
 * The amount cannot be more than they are holding: the UPDATE only applies
 * while it is, so two people recording the same deposit cannot take the
 * balance below zero.
 */
router.post('/delivery/agents/:id/cash-deposit', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const amount = money(req.body && req.body.amount);
    if (!(amount > 0)) return res.status(400).json({ success: false, error: 'amount must be more than zero' });

    const agent = await agentBy(req.params.id);
    if (!agent) return res.status(404).json({ success: false, error: 'Delivery agent not found' });

    const recorded = await withTransaction(async (client) => {
      const reduced = await client.query(
        'UPDATE delivery_agents SET cash_in_hand = COALESCE(cash_in_hand, 0) - $1 WHERE id = $2 AND COALESCE(cash_in_hand, 0) >= $1',
        [amount, agent.id]
      );
      if (!reduced.rowCount) return false;
      await client.query(
        `INSERT INTO rider_cash_ledger (id, rider_user_id, entry_type, amount, recorded_by, note)
         VALUES ($1, $2, 'deposited', $3, $4, $5)`,
        [crypto.randomUUID(), String(agent.user_id), amount, String(req.user.id), String((req.body && req.body.note) || 'Cash deposited').slice(0, 200)]
      );
      return true;
    });

    if (!recorded) {
      return res.status(409).json({
        success: false,
        error: `This rider is holding ₹${money(agent.cash_in_hand)}; a deposit cannot be more than that.`,
        cashInHand: money(agent.cash_in_hand),
      });
    }
    await recordAudit(req, { action: 'rider_cash_deposit', targetType: 'delivery_agent', targetId: agent.user_id, details: { amount, note: (req.body && req.body.note) || null } });
    const after = await agentBy(agent.id);
    res.json({ success: true, cashInHand: money(after.cash_in_hand) });
  } catch (error) {
    next(error);
  }
});

// ── Refunds waiting on Razorpay ─────────────────────────────────────────────

/** Cancelled orders whose online payment has not yet gone back to the customer. */
router.get('/orders/refunds', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const orders = await queryMany(
      `SELECT o.id, o.user_id, o.shop_id, o.total_amount, o.payment_status, o.updated_at, u.full_name AS customer_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
        WHERE o.payment_status IN ('refund_pending', 'refunding')
        ORDER BY o.updated_at ASC
        LIMIT 200`
    );
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
});

/** Try the refund again now, rather than waiting for the hourly retry. */
router.post('/orders/:id/refund', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const outcome = await lifecycle.refundThroughGateway(req.params.id);
    if (!outcome.refunded) return res.status(409).json({ success: false, error: outcome.reason });
    res.json({ success: true, refundId: outcome.refundId });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

/**
 * Home-chef meal marketplace.
 *
 * GET /meals was the only route here, and it selected from a `chef_meals`
 * table that did not exist in either schema — so it threw on every call.
 * Migration 088 creates chef_meals and chef_meal_orders; posting a meal and
 * ordering one had no server side at all.
 */

// Migration 088 defaults chef_meals.status to 'active'. The previous query
// filtered on 'available', which would have matched nothing even had the
// table existed.
const ACTIVE = 'active';

// Discount applied when a buyer opts to spend SamparkCoins, while the
// platform-wide switch is on.
const COIN_DISCOUNT_RATE = 0.10;
const COIN_DISCOUNT_KEY = 'chef.coin_discount_enabled';

router.get('/meals', authenticate, async (req, res, next) => {
    try {
        const { pincode } = req.query;
        const params = [ACTIVE];
        let sql = `SELECT id, chef_id, chef_name, meal_name, description, price,
                          is_veg, available_plates, pincode, created_at
                     FROM chef_meals
                    WHERE status = $1 AND available_plates > 0`;
        if (pincode) {
            params.push(pincode);
            sql += ' AND pincode = $2';
        }
        sql += ' ORDER BY created_at DESC';

        const result = await query(sql, params);
        res.json({ success: true, data: result.rows || result || [] });
    } catch (err) {
        next(err);
    }
});

router.post('/meals', authenticate, async (req, res, next) => {
    try {
        const { mealName, description, isVeg, availablePlates, price, pincode } = req.body;

        if (!mealName || !String(mealName).trim()) {
            return res.status(400).json({ success: false, error: 'mealName is required' });
        }

        const plates = Number(availablePlates);
        const unitPrice = Number(price);
        if (!Number.isFinite(plates) || plates < 1) {
            return res.status(400).json({ success: false, error: 'availablePlates must be at least 1' });
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            return res.status(400).json({ success: false, error: 'price must be a non-negative number' });
        }

        const id = crypto.randomUUID();
        await query(
            `INSERT INTO chef_meals
                 (id, chef_id, chef_name, meal_name, description, price, is_veg,
                  available_plates, pincode, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [id, req.user.id, req.user.full_name || req.user.name || 'Home Chef',
             mealName, description || '', unitPrice,
             isVeg === false ? 0 : 1, plates, pincode || null, ACTIVE]
        );

        res.status(201).json({ success: true, data: { id }, message: 'Meal posted successfully' });
    } catch (err) {
        next(err);
    }
});

router.post('/meals/:id/order', authenticate, async (req, res, next) => {
    try {
        const quantity = Number(req.body.quantity) || 1;
        const { applyDiscount, deliveryOption, dropoffLocation } = req.body;

        if (!Number.isFinite(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, error: 'quantity must be at least 1' });
        }
        if (deliveryOption === 'delivery' && !dropoffLocation) {
            return res.status(400).json({ success: false, error: 'dropoffLocation is required for delivery' });
        }

        const discountEnabled = applyDiscount && (await isCoinDiscountEnabled());

        const outcome = await withTransaction(async (client) => {
            const found = await client.query(
                'SELECT id, chef_id, price, available_plates, status FROM chef_meals WHERE id = $1',
                [req.params.id]
            );
            const meal = (found.rows || [])[0];
            if (!meal) return { notFound: true };
            if (meal.status !== ACTIVE) return { unavailable: true };

            // Decrement and check in one statement so two buyers cannot both
            // take the last plate.
            const claim = await client.query(
                `UPDATE chef_meals
                    SET available_plates = available_plates - $1
                  WHERE id = $2 AND available_plates >= $1`,
                [quantity, req.params.id]
            );
            if (!claim.rowCount) return { soldOut: true };

            const gross = Number(meal.price) * quantity;
            const finalPrice = discountEnabled
                ? Math.round(gross * (1 - COIN_DISCOUNT_RATE) * 100) / 100
                : gross;

            const debit = await client.query(
                'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1',
                [finalPrice, req.user.id]
            );
            if (!debit.rowCount) {
                const err = new Error('INSUFFICIENT_BALANCE');
                err.code = 'INSUFFICIENT_BALANCE';
                throw err;
            }

            await client.query(
                `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
                 VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'debit', 'chef_meal', 'completed')`,
                [crypto.randomUUID(), req.user.id, finalPrice]
            );

            // The chef is paid the full price; the coin discount is borne by
            // the platform, not the cook.
            await client.query(
                'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
                [gross, meal.chef_id]
            );

            const orderId = crypto.randomUUID();
            await client.query(
                `INSERT INTO chef_meal_orders
                     (id, meal_id, user_id, plates, total_amount, coins_used, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')`,
                [orderId, req.params.id, req.user.id, quantity, finalPrice,
                 discountEnabled ? Math.round(gross * COIN_DISCOUNT_RATE) : 0]
            );

            return { ok: true, orderId, finalPrice, gross };
        }).catch((err) => {
            if (err.code === 'INSUFFICIENT_BALANCE') return { insufficient: true };
            throw err;
        });

        if (outcome.notFound) return res.status(404).json({ success: false, error: 'Meal not found' });
        if (outcome.unavailable) return res.status(409).json({ success: false, error: 'This meal is no longer available' });
        if (outcome.soldOut) return res.status(409).json({ success: false, error: 'Not enough plates left' });
        if (outcome.insufficient) {
            return res.status(402).json({ success: false, error: 'Insufficient wallet balance' });
        }

        res.status(201).json({
            success: true,
            data: {
                orderId: outcome.orderId,
                finalPrice: outcome.finalPrice,
                // Dispatching a delivery agent is a separate concern owned by
                // the logistics module; until this is wired to it, pickup is
                // the only fulfilment actually arranged here.
                deliveryJobId: null,
            },
            message: deliveryOption === 'delivery'
                ? 'Order confirmed. Arrange collection with the chef.'
                : 'Order confirmed. Ready for pickup!',
        });
    } catch (err) {
        next(err);
    }
});

// ─── Coin-discount switch ───────────────────────────────────────────────────

async function isCoinDiscountEnabled() {
    const row = await queryOne(
        'SELECT config_value FROM admin_config WHERE config_key = $1',
        [COIN_DISCOUNT_KEY]
    );
    return row ? row.config_value === 'true' : true;
}

router.get('/admin/coin-discount-status', authenticate, async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: { enabled: await isCoinDiscountEnabled(), rate: COIN_DISCOUNT_RATE },
        });
    } catch (err) {
        next(err);
    }
});

router.post('/admin/coin-discount-toggle', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const enabled = Boolean(req.body.enabled);
        const existing = await queryOne(
            'SELECT id FROM admin_config WHERE config_key = $1',
            [COIN_DISCOUNT_KEY]
        );

        if (existing) {
            await query(
                'UPDATE admin_config SET config_value = $1, updated_by = $2 WHERE config_key = $3',
                [String(enabled), req.user.id, COIN_DISCOUNT_KEY]
            );
        } else {
            await query(
                `INSERT INTO admin_config (id, config_key, config_value, config_category, is_active, updated_by)
                 VALUES ($1, $2, $3, 'chef', 1, $4)`,
                [crypto.randomUUID(), COIN_DISCOUNT_KEY, String(enabled), req.user.id]
            );
        }

        res.json({ success: true, data: { enabled }, message: `Coin discount ${enabled ? 'enabled' : 'disabled'}.` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

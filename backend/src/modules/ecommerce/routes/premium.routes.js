const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const payments = require('../../../services/payments.service');
const platformConfig = require('../../../services/platformConfig.service');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET status
router.get('/status', authenticate, async (req, res, next) => {
    try {
        // A membership counts while its paid period runs. Rows from before payment
        // existed have no end date and are not memberships: they were handed out free.
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const subData = await query(
            'SELECT * FROM user_subscriptions WHERE user_id = $1 AND status = $2 AND tier IS NOT NULL AND tier_expires_at IS NOT NULL AND tier_expires_at > $3',
            [req.user.id, 'active', now]
        );
        if (subData.rows && subData.rows.length > 0) {
            res.json({ isPremium: true, tier: subData.rows[0].tier, expiresAt: subData.rows[0].tier_expires_at });
        } else if (subData.length > 0) {
            res.json({ isPremium: true, tier: subData[0].tier, expiresAt: subData[0].tier_expires_at });
        } else {
            res.json({ isPremium: false });
        }
    } catch (err) {
        next(err);
    }
});

// GET /premium/plan — what SamparkPlus costs. Public: it is a price list. The
// apps used to hardcode their own (₹99 on one screen, ₹199 on another); they
// now read it from here, and the amount charged is read from the same setting.
router.get('/plan', async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: {
                tier: 'SamparkPlus',
                priceMonthly: await platformConfig.get('samparkplus_price_monthly'),
                freeDeliveryAbove: await platformConfig.get('samparkplus_free_delivery_above'),
                periodDays: payments.SUBSCRIPTION_PERIOD_DAYS,
                currency: 'INR',
            },
        });
    } catch (err) {
        next(err);
    }
});

// POST /premium/subscribe — start a SamparkPlus payment. Returns the Razorpay
// checkout the client opens; the membership starts when the VERIFIED payment is
// settled (services/payments.service.js), never on this request. The price is the
// server's: nothing in the body can change it. This used to insert a membership
// for whoever called it, free and repeatable.
router.post('/subscribe', authenticate, async (req, res, next) => {
    try {
        const checkout = await payments.createPayment({ user: req.user, purpose: 'sampark_plus' });
        res.status(201).json({ success: true, data: checkout });
    } catch (err) {
        if (err instanceof payments.PaymentError) {
            return res.status(err.status).json({ success: false, code: err.code, error: err.message });
        }
        if (err && err.name === 'PaymentsUnavailableError') {
            return res.status(503).json({ success: false, code: 'PAYMENTS_UNAVAILABLE', error: 'Online payments are not available right now.' });
        }
        next(err);
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');
const coins = require('../../../services/coins.service');

// Configure Coin Value (100 coins = 10 rupees)
const COINS_PER_RUPEE = 10; 

/**
 * 1. REFERRAL - Claim a code
 */
router.post('/referral/claim', authenticate, async (req, res) => {
    try {
        const referralCode = String((req.body || {}).referralCode || '').trim();
        const refereeId = req.user.id;

        if (!referralCode) return res.status(400).json({ error: 'Referral code is required' });

        // Find referrer by code
        const referrerResult = await query(`SELECT id FROM users WHERE my_referral_code = $1`, [referralCode]);
        if (referrerResult.rows.length === 0) return res.status(404).json({ error: 'Invalid referral code' });

        const referrerId = referrerResult.rows[0].id;
        if (String(referrerId) === String(refereeId)) return res.status(400).json({ error: 'Cannot refer yourself' });

        // 500 Coins for Referrer (₹50), 200 Coins for Referee (₹20)
        const referrerCoins = 50 * COINS_PER_RUPEE;
        const refereeCoins = 20 * COINS_PER_RUPEE;

        // The claim and both rewards are one transaction, and the claim row is
        // what decides who gets through: referrals has one row per referee
        // (migration 121), so of two requests sent together only one inserts.
        // This used to SELECT for an earlier claim and then insert and pay as
        // five separate statements — "mocking transaction in SQLite via
        // sequential logic" — which both paid a double-tap twice and could
        // stop half-way, leaving one party rewarded and the other not.
        const ALREADY = 'ALREADY_CLAIMED';
        try {
            await withTransaction(async (client) => {
                const existing = await client.query(`SELECT id FROM referrals WHERE referee_id = $1`, [refereeId]);
                if (existing.rows.length > 0) throw Object.assign(new Error(ALREADY), { code: ALREADY });

                await client.query(
                    `INSERT INTO referrals (id, referrer_id, referee_id, referral_code, status, reward_issued) VALUES ($1, $2, $3, $4, 'completed', 1)`,
                    [uuidv4(), referrerId, refereeId, referralCode]
                );

                                // On the one coin balance the apps show (services/coins.service.js).
                // These went to users.total_coins and reward_coins_ledger, which
                // no balance screen read and nothing could spend.
                await coins.credit({ userId: referrerId, amount: referrerCoins, reason: 'Referred a friend', referenceId: `referral:${refereeId}`, client });
                await coins.credit({ userId: refereeId, amount: refereeCoins, reason: 'Joined via referral', referenceId: `referral:${refereeId}`, client });
            });
        } catch (error) {
            // Either our own check, or the unique index catching a simultaneous claim.
            const duplicate = error.code === ALREADY || error.code === '23505' || /UNIQUE constraint failed/i.test(String(error.message));
            if (duplicate) return res.status(400).json({ error: 'You have already used a referral code' });
            throw error;
        }

        res.json({ message: 'Referral claimed successfully', coinsEarned: refereeCoins });
    } catch (error) {
        console.error('Referral claim error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * 2. REWARD COINS - Get Balance
 */
router.get('/rewards/balance', authenticate, async (req, res) => {
    try {
        const userResult = await query(`SELECT total_coins, my_referral_code FROM users WHERE id = $1`, [req.user.id]);
        
        // Auto-generate referral code if not exists
        let refCode = userResult.rows[0].my_referral_code;
        if (!refCode) {
            refCode = 'LS' + Math.random().toString(36).substring(2, 8).toUpperCase();
            await query(`UPDATE users SET my_referral_code = $1 WHERE id = $2`, [refCode, req.user.id]);
        }

                const ledgerResult = await query(
            `SELECT id, amount, transaction_type, description, reference_id, created_at
               FROM loyalty_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [req.user.id]
        );
        const balance = await coins.balance(req.user.id);

        res.json({
            coins: balance,
            rupeeValue: balance / COINS_PER_RUPEE,
            referralCode: refCode,
            history: ledgerResult.rows
        });
    } catch (error) {
        console.error('Rewards error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * 3. REVIEWS - Submit a rating
 */
router.post('/reviews/submit', authenticate, async (req, res) => {
    try {
        const { targetId, targetType, rating, comment } = req.body;
        
        if (!targetId || !targetType || !rating) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

        // C11: a review of a shop is held to the shop rule (a delivered order
        // from it) and stored with the shop's other reviews. This wrote it
        // here for anyone and overwrote the shop's rating with this table's
        // average.
        if (targetType === 'shop') {
            const reviews = require('../../../services/reviews.service');
            try {
                const saved = await reviews.submit({ userId: req.user.id, shopId: targetId, rating: Number(rating), text: comment, mode: 'upsert' });
                return res.json({ message: 'Review submitted successfully', reviewId: saved.id });
            } catch (e) {
                if (e && e.name === 'ReviewError') return res.status(e.status).json({ error: e.message, code: e.code });
                throw e;
            }
        }

        const reviewId = uuidv4();
        await query(`INSERT INTO reviews (id, user_id, target_id, target_type, rating, comment) VALUES ($1, $2, $3, $4, $5, $6)`,
            [reviewId, req.user.id, targetId, targetType, rating, comment]
        );

        res.json({ message: 'Review submitted successfully', reviewId });
    } catch (error) {
        console.error('Review submit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

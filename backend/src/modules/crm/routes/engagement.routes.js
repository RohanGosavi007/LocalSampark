const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
const { v4: uuidv4 } = require('uuid');

// Configure Coin Value (100 coins = 10 rupees)
const COINS_PER_RUPEE = 10; 

/**
 * 1. REFERRAL - Claim a code
 */
router.post('/referral/claim', authenticate, async (req, res) => {
    try {
        const { referralCode } = req.body;
        const refereeId = req.user.id;

        if (!referralCode) return res.status(400).json({ error: 'Referral code is required' });

        // Find referrer by code
        const referrerResult = await query(`SELECT id FROM users WHERE my_referral_code = $1`, [referralCode]);
        if (referrerResult.rows.length === 0) return res.status(404).json({ error: 'Invalid referral code' });

        const referrerId = referrerResult.rows[0].id;
        if (referrerId === refereeId) return res.status(400).json({ error: 'Cannot refer yourself' });

        // Check if referee already claimed a code
        const existingClaim = await query(`SELECT id FROM referrals WHERE referee_id = $1`, [refereeId]);
        if (existingClaim.rows.length > 0) return res.status(400).json({ error: 'You have already used a referral code' });

        // 500 Coins for Referrer (₹50), 200 Coins for Referee (₹20)
        const referrerCoins = 50 * COINS_PER_RUPEE; 
        const refereeCoins = 20 * COINS_PER_RUPEE;

        // Start transaction (mocking transaction in SQLite via sequential logic)
        const referralId = uuidv4();
        await query(
            `INSERT INTO referrals (id, referrer_id, referee_id, referral_code, status, reward_issued) VALUES ($1, $2, $3, $4, 'completed', 1)`,
            [referralId, referrerId, refereeId, referralCode]
        );

        // Update balances
        await query(`UPDATE users SET total_coins = total_coins + $1 WHERE id = $2`, [referrerCoins, referrerId]);
        await query(`UPDATE users SET total_coins = total_coins + $1 WHERE id = $2`, [refereeCoins, refereeId]);

        // Ledger entries
        await query(`INSERT INTO reward_coins_ledger (id, user_id, amount, transaction_type, description) VALUES ($1, $2, $3, 'earned_referral', 'Referred a friend')`,
            [uuidv4(), referrerId, referrerCoins]);
        await query(`INSERT INTO reward_coins_ledger (id, user_id, amount, transaction_type, description) VALUES ($1, $2, $3, 'earned_referral', 'Joined via referral')`,
            [uuidv4(), refereeId, refereeCoins]);

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

        const ledgerResult = await query(`SELECT * FROM reward_coins_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [req.user.id]);

        res.json({
            coins: userResult.rows[0].total_coins || 0,
            rupeeValue: (userResult.rows[0].total_coins || 0) / COINS_PER_RUPEE,
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

        const reviewId = uuidv4();
        await query(
            `INSERT INTO reviews (id, user_id, target_id, target_type, rating, comment) VALUES ($1, $2, $3, $4, $5, $6)`,
            [reviewId, req.user.id, targetId, targetType, rating, comment]
        );

        // Calculate and update average rating (e.g., on shop table) if targetType is 'shop'
        if (targetType === 'shop') {
            const avgResult = await query(`SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE target_id = $1`, [targetId]);
            const avgRating = parseFloat(avgResult.rows[0].avg_rating).toFixed(1);
            const reviewCount = parseInt(avgResult.rows[0].review_count);
            // Assuming local_shops has these columns, update them
            // await query(`UPDATE local_shops SET rating = $1, total_ratings = $2 WHERE id = $3`, [avgRating, reviewCount, targetId]);
        }

        res.json({ message: 'Review submitted successfully', reviewId });
    } catch (error) {
        console.error('Review submit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

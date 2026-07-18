const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const crypto = require('crypto');

// GET status
router.get('/status', authenticate, async (req, res, next) => {
    try {
        const subData = await query('SELECT * FROM user_subscriptions WHERE user_id = $1 AND status = $2', [req.user.id, 'active']);
        if (subData.rows && subData.rows.length > 0) {
            res.json({ isPremium: true, tier: subData.rows[0].tier });
        } else if (subData.length > 0) {
            res.json({ isPremium: true, tier: subData[0].tier });
        } else {
            res.json({ isPremium: false });
        }
    } catch (err) {
        next(err);
    }
});

// POST subscribe
router.post('/subscribe', authenticate, async (req, res, next) => {
    try {
        const id = crypto.randomUUID();
        const startDate = new Date().toISOString();
        
        await query('INSERT INTO user_subscriptions (id, user_id, tier, start_date) VALUES ($1, $2, $3, $4)',
            [id, req.user.id, 'SamparkPlus', startDate]);
            
        res.status(200).json({ success: true, message: 'Successfully subscribed to SamparkPlus!' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

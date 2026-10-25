const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET rewards catalog
router.get('/catalog', authenticate, async (req, res, next) => {
    try {
        const catData = await query('SELECT * FROM reward_catalog ORDER BY coin_cost ASC');
        res.json(catData.rows || catData);
    } catch (err) {
        next(err);
    }
});

// POST redeem reward
router.post('/redeem', authenticate, async (req, res, next) => {
    try {
        const { reward_id } = req.body;
        // Mock deduction of loyalty coins would go here, maybe check if they have enough balance in loyalty_accounts
        res.status(200).json({ success: true, message: 'Reward redeemed successfully!' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

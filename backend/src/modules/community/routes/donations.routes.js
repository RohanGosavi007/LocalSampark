const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// GET donation campaigns
router.get('/campaigns', authenticate, async (req, res, next) => {
    try {
        const campData = await query('SELECT * FROM donation_campaigns WHERE status = $1', ['active']);
        res.json(campData.rows || campData);
    } catch (err) {
        next(err);
    }
});

// POST donate
router.post('/donate', authenticate, async (req, res, next) => {
    try {
        const { campaign_id, amount } = req.body;
        await query('UPDATE donation_campaigns SET raised_amount = raised_amount + $1 WHERE id = $2', [amount, campaign_id]);
        res.status(200).json({ success: true, message: 'Donation successful! Thank you.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

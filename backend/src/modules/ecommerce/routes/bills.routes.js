const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');

// GET user's past bills
router.get('/history', authenticate, async (req, res, next) => {
    try {
        const bills = await query('SELECT * FROM utility_bills WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json(bills.rows || bills);
    } catch (err) {
        next(err);
    }
});

// POST pay bill
router.post('/pay', authenticate, async (req, res, next) => {
    try {
        const { provider, amount } = req.body;
        const id = crypto.randomUUID();
        
        // Record the bill
        await query('INSERT INTO utility_bills (id, user_id, provider, amount, status) VALUES ($1, $2, $3, $4, $5)', [id, req.user.id, provider, amount, 'completed']);

        // Mock: distribute commission to franchise
        // Assuming franchise for pincode is known, we mock by picking the first franchise
        const franchiseData = await query('SELECT id FROM franchises LIMIT 1');
        const franchiseRows = franchiseData.rows || franchiseData;
        
        if (franchiseRows.length > 0) {
            const commission = amount * 0.01; // 1% commission for BBPS equivalent
            await query('INSERT INTO franchise_earnings (id, franchise_id, amount, source_type) VALUES ($1, $2, $3, $4)', [crypto.randomUUID(), franchiseRows[0].id, commission, 'bill_payment']);
        }

        res.status(201).json({ success: true, id, message: 'Bill paid successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

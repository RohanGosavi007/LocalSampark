const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const crypto = require('crypto');

// GET wallet history and balance
router.get('/history', authenticate, async (req, res, next) => {
    try {
        const txData = await query('SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        const transactions = txData.rows || txData;
        
        const balance = transactions.reduce((acc, curr) => acc + curr.amount, 0);

        res.json({ balance, transactions });
    } catch (err) {
        next(err);
    }
});

// POST topup wallet
router.post('/topup', authenticate, async (req, res, next) => {
    try {
        const { amount } = req.body;
        const id = crypto.randomUUID();
        await query('INSERT INTO wallet_transactions (id, user_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
            [id, req.user.id, amount, 'credit', 'Wallet Top-up']);
        res.status(201).json({ success: true, message: 'Wallet recharged successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

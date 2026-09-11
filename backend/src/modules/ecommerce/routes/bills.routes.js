const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../../../config/database');
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

        // Commission on the bill goes to the franchise partner whose territory
        // the payer is in.
        //
        // This read `SELECT id FROM franchises LIMIT 1` — a table that does not
        // exist (the partner table is franchise_partners), under a comment
        // admitting "we mock by picking the first franchise". Had the table
        // existed, every bill paid anywhere in the country would have credited
        // whichever partner happened to sort first. Money has to reach the right
        // person or not move at all.
        const payer = await queryOne('SELECT region_id FROM users WHERE id = $1', [req.user.id]);
        const region = payer?.region_id
            ? await queryOne('SELECT pincode FROM regions WHERE id = $1', [payer.region_id])
            : null;

        if (region?.pincode) {
            const partner = await queryOne(
                `SELECT id FROM franchise_partners
                  WHERE territory_pincode = $1 AND status = 'active'
                  LIMIT 1`,
                [region.pincode]
            );

            if (partner) {
                const commission = amount * 0.01; // 1% on BBPS-equivalent payments
                await query(
                    'INSERT INTO franchise_earnings (id, franchise_id, amount, source_type, reference_id) VALUES ($1, $2, $3, $4, $5)',
                    [crypto.randomUUID(), partner.id, commission, 'bill_payment', id]
                );
            }
            // No partner for that pincode means no commission is owed. Crediting
            // someone else would be worse than crediting nobody.
        }

        res.status(201).json({ success: true, id, message: 'Bill paid successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

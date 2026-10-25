const express = require('express');
const { validate } = require('../../../middleware/validate');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const payments = require('../../../services/payments.service');
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

// Bill payment is open. There is no biller integration (BBPS or a partner)
// behind it yet, so a payment is taken from the customer's wallet and recorded
// as 'processing' for an operator to settle with the biller; it is never marked
// completed here. (It used to record 'completed' on the client's say-so, with no
// money moving, and accrue a franchise commission on the client's amount.)
// Set BILL_PAY_ENABLED=false to close it.
const billPayEnabled = () => process.env.BILL_PAY_ENABLED !== 'false';

router.get('/status', (req, res) => {
    res.json({ success: true, available: billPayEnabled() });
});

const MAX_BILL_RUPEES = 100000;

// POST pay bill — from the caller's wallet.
router.post('/pay', authenticate, validate({
  provider: { type: 'string', required: true, maxLength: 80 },
  amount: { type: 'number', required: true, min: 1, max: 100000 },
}), async (req, res, next) => {
    try {
        if (!billPayEnabled()) {
            return res.status(503).json({
                success: false,
                code: 'BILL_PAY_UNAVAILABLE',
                error: 'Bill payments are not available yet.',
            });
        }

        const provider = String(req.body?.provider || '').trim().slice(0, 80);
        const amount = Math.round(Number(req.body?.amount) * 100) / 100;
        if (!provider) return res.status(400).json({ success: false, error: 'provider is required' });
        // The amount feeds a debit and a commission, so it is held to a real
        // range. A negative or huge value used to be stored and commissioned as is.
        if (!Number.isFinite(amount) || amount < 1 || amount > MAX_BILL_RUPEES) {
            return res.status(400).json({ success: false, error: `amount must be between ₹1 and ₹${MAX_BILL_RUPEES}` });
        }

        const id = crypto.randomUUID();
        const payer = await queryOne('SELECT region_id FROM users WHERE id = $1', [req.user.id]);
        const region = payer?.region_id
            ? await queryOne('SELECT pincode FROM regions WHERE id = $1', [payer.region_id])
            : null;
        const partner = region?.pincode
            ? await queryOne(
                `SELECT id FROM franchise_partners WHERE territory_pincode = $1 AND status = 'active' LIMIT 1`,
                [region.pincode]
            )
            : null;

        // The wallet debit, the bill and the commission succeed or fail together.
        // 'processing', not 'completed': the biller has not been paid yet.
        await withTransaction(async (client) => {
            await payments.debitWallet({ userId: req.user.id, amount, purpose: 'bill_payment', referenceId: id, client });
            await client.query(
                'INSERT INTO utility_bills (id, user_id, provider, amount, status) VALUES ($1, $2, $3, $4, $5)',
                [id, req.user.id, provider, amount, 'processing']
            );
            // No partner for the payer's pincode means no commission is owed;
            // crediting someone else would be worse than crediting nobody.
            if (partner) {
                await client.query(
                    'INSERT INTO franchise_earnings (id, franchise_id, amount, source_type, reference_id) VALUES ($1, $2, $3, $4, $5)',
                    [crypto.randomUUID(), partner.id, Math.round(amount * 0.01 * 100) / 100, 'bill_payment', id]
                );
            }
        });

        res.status(201).json({ success: true, id, status: 'processing', message: 'Payment received. Your bill is being processed.' });
    } catch (err) {
        if (err instanceof payments.PaymentError) {
            return res.status(err.status).json({ success: false, code: err.code, error: err.message });
        }
        next(err);
    }
});

module.exports = router;

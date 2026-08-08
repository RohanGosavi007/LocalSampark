const express = require('express');
const router = express.Router();
const { query } = require('../../../../config/database');
const { authenticate } = require('../../../../middleware/auth.middleware');
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

// POST create topup order token (Tokenized Flow)
router.post('/create-topup-order', authenticate, async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const orderId = 'W_ORD_' + crypto.randomBytes(8).toString('hex');
        const token = crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret')
                            .update(`${req.user.id}:${amount}:${orderId}`)
                            .digest('hex');

        res.status(200).json({
            success: true,
            orderId,
            amount,
            currency: 'INR',
            token,
            message: 'Payment order tokenized successfully. Proceed to gateway.'
        });
    } catch (err) {
        next(err);
    }
});

// POST verify and credit wallet
router.post('/verify-topup', authenticate, async (req, res, next) => {
    try {
        const { amount, orderId, token } = req.body;
        if (!amount || !orderId || !token) {
            return res.status(400).json({ error: 'Missing payment parameters' });
        }

        // Verify token signature
        const expectedToken = crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret')
                                    .update(`${req.user.id}:${amount}:${orderId}`)
                                    .digest('hex');

        if (token !== expectedToken) {
            return res.status(401).json({ error: 'Invalid or tampered payment token signature' });
        }

        // Check if transaction order was already processed (Idempotency)
        const existingTx = await query('SELECT id FROM wallet_transactions WHERE description LIKE $1', [`%${orderId}%`]);
        if (existingTx.rows && existingTx.rows.length > 0) {
            return res.status(400).json({ error: 'Payment order already processed' });
        }

        const id = crypto.randomUUID();
        await query(
            'INSERT INTO wallet_transactions (id, user_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
            [id, req.user.id, amount, 'credit', `Wallet Top-up (${orderId})`]
        );

        res.status(200).json({ success: true, message: 'Wallet credited successfully after verification' });
    } catch (err) {
        next(err);
    }
});

// POST unlock high-ticket lead (Pay-Per-Lead Engine)
router.post('/unlock-lead', authenticate, async (req, res, next) => {
    try {
        const { lead_id, lead_type = 'job', fee_amount = 49 } = req.body;
        if (!lead_id) {
            return res.status(400).json({ error: 'lead_id is required' });
        }

        // Verify lead exists and get details
        let leadData = await query('SELECT * FROM leads WHERE id = $1 OR lead_number = $1', [lead_id]);
        if (!leadData || !(leadData.rows || leadData).length) {
            // fallback to crm_leads if it's named differently
            leadData = await query('SELECT * FROM crm_leads WHERE id = $1', [lead_id]);
        }
        const leads = leadData.rows || leadData || [];
        if (!leads.length) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        const lead = leads[0];

        // Check for double unlock
        const existingUnlock = await query(
            'SELECT id FROM wallet_transactions WHERE user_id = $1 AND description LIKE $2',
            [req.user.id, `%Lead Unlock Fee (${lead_type.toUpperCase()} #${lead_id})%`]
        );
        if (existingUnlock.rows && existingUnlock.rows.length > 0) {
            return res.json({
                success: true,
                message: 'Lead already unlocked previously.',
                lead_id,
                fee_deducted: 0,
                customer_contact: {
                    full_name: lead.name || 'Unknown',
                    phone_number: lead.phone || 'Not provided',
                    email: lead.email || 'Not provided',
                    address: lead.location || 'Not provided'
                }
            });
        }

        // Get user wallet balance
        const txData = await query('SELECT amount FROM wallet_transactions WHERE user_id = $1', [req.user.id]);
        const transactions = txData.rows || txData || [];
        const currentBalance = transactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        if (currentBalance < fee_amount) {
            return res.status(402).json({ error: `Insufficient wallet balance (₹${currentBalance}). Unlocking requires ₹${fee_amount}.` });
        }

        // Deduct lead unlock fee
        const id = crypto.randomUUID();
        await query(
            'INSERT INTO wallet_transactions (id, user_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4, $5)',
            [id, req.user.id, -fee_amount, 'debit', `Lead Unlock Fee (${lead_type.toUpperCase()} #${lead_id})`]
        );

        res.json({
            success: true,
            message: 'Lead unlocked successfully!',
            lead_id,
            fee_deducted: fee_amount,
            customer_contact: {
                full_name: lead.name || 'Unknown',
                phone_number: lead.phone || 'Not provided',
                email: lead.email || 'Not provided',
                address: lead.location || 'Not provided'
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

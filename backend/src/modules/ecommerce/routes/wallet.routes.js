const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { getJwtSecret } = require('../../../config/secrets');
const payments = require('../../../services/payments.service');
const { sendPaymentError } = require('../../payments/routes/razorpay.routes');
const crypto = require('crypto');

// GET wallet history and balance
//
// The balance is read from wallets.balance, not derived by summing
// wallet_transactions. Deriving it was wrong on two counts:
//
//   1. wallets.balance is the authoritative column. Every debit path in the
//      codebase — checkout, the subscription auto-debit in jobs/worker.js,
//      donations, equipment rental, chef orders — mutates it directly and
//      never consults the ledger, so the two could not agree.
//   2. The ledger's sign convention is not consistent. Most inserts record a
//      debit as a POSITIVE amount with type='debit'; /unlock-lead below
//      records it as a NEGATIVE amount. Summing `amount` therefore added
//      most debits to the balance instead of subtracting them, and the number
//      the wallet screen displayed grew every time the user spent money.
//
// The ledger remains the audit trail and is still returned in full.
router.get('/history', authenticate, async (req, res, next) => {
    try {
        const walletRow = await queryOne(
            'SELECT id, balance FROM wallets WHERE user_id = $1',
            [req.user.id]
        );

        if (!walletRow) {
            return res.json({ balance: 0, transactions: [] });
        }

        const txData = await query(
            `SELECT * FROM wallet_transactions
              WHERE wallet_id = $1
              ORDER BY created_at DESC
              LIMIT 200`,
            [walletRow.id]
        );

        res.json({
            balance: Number(walletRow.balance) || 0,
            transactions: txData.rows || txData || [],
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Wallet top-up.
 *
 * Crediting a wallet is minting money, and for a while this file minted it for
 * anyone who asked. /create-topup-order returned an HMAC over
 * (user, amount, orderId) signed with the server's own secret, and
 * /verify-topup and /topup credited the wallet when that HMAC was presented
 * back. The "token" was proof that the server had been asked, not that anyone
 * had paid: two requests, no gateway, any amount.
 *
 * A top-up is now a Razorpay payment like any other. The amount is fixed in a
 * `payments` row when the gateway order is created, and the wallet is credited
 * by payments.service — once — when Razorpay's signature for that order is
 * verified here, or its webhook arrives, whichever is first.
 *
 *   POST /create-topup-order { amount }   -> { keyId, razorpayOrderId, amount, … }
 *   POST /verify-topup { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *   POST /topup                            same as verify when given those three
 *
 * Without Razorpay keys the first of these answers 503 and nothing is credited.
 */
router.post('/create-topup-order', authenticate, async (req, res, next) => {
    try {
        const payment = await payments.createPayment({
            user: req.user,
            purpose: 'wallet_topup',
            amount: req.body && req.body.amount,
        });
        res.status(201).json({ success: true, ...payment });
    } catch (err) {
        sendPaymentError(res, err, next);
    }
});

async function verifyTopup(req, res, next) {
    try {
        const body = req.body || {};
        const outcome = await payments.confirmPayment({
            user: req.user,
            razorpayOrderId: body.razorpay_order_id || body.razorpayOrderId,
            razorpayPaymentId: body.razorpay_payment_id || body.razorpayPaymentId,
            signature: body.razorpay_signature || body.razorpaySignature,
        });
        const wallet = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]);
        res.json({
            success: true,
            message: outcome.alreadyPaid ? 'This payment has already been credited' : 'Wallet credited',
            data: { balance: wallet ? Number(wallet.balance) || 0 : 0 },
        });
    } catch (err) {
        sendPaymentError(res, err, next);
    }
}

router.post('/verify-topup', authenticate, verifyTopup);

/**
 * POST /topup — what apps/mobile/app/modules/wallet/index.js calls.
 *
 * With the three Razorpay fields it is /verify-topup. Without them it credits
 * directly, and only in a process whose NODE_ENV is development or test: that
 * is a convenience for working on screens that need a balance, and it is free
 * money, so it is an allow-list rather than "anything but production".
 */
router.post('/topup', authenticate, async (req, res, next) => {
    try {
        const body = req.body || {};
        if (body.razorpay_order_id || body.razorpayOrderId) {
            return verifyTopup(req, res, next);
        }

        if (!['development', 'test'].includes(process.env.NODE_ENV)) {
            return res.status(400).json({
                success: false,
                error: 'Start a top-up with POST /wallet/create-topup-order, complete the payment, then send the Razorpay result here.',
            });
        }

        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > payments.TOPUP_MAX_RUPEES) {
            return res.status(400).json({ success: false, error: 'A positive amount is required' });
        }

        const balance = await withTransaction(async (client) => {
            let wallet = (await client.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.id])).rows[0];
            if (!wallet) {
                wallet = { id: crypto.randomUUID() };
                await client.query('INSERT INTO wallets (id, user_id, balance) VALUES ($1, $2, 0)', [wallet.id, req.user.id]);
            }
            await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amount, wallet.id]);
            await client.query(
                `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
                 VALUES ($1, $2, $3, 'credit', 'dev_topup', 'completed')`,
                [crypto.randomUUID(), wallet.id, amount]
            );
            const updated = await client.query('SELECT balance FROM wallets WHERE id = $1', [wallet.id]);
            return Number(updated.rows[0].balance) || 0;
        });

        res.json({ success: true, data: { balance }, message: `₹${amount} added to your wallet (development only)` });
    } catch (err) {
        next(err);
    }
});

// POST unlock high-ticket lead (Pay-Per-Lead Engine)
// The unlock fee is set by the server. It used to be read from the request
// body (`fee_amount`, default 49), so any caller could unlock a lead for ₹0.01;
// a positivity check on that value did not change who chose the price.
const LEAD_UNLOCK_FEE_RUPEES = 49;
const LEAD_TYPE_RE = /^[a-z_]{1,32}$/;

router.post('/unlock-lead', authenticate, async (req, res, next) => {
    try {
        const { lead_id, lead_type = 'job' } = req.body || {};
        const fee_amount = LEAD_UNLOCK_FEE_RUPEES;
        if (!lead_id || (typeof lead_id !== 'string' && typeof lead_id !== 'number')) {
            return res.status(400).json({ error: 'lead_id is required' });
        }
        if (typeof lead_type !== 'string' || !LEAD_TYPE_RE.test(lead_type)) {
            return res.status(400).json({ error: 'lead_type must be a short lowercase identifier' });
        }
        if (req.body && req.body.fee_amount !== undefined && Number(req.body.fee_amount) !== fee_amount) {
            return res.status(400).json({ error: `The unlock fee is ₹${fee_amount}; a different amount cannot be supplied` });
        }

        // Verify lead exists and get details
        // This first queried a `leads` table that has never existed, so the
        // fallback below was doing all the work anyway.
        const leadData = await query('SELECT * FROM crm_leads WHERE id = $1', [lead_id]);
        const leads = leadData.rows || leadData || [];
        if (!leads.length) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        const lead = leads[0];

        // Check for double unlock
        const existingUnlock = await query('SELECT id FROM wallet_transactions WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = $1) AND purpose LIKE $2',
            [req.user.id, `%Lead Unlock Fee (${lead_type.toUpperCase()} #${lead_id})%`]
        );
        if ((existingUnlock.rows || existingUnlock || []).length > 0) {
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

        // Deduct the unlock fee from the authoritative balance.
        //
        // This previously derived the balance by summing wallet_transactions
        // and then wrote the debit as a NEGATIVE amount — the opposite sign
        // convention to every other debit in the codebase, and against a
        // column it never touched. So the fee was never actually taken from
        // wallets.balance, and the check it gated on was reading a number
        // that did not reflect the user's real money.
        const debited = await withTransaction(async (client) => {
            const result = await client.query(
                'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1',
                [fee_amount, req.user.id]
            );
            if (!result.rowCount) return false;

            await client.query(
                `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
                 VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'debit', $4, 'completed')`,
                [crypto.randomUUID(), req.user.id, fee_amount,
                 `Lead Unlock Fee (${lead_type.toUpperCase()} #${lead_id})`]
            );
            return true;
        });

        if (!debited) {
            return res.status(402).json({
                error: `Insufficient wallet balance. Unlocking requires ₹${fee_amount}.`,
            });
        }

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

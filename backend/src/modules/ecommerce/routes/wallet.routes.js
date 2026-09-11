const express = require('express');
const router = express.Router();
const { query, queryOne, withTransaction } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const { getJwtSecret } = require('../../../config/secrets');
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

// POST create topup order token (Tokenized Flow)
router.post('/create-topup-order', authenticate, async (req, res, next) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const orderId = 'W_ORD_' + crypto.randomBytes(8).toString('hex');
        const secret = getJwtSecret();
        const token = crypto.createHmac('sha256', secret)
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

/**
 * POST /topup — what apps/mobile/app/modules/wallet/index.js actually calls.
 *
 * The mobile "Add Money" button has always posted here; only
 * /create-topup-order and /verify-topup existed, so the button 404'd and the
 * screen reported a generic failure.
 *
 * Crediting a wallet is minting money, so this deliberately does NOT credit on
 * an unauthenticated amount. Two modes:
 *
 *   - With `orderId` + `token`: verifies the HMAC issued by
 *     /create-topup-order, exactly as /verify-topup does, and credits.
 *   - Without them: only outside production, so the flow is testable on a dev
 *     build. In production this returns 400 and points at the gateway flow,
 *     rather than handing out free balance.
 */
router.post('/topup', authenticate, async (req, res, next) => {
    try {
        const { orderId, token } = req.body;
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, error: 'A positive amount is required' });
        }

        if (orderId && token) {
            const expected = crypto
                .createHmac('sha256', getJwtSecret())
                .update(`${req.user.id}:${amount}:${orderId}`)
                .digest('hex');

            // timingSafeEqual needs equal-length buffers; the length check
            // guards against it throwing on a malformed token.
            const provided = Buffer.from(String(token));
            const expectedBuf = Buffer.from(expected);
            const valid =
                provided.length === expectedBuf.length &&
                crypto.timingSafeEqual(provided, expectedBuf);

            if (!valid) {
                return res.status(401).json({ success: false, error: 'Invalid or tampered payment token' });
            }
        } else if (process.env.NODE_ENV === 'production') {
            return res.status(400).json({
                success: false,
                error: 'Direct top-up is not permitted. Call /wallet/create-topup-order, complete payment, then retry with orderId and token.',
            });
        }

        const reference = orderId || `DEV_${crypto.randomBytes(6).toString('hex')}`;

        const outcome = await withTransaction(async (client) => {
            // Idempotency: the same gateway order must never credit twice, even
            // if the client retries after a timeout.
            const seen = await client.query(
                `SELECT id FROM wallet_transactions
                  WHERE wallet_id = (SELECT id FROM wallets WHERE user_id = $1)
                    AND purpose = $2`,
                [req.user.id, `Wallet Top-up (${reference})`]
            );
            if ((seen.rows || []).length) return { duplicate: true };

            const credited = await client.query(
                'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
                [amount, req.user.id]
            );
            if (!credited.rowCount) return { noWallet: true };

            await client.query(
                `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
                 VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'credit', $4, 'completed')`,
                [crypto.randomUUID(), req.user.id, amount, `Wallet Top-up (${reference})`]
            );

            const updated = await client.query(
                'SELECT balance FROM wallets WHERE user_id = $1',
                [req.user.id]
            );
            return { ok: true, balance: Number((updated.rows || [])[0]?.balance) || 0 };
        });

        if (outcome.duplicate) {
            return res.status(409).json({ success: false, error: 'This payment has already been credited' });
        }
        if (outcome.noWallet) {
            return res.status(404).json({ success: false, error: 'No wallet found for this user' });
        }

        res.json({
            success: true,
            data: { balance: outcome.balance },
            message: `₹${amount} added to your wallet`,
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
        const secret = getJwtSecret();
        const expectedToken = crypto.createHmac('sha256', secret)
                                    .update(`${req.user.id}:${amount}:${orderId}`)
                                    .digest('hex');

        if (token !== expectedToken) {
            return res.status(401).json({ error: 'Invalid or tampered payment token signature' });
        }

        // Check if transaction order was already processed (Idempotency)
        const existingTx = await query('SELECT id FROM wallet_transactions WHERE purpose LIKE $1', [`%${orderId}%`]);
        if (existingTx.rows && existingTx.rows.length > 0) {
            return res.status(400).json({ error: 'Payment order already processed' });
        }

        // The ledger row alone is not a credit: wallets.balance is the column
        // every spend path reads and decrements. Writing only the transaction
        // left the money invisible — the user's balance never moved, so a
        // verified top-up could not be spent.
        await withTransaction(async (client) => {
            await client.query(
                'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
                [amount, req.user.id]
            );
            await client.query(
                `INSERT INTO wallet_transactions (id, wallet_id, amount, type, purpose, status)
                 VALUES ($1, (SELECT id FROM wallets WHERE user_id = $2), $3, 'credit', $4, 'completed')`,
                [crypto.randomUUID(), req.user.id, amount, `Wallet Top-up (${orderId})`]
            );
        });

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

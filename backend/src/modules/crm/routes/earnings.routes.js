const express = require('express');
const router = express.Router();
const db = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');
const payments = require('../../../services/payments.service');

const MIN_WITHDRAWAL = 100;
const UPI_ID = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

const isStaff = (req) => ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());

/** Earnings belong to the person who earned them; staff may look anyone up. */
function ownEarnings(req, res, next) {
  if (String(req.params.userId) !== String(req.user.id) && !isStaff(req)) {
    return res.status(403).json({ error: 'You can only view your own earnings.' });
  }
  next();
}

// Get user earnings ledger
router.get('/user/:userId', authenticate, ownEarnings, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const earnings = await db.queryMany(`SELECT * FROM user_earnings WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(earnings);
  } catch (error) {
    next(error);
  }
});

// Get user earnings summary
router.get('/summary/:userId', authenticate, ownEarnings, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await db.queryOne(`SELECT COALESCE(SUM(amount), 0.00) as total_earned FROM user_earnings WHERE user_id = $1`,
      [userId]
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /earnings/withdraw — ask for wallet money to be paid out to a UPI id.
 *
 * body: { amount, upiId }
 *
 * What this did:
 *   - it took the account to debit from the request body, so any signed-in
 *     user could empty any other user's wallet;
 *   - it compared the balance with the amount and then subtracted it, with no
 *     check that the amount was positive — a withdrawal of -5000 "passed" and
 *     added ₹5000 to the wallet;
 *   - it answered "Withdrawal request processed successfully" having paid
 *     nobody. There is no payout rail behind it. The money simply left the
 *     wallet.
 *
 * Now it is the caller's own wallet, a real amount, and a request: the money
 * is taken out of the wallet and recorded in payout_requests as 'pending', to
 * be paid to the UPI id and marked paid — or rejected and returned — by an
 * administrator (PUT /earnings/withdrawals/:id below).
 */
router.post('/withdraw', authenticate, async (req, res, next) => {
  try {
    const amount = Math.round(Number((req.body || {}).amount) * 100) / 100;
    const upiId = String((req.body || {}).upiId || '').trim();

    if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
      return res.status(400).json({ error: `The minimum withdrawal is ₹${MIN_WITHDRAWAL}.` });
    }
    if (!UPI_ID.test(upiId)) {
      return res.status(400).json({ error: 'Enter a valid UPI id, for example name@bank.' });
    }

    // A rider holding customers' cash owes the platform that much. Earnings
    // that would cover it stay in the wallet until it is deposited (or paid
    // off from them, POST /delivery/cash/settle) — otherwise a rider could
    // withdraw their pay and keep the cash as well.
    const agent = await db.queryOne('SELECT cash_in_hand FROM delivery_agents WHERE user_id = $1', [req.user.id]);
    const cashHeld = Math.round((Number(agent && agent.cash_in_hand) || 0) * 100) / 100;
    if (cashHeld > 0) {
      const wallet = await db.queryOne('SELECT balance FROM wallets WHERE user_id = $1', [req.user.id]);
      const withdrawable = Math.max(0, Math.round(((Number(wallet && wallet.balance) || 0) - cashHeld) * 100) / 100);
      if (amount > withdrawable) {
        return res.status(409).json({
          error: `You are holding ₹${cashHeld} in cash from deliveries. Deposit it first, or withdraw up to ₹${withdrawable}.`,
          code: 'CASH_TO_DEPOSIT',
          cashInHand: cashHeld,
          withdrawable,
        });
      }
    }

    const requestId = crypto.randomUUID();
    await db.withTransaction(async (client) => {
      await payments.debitWallet({ userId: req.user.id, amount, purpose: 'withdrawal', referenceId: requestId, client });
      await client.query(
        `INSERT INTO payout_requests (id, requested_by, amount, status, notes) VALUES ($1, $2, $3, 'pending', $4)`,
        [requestId, req.user.id, amount, `UPI: ${upiId}`]
      );
    });

    res.status(201).json({
      success: true,
      requestId,
      status: 'pending',
      message: `Withdrawal of ₹${amount} requested. It will be paid to ${upiId} once it has been reviewed.`,
    });
  } catch (error) {
    if (error instanceof payments.PaymentError) {
      const message = error.code === 'INSUFFICIENT_BALANCE' ? 'Insufficient balance' : error.message;
      return res.status(error.status === 402 ? 400 : error.status).json({ error: message, code: error.code });
    }
    next(error);
  }
});

// The caller's own withdrawal requests.
router.get('/withdrawals', authenticate, async (req, res, next) => {
  try {
    const mine = !isStaff(req) || req.query.mine === 'true';
    const rows = mine
      ? await db.queryMany('SELECT * FROM payout_requests WHERE requested_by = $1 AND shop_id IS NULL ORDER BY created_at DESC LIMIT 100', [req.user.id])
      : await db.queryMany(
        `SELECT p.*, u.full_name, u.phone_number FROM payout_requests p LEFT JOIN users u ON u.id = p.requested_by
          WHERE p.shop_id IS NULL ORDER BY CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END, p.created_at DESC LIMIT 200`
      );
    res.json({ success: true, withdrawals: rows });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /earnings/withdrawals/:id — an administrator settles a request.
 * body: { action: 'paid', upiReference } once the transfer has been made, or
 *       { action: 'rejected', reason }, which returns the money to the wallet.
 * A request is settled once: the status change is the gate.
 */
router.put('/withdrawals/:id', authenticate, async (req, res, next) => {
  try {
    if (!isStaff(req)) return res.status(403).json({ error: 'Admin access required' });
    const { action, upiReference, reason } = req.body || {};
    if (!['paid', 'rejected'].includes(action)) return res.status(400).json({ error: 'action must be paid or rejected' });
    if (action === 'paid' && !String(upiReference || '').trim()) {
      return res.status(400).json({ error: 'upiReference (the bank reference of the transfer) is required' });
    }

    const request = await db.queryOne('SELECT * FROM payout_requests WHERE id = $1 AND shop_id IS NULL', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Withdrawal request not found' });

    const settled = await db.withTransaction(async (client) => {
      const claimed = await client.query(
        `UPDATE payout_requests SET status = $1, upi_reference = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4 AND status = 'pending'`,
        [action, action === 'paid' ? String(upiReference).trim() : null,
          action === 'rejected' && reason ? `${request.notes || ''} | Rejected: ${String(reason).slice(0, 300)}` : request.notes,
          request.id]
      );
      if (!claimed.rowCount) return false;
      if (action === 'rejected') {
        await payments.creditWallet({ userId: request.requested_by, amount: request.amount, purpose: 'withdrawal_reversal', referenceId: request.id, client });
      }
      return true;
    });
    if (!settled) return res.status(409).json({ error: `This request is already ${request.status}.` });

    res.json({ success: true, status: action });
  } catch (error) {
    next(error);
  }
});

// Leaderboard
router.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const leaderboardData = await db.queryMany(`SELECT u.full_name as name, u.role, COALESCE(SUM(ue.amount), 0) as total_earned
       FROM users u
       JOIN user_earnings ue ON u.id = ue.user_id
       GROUP BY u.id, u.full_name, u.role
       ORDER BY total_earned DESC
       LIMIT 10`
    );
    const leaderboard = leaderboardData.map(l => ({
      name: `${l.name} (${l.role})`,
      points: Math.floor(l.total_earned / 100), // Simple points calculation
      amount: `â‚¹${parseFloat(l.total_earned).toLocaleString('en-IN')}`
    }));
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

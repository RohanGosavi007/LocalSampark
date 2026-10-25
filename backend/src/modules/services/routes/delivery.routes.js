const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const crypto = require('crypto');
const { queryOne, queryMany, withTransaction } = require('../../../config/database');
const payments = require('../../../services/payments.service');
const platformConfig = require('../../../services/platformConfig.service');
const { handoverCodeLimiter } = require('../../../middleware/rateLimit.middleware');

/**
 * The rider's side of delivery is for riders the platform has approved.
 *
 * These routes were `authenticate` only. The job list carries each customer's
 * name, phone number and address, and "accept" assigns the order to whoever
 * calls it — so any signed-in account could read every waiting customer's
 * details and take orders out of the pool with no intention, or ability, of
 * delivering them. Applying to be a rider (/onboarding) also made the account
 * a delivery agent on the spot, with the KYC still "pending".
 *
 * A rider is a delivery_agents row for the caller whose kyc_status an
 * administrator has set to active (Admin → Delivery → Approve).
 */
const APPROVED_RIDER = ['active', 'approved', 'verified'];

async function requireRider(req, res, next) {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'super_admin') return next();

    const agent = await queryOne('SELECT id, kyc_status FROM delivery_agents WHERE user_id = $1', [req.user.id]);
    if (!agent) {
      return res.status(403).json({ success: false, code: 'NOT_A_RIDER', error: 'Register as a delivery partner to see delivery jobs.' });
    }
    if (!APPROVED_RIDER.includes(String(agent.kyc_status || '').toLowerCase())) {
      return res.status(403).json({ success: false, code: 'RIDER_NOT_APPROVED', error: 'Your delivery partner application has not been approved yet.' });
    }
    req.rider = agent;
    return next();
  } catch (error) {
    return next(error);
  }
}

// What a delivery will cost — for a cart, or for a parcel. Public: it is a price list.
router.post('/quote', deliveryController.quoteDelivery);

// A customer sending a parcel.
router.post('/request', authenticate, deliveryController.requestDelivery);

// A rider's cash position: what they are holding, the limit, and the entries behind it.
router.get('/cash', authenticate, requireRider, async (req, res, next) => {
  try {
    const agent = await queryOne('SELECT cash_in_hand FROM delivery_agents WHERE user_id = $1', [req.user.id]);
    const ledger = await queryMany(
      'SELECT id, order_id, entry_type, amount, note, created_at FROM rider_cash_ledger WHERE rider_user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [String(req.user.id)]
    );
    const limit = await platformConfig.get('rider_cash_limit');
    const cashInHand = Number(agent && agent.cash_in_hand) || 0;
    const isBlocked = limit > 0 && cashInHand >= limit;
    res.json({ success: true, data: { cashInHand, limit, isBlocked, ledger } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /delivery/cash/settle { amount } — pay off cash in hand from wallet
 * earnings, instead of handing the cash in. The wallet debit and the reduction
 * in cash held are one transaction; neither can be more than the other allows.
 */
router.post('/cash/settle', authenticate, requireRider, async (req, res, next) => {
  try {
    const amount = Math.round(Number(req.body && req.body.amount) * 100) / 100;
    if (!(amount > 0)) return res.status(400).json({ success: false, error: 'amount must be more than zero' });

    const settled = await withTransaction(async (client) => {
      const reduced = await client.query(
        'UPDATE delivery_agents SET cash_in_hand = COALESCE(cash_in_hand, 0) - $1 WHERE user_id = $2 AND COALESCE(cash_in_hand, 0) >= $1',
        [amount, req.user.id]
      );
      if (!reduced.rowCount) return false;
      // Throws 402 if the wallet does not hold that much, undoing the line above.
      await payments.debitWallet({ userId: req.user.id, amount, purpose: 'cash_settlement', referenceId: String(req.user.id), client });
      await client.query(
        `INSERT INTO rider_cash_ledger (id, rider_user_id, entry_type, amount, recorded_by, note)
         VALUES ($1, $2, 'deposited', $3, $2, 'Settled from wallet earnings')`,
        [crypto.randomUUID(), String(req.user.id), amount]
      );
      return true;
    });

    if (!settled) return res.status(409).json({ success: false, error: 'That is more than the cash you are holding.' });
    const agent = await queryOne('SELECT cash_in_hand FROM delivery_agents WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, cashInHand: Number(agent && agent.cash_in_hand) || 0 });
  } catch (error) {
    if (error instanceof payments.PaymentError) {
      return res.status(error.status).json({ success: false, code: error.code, error: error.message });
    }
    next(error);
  }
});

router.get('/jobs', authenticate, requireRider, deliveryController.getJobs);
router.get('/my-jobs', authenticate, requireRider, deliveryController.getMyJobs);
router.post('/jobs/:jobId/accept', authenticate, requireRider, deliveryController.acceptJob);
router.post('/jobs/:jobId/status', authenticate, requireRider, deliveryController.updateJobStatus);
router.post('/jobs/:jobId/pickup', authenticate, requireRider, deliveryController.pickupJob);
router.post('/jobs/:jobId/reject', authenticate, requireRider, deliveryController.rejectJob);
// Completing a delivery: the rider quotes the customer's handover code.
// Limited per rider and job, because the code is four or six digits and the
// only thing between a rider and "delivered" (and the delivery fee) is
// guessing it.
router.post('/jobs/:jobId/complete', authenticate, requireRider, handoverCodeLimiter, deliveryController.completeJob);
// Anyone may apply; applying grants nothing until it is approved.
router.post('/onboarding', authenticate, deliveryController.onboarding);
router.get('/profile', authenticate, deliveryController.getProfile);
router.put('/duty', authenticate, requireRider, deliveryController.updateDutyStatus);
router.post('/location', authenticate, requireRider, deliveryController.updateLocation);
router.get('/analytics', authenticate, requireRider, deliveryController.getAnalytics);

// The same action under its older name. This path had its own handler, which
// checked that the code was four or six characters long and then marked the
// order delivered: it never compared the code with the one on the order, and
// never asked whether the caller was the rider — or a rider at all. Any
// signed-in account could mark any order on the platform delivered with
// "0000". It now runs completeJob, which checks both.
router.post('/jobs/:jobId/verify-otp', authenticate, requireRider, handoverCodeLimiter, deliveryController.completeJob);

module.exports = router;

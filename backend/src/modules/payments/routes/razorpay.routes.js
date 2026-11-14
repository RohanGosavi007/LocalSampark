const express = require('express');
const { validate } = require('../../../middleware/validate');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { paymentAttemptLimiter } = require('../../../middleware/rateLimit.middleware');
const razorpay = require('../../../services/razorpay.service');
const payments = require('../../../services/payments.service');

/**
 * Razorpay payments. Mounted at /payments/razorpay.
 *
 *   GET  /config   is online payment available, and the public key
 *   POST /order    start a payment for something the caller owns
 *   POST /verify   report the result Razorpay Checkout returned
 *
 * The webhook is separate (POST /webhooks/razorpay): Razorpay calls it, not
 * the browser, and it must be reachable without a session.
 *
 * The flow, for any client:
 *
 *   1. create the order the usual way (POST /shops/:id/orders, /checkout,
 *      /universal-orders) — it starts unpaid
 *   2. POST /payments/razorpay/order { purpose, referenceId }
 *   3. open Razorpay Checkout with the keyId, razorpayOrderId and amount returned
 *   4. POST /payments/razorpay/verify with the three values its handler receives
 *
 * A wallet top-up skips step 1 and sends { purpose: 'wallet_topup', amount }.
 */

/** Sends the response for an error from the payment services. */
function sendPaymentError(res, err, next) {
  if (err instanceof razorpay.PaymentsUnavailableError) {
    return res.status(503).json({
      success: false,
      code: err.code,
      error: 'Online payment is not available right now. Please choose another payment method.',
    });
  }
  if (err instanceof payments.PaymentError) {
    return res.status(err.status).json({ success: false, code: err.code, error: err.message });
  }
  return next(err);
}

// The key id is public: the browser needs it to open Checkout, and it
// identifies the merchant without authorising anything.
router.get('/config', (req, res) => {
  const enabled = razorpay.acceptingPayments();
  res.json({ success: true, enabled, keyId: enabled ? razorpay.keyId() : null, purposes: payments.PURPOSES });
});

async function createOrder(req, res, next) {
  try {
    const body = req.body || {};
    const payment = await payments.createPayment({
      user: req.user,
      purpose: body.purpose,
      referenceId: body.referenceId ?? body.reference_id ?? body.orderId ?? body.order_id,
      amount: body.amount,
    });
    res.status(201).json({ success: true, ...payment });
  } catch (err) {
    sendPaymentError(res, err, next);
  }
}

async function verify(req, res, next) {
  try {
    const body = req.body || {};
    // Razorpay's handler supplies snake_case; some of this app's clients
    // re-key to camelCase before posting. Both are read so that neither is a
    // silent 400.
    const outcome = await payments.confirmPayment({
      user: req.user,
      razorpayOrderId: body.razorpay_order_id || body.razorpayOrderId,
      razorpayPaymentId: body.razorpay_payment_id || body.razorpayPaymentId,
      signature: body.razorpay_signature || body.razorpaySignature,
    });
    res.json({
      success: true,
      message: outcome.alreadyPaid ? 'Payment was already confirmed' : 'Payment verified successfully',
      ...outcome,
    });
  } catch (err) {
    sendPaymentError(res, err, next);
  }
}

// The per-address limiter is on the mount (routes/index.js). Applying it again
// here, as this file first did, counted every request twice.
router.post('/order', authenticate, paymentAttemptLimiter, validate({
  // The server decides what is paid for and how much; these only have to be sane.
  purpose: { type: 'string', required: true, maxLength: 40 },
  referenceId: { type: 'string', maxLength: 100 },
  reference_id: { type: 'string', maxLength: 100 },
  orderId: { type: 'string', maxLength: 100 },
  order_id: { type: 'string', maxLength: 100 },
  amount: { type: 'number', min: 1, max: 1000000 },
}), createOrder);
router.post('/verify', authenticate, paymentAttemptLimiter, validate({
  razorpay_order_id: { type: 'string', maxLength: 200 },
  razorpay_payment_id: { type: 'string', maxLength: 200 },
  razorpay_signature: { type: 'string', maxLength: 200 },
  razorpayOrderId: { type: 'string', maxLength: 200 },
  razorpayPaymentId: { type: 'string', maxLength: 200 },
  razorpaySignature: { type: 'string', maxLength: 200 },
}), verify);

module.exports = router;
module.exports.createOrder = createOrder;
module.exports.verify = verify;
module.exports.sendPaymentError = sendPaymentError;
module.exports.paymentAttemptLimiter = paymentAttemptLimiter;

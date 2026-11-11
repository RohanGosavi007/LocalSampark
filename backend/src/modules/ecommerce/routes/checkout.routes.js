const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../../../middleware/auth.middleware');
const { orderPlacementLimiter } = require('../../../middleware/rateLimit.middleware');
const { enforceKillSwitch } = require('../../../middleware/godmode.middleware');
const { processCheckout, quoteCheckout } = require('../controllers/unified-superapp.controller');
const razorpayRoutes = require('../../payments/routes/razorpay.routes');
const { idempotent } = require('../../../middleware/idempotency.middleware');


// POST /checkout/quote — what a cart will cost. Prices are public, so no
// session is needed; nothing is written.
router.post('/quote', optionalAuth, quoteCheckout);

// POST /checkout — place an order. An order is always placed by someone, so
// this authenticates (it was optionalAuth, with the handler refusing an
// anonymous caller itself) and the limit is per account.
// C8: a retried checkout with the same Idempotency-Key gets the first answer.
router.post('/', authenticate, idempotent('checkout'), orderPlacementLimiter, enforceKillSwitch('kill_switch_deliveries', 'Checkout is temporarily disabled due to system maintenance (Deliveries Halted).'), processCheckout);

// Payments. Aliases of POST /payments/razorpay/order and /verify — see
// modules/payments/routes/razorpay.routes.js for the flow. These two paths
// used to run payments.controller.js with no authentication: the amount was
// whatever the client sent, and verification marked paid whichever order the
// request named. They now require a session and settle only the order the
// payment was created for.
// Limited separately from order placement: paying for one order is two
// requests, and a customer who retries a failed payment makes more.

router.post('/create-order', authenticate, razorpayRoutes.paymentAttemptLimiter, razorpayRoutes.createOrder);
router.post('/verify', authenticate, razorpayRoutes.paymentAttemptLimiter, razorpayRoutes.verify);

module.exports = router;

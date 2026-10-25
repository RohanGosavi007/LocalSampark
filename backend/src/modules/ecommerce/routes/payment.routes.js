const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const razorpayRoutes = require('../../payments/routes/razorpay.routes');
const { razorpayWebhook } = require('../../core/routes/webhooks.routes');

/**
 * /payments — older entry points, kept as aliases of the one Razorpay flow.
 *
 * The real routes are /payments/razorpay/{config,order,verify}
 * (modules/payments/routes/razorpay.routes.js) and POST /webhooks/razorpay.
 *
 * What used to be here:
 *
 *   POST /create-order   no authentication; summed a cart of prices sent by the
 *                        client and recorded that as the amount owed.
 *   POST /verify         no authentication; checked a Razorpay signature and
 *                        then marked paid whichever order_id the body named —
 *                        so one genuine payment could settle any order.
 *   POST /webhook/:provider
 *                        a second Razorpay webhook, with its own secret, that
 *                        wrote to shop_orders from a free-text note.
 *
 * Each now runs the same handler as its replacement, so an old client gets the
 * new rules rather than the old holes: the caller must be signed in, the amount
 * comes from the order, and a payment settles only the order it was created for.
 */

router.use('/razorpay', razorpayRoutes);

// Same handler, same secret, same settlement as POST /webhooks/razorpay.
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);

router.post('/create-order', authenticate, razorpayRoutes.paymentAttemptLimiter, razorpayRoutes.createOrder);
router.post('/verify', authenticate, razorpayRoutes.paymentAttemptLimiter, razorpayRoutes.verify);

module.exports = router;

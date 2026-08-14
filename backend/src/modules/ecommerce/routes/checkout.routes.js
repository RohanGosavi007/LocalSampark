const express = require('express');
const router = express.Router();
const { optionalAuth, authenticate } = require('../../../middleware/auth.middleware');
const { enforceKillSwitch } = require('../../../middleware/godmode.middleware');
const { processCheckout } = require('../controllers/unified-superapp.controller');
const { createCheckoutOrder, verifyPayment } = require('../controllers/payments.controller');
const rateLimit = require('express-rate-limit');

// Phase 56: Ecommerce Checkout Rate Limiter (Prevent Inventory Lockup & Spam)
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 checkout attempts per IP per window
  message: { success: false, error: 'Too many checkout attempts from this IP, please try again later.' }
});

// Decoupled Checkout Endpoint using Prisma-native controller
router.post('/', checkoutLimiter, optionalAuth, enforceKillSwitch('kill_switch_deliveries', 'Checkout is temporarily disabled due to system maintenance (Deliveries Halted).'), processCheckout);

// Phase 6 Payments API
router.post('/create-order', checkoutLimiter, createCheckoutOrder);
router.post('/verify', verifyPayment);

module.exports = router;

const express = require('express');
const router = express.Router();
const { optionalAuth, authenticate } = require('../../../middleware/auth.middleware');
const { enforceKillSwitch } = require('../../../middleware/godmode.middleware');
const { processCheckout } = require('../controllers/unified-superapp.controller');
const { createCheckoutOrder, verifyPayment } = require('../controllers/payments.controller');

// Decoupled Checkout Endpoint using Prisma-native controller
router.post('/', optionalAuth, enforceKillSwitch('kill_switch_deliveries', 'Checkout is temporarily disabled due to system maintenance (Deliveries Halted).'), processCheckout);

// Phase 6 Payments API
router.post('/create-order', createCheckoutOrder);
router.post('/verify', verifyPayment);

module.exports = router;

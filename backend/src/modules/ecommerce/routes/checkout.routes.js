const express = require('express');
const router = express.Router();
const { optionalAuth, authenticate } = require('../../../middleware/auth.middleware');
const { processCheckout } = require('../controllers/unified-superapp.controller');

// Decoupled Checkout Endpoint using Prisma-native controller
router.post('/', optionalAuth, processCheckout);

module.exports = router;

const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

/**
 * Every route here was registered unauthenticated, each carrying the comment
 * "add authenticate in production". They were never guarded, and the controller
 * resolves the acting user as `req.user?.id || 1` — so with no middleware to
 * populate req.user, every anonymous caller operated on user id 1.
 *
 * That is both an authorisation hole (redeem is a balance-moving action) and a
 * correctness bug: one real account absorbed every anonymous spin and redeem.
 */

// GET user loyalty balance and transaction history
router.get('/balance', authenticate, loyaltyController.getLoyaltyBalance);

// POST spin the fortune wheel
router.post('/spin', authenticate, loyaltyController.spinFortuneWheel);

// POST redeem coins for wallet balance
router.post('/redeem', authenticate, loyaltyController.redeemCoins);

module.exports = router;

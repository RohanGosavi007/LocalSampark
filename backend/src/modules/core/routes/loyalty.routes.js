const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
// const { authenticate } = require('../../../middleware/auth.middleware');

// GET user loyalty balance and transaction history
router.get('/balance', loyaltyController.getLoyaltyBalance); // add authenticate in production

// POST spin the fortune wheel
router.post('/spin', loyaltyController.spinFortuneWheel); // add authenticate in production

// POST redeem coins for wallet balance
router.post('/redeem', loyaltyController.redeemCoins); // add authenticate in production

module.exports = router;

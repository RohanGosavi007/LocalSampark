const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const returnController = require('../controllers/return.controller');

// Multi-tier verification queue (Admin, Territory Admin, Franchise Owner)
router.get('/pending-review', authenticate, returnController.getPendingReturns);
router.put('/:returnId/verify', authenticate, returnController.verifyReturn);

// Customer return submission
router.post('/:id', authenticate, returnController.submitReturn);

module.exports = router;

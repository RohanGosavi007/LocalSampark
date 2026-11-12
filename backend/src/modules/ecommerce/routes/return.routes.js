const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const returnController = require('../controllers/return.controller');

// The review queue: every shop for an administrator, their own shop for a seller (C10).
router.get('/pending-review', authenticate, returnController.getPendingReturns);
// The customer's own returns (C10).
router.get('/mine', authenticate, returnController.getMyReturns);
router.put('/:returnId/verify', authenticate, returnController.verifyReturn);

// Customer return submission
router.post('/:id', authenticate, returnController.submitReturn);

module.exports = router;

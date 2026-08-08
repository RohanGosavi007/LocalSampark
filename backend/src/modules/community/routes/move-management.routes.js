const express = require('express');
const router = express.Router();
const controller = require('../controllers/move-management.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

router.use(authenticate);

// Move Passes
router.post('/pass', controller.requestMovePass);
router.get('/pass', controller.getMovePasses);
router.post('/pass/approve', controller.adminApproveMovePass); // Needs admin check

// Police Verification
router.post('/police-verification', controller.initiatePoliceVerification);

module.exports = router;

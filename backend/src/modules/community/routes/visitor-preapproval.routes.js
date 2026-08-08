const express = require('express');
const router = express.Router();
const controller = require('../controllers/visitor-preapproval.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

router.use(authenticate);

// Pre-approvals
router.post('/pre-approve', controller.createPreApproval);
router.get('/pre-approve/my', controller.listMyPreApprovals);
router.get('/pre-approve/share/:id', controller.sharePasscode);
router.delete('/pre-approve/:id', controller.revokePreApproval);
router.put('/pre-approve/leave-at-gate', controller.toggleLeaveAtGate);

// Guard Verification
router.post('/pre-approve/verify', controller.verifyPasscode);
router.post('/cab-pass/verify', controller.verifyCabPass);

// Cab Passes
router.post('/cab-pass', controller.createCabPass);

// Blacklist (Requires Admin or Guard role realistically)
router.post('/blacklist', controller.blacklistVisitor);
router.get('/blacklist', controller.getBlacklist);

module.exports = router;

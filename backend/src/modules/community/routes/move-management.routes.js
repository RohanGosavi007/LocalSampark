const express = require('express');
const router = express.Router();
const controller = require('../controllers/move-management.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, requireMembership, societyOfRow, pinOwnFlat, CAPABILITIES } = require('../middleware/society-capability');

// Who may do what, per society (see middleware/society-capability.js):
const member = requireMembership();                                   // any active member
const resident = requireCapability(CAPABILITIES.APPROVE_VISITOR);     // residents and the office — not the gate
const desk = requireCapability(CAPABILITIES.LOG_GATE_ENTRY);          // the guard on duty, or the office covering
const office = requireCapability(CAPABILITIES.MANAGE_SOCIETY);        // committee / society admin

router.use(authenticate);

// Move Passes
router.post('/pass', resident, pinOwnFlat, controller.requestMovePass);
router.get('/pass', controller.getMovePasses);
// Was marked "Needs admin check" and had none: anyone could approve any move
// pass, which is what lets a removal van through the gate.
router.post('/pass/approve', requireCapability(CAPABILITIES.MANAGE_SOCIETY, societyOfRow('move_passes', (req) => req.body && req.body.passId)), controller.adminApproveMovePass);

// Police Verification
router.post('/police-verification', resident, pinOwnFlat, controller.initiatePoliceVerification);

module.exports = router;

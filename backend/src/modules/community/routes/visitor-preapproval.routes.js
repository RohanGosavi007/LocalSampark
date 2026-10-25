const express = require('express');
const router = express.Router();
const controller = require('../controllers/visitor-preapproval.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, requireMembership, societyOfRow, pinOwnFlat, CAPABILITIES } = require('../middleware/society-capability');

// Who may do what, per society (see middleware/society-capability.js):
const member = requireMembership();                                   // any active member
const resident = requireCapability(CAPABILITIES.APPROVE_VISITOR);     // residents and the office — not the gate
const desk = requireCapability(CAPABILITIES.LOG_GATE_ENTRY);          // the guard on duty, or the office covering
const office = requireCapability(CAPABILITIES.MANAGE_SOCIETY);        // committee / society admin

/*
 * A pre-approval is a passcode the gate admits a stranger on. Creating one
 * took the society and the flat from the request: any signed-in account could
 * issue a working gate code for any flat in any society. Verifying one — which
 * uses it up and shows who it was for — was open to everyone too, as was the
 * blacklist.
 */
router.use(authenticate);

// Resident routes: for the caller's own flat, in a society they live in.
router.post('/pre-approve', resident, pinOwnFlat, controller.createPreApproval);
router.get('/pre-approve/my', controller.listMyPreApprovals);
// These three look the pre-approval up by id AND by the calling resident.
router.get('/pre-approve/share/:id', controller.sharePasscode);
router.delete('/pre-approve/:id', controller.revokePreApproval);
router.put('/pre-approve/leave-at-gate', controller.toggleLeaveAtGate);

// Guard routes
router.post('/pre-approve/verify', desk, controller.verifyPasscode);
router.post('/cab-pass/verify', desk, controller.verifyCabPass);

// Cab passes
router.post('/cab-pass', resident, pinOwnFlat, controller.createCabPass);

// Blacklist
router.post('/blacklist', office, controller.blacklistVisitor);
router.get('/blacklist', desk, controller.getBlacklist);

module.exports = router;

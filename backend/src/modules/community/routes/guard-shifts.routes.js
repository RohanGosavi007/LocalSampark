const express = require('express');
const router = express.Router();
const controller = require('../controllers/guard-shift.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, requireMembership, societyOfRow, pinOwnFlat, CAPABILITIES } = require('../middleware/society-capability');

// Who may do what, per society (see middleware/society-capability.js):
const member = requireMembership();                                   // any active member
const resident = requireCapability(CAPABILITIES.APPROVE_VISITOR);     // residents and the office — not the gate
const desk = requireCapability(CAPABILITIES.LOG_GATE_ENTRY);          // the guard on duty, or the office covering
const office = requireCapability(CAPABILITIES.MANAGE_SOCIETY);        // committee / society admin

/*
 * The controller reads the society from req.societyId, which only a guard in
 * front of it sets. This router had none, so creating a shift and reading the
 * roster always answered "no society" — and attendance, which looks the shift
 * up by id, let anyone clock any guard in or out.
 */
router.use(authenticate);

router.post('/', office, controller.createShift);
router.get('/roster', desk, controller.getRoster);
// The guard whose shift it is, or the office: checked in the handler, which
// has the shift.
router.post('/attendance', requireMembership(societyOfRow('society_guard_shifts', (req) => req.body && req.body.shiftId)), controller.markShiftAttendance);

module.exports = router;

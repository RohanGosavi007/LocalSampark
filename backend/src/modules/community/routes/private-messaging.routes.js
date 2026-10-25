const express = require('express');
const router = express.Router();
const controller = require('../controllers/private-messaging.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, requireMembership, societyOfRow, pinOwnFlat, CAPABILITIES } = require('../middleware/society-capability');

// Who may do what, per society (see middleware/society-capability.js):
const member = requireMembership();                                   // any active member
const resident = requireCapability(CAPABILITIES.APPROVE_VISITOR);     // residents and the office — not the gate
const desk = requireCapability(CAPABILITIES.LOG_GATE_ENTRY);          // the guard on duty, or the office covering
const office = requireCapability(CAPABILITIES.MANAGE_SOCIETY);        // committee / society admin

// Messages between members of one society. The society came from the request
// unchecked, so the "society" messenger delivered to any user on the platform.
router.use(authenticate);

router.post('/', member, controller.sendMessage);
router.get('/conversations', member, controller.getConversations);
router.get('/messages', member, controller.getMessages);
// Marks the caller's own incoming messages; scoped by the caller in the handler.
router.post('/read', controller.markRead);

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('../controllers/community-forum.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, requireMembership, societyOfRow, pinOwnFlat, CAPABILITIES } = require('../middleware/society-capability');

// Who may do what, per society (see middleware/society-capability.js):
const member = requireMembership();                                   // any active member
const resident = requireCapability(CAPABILITIES.APPROVE_VISITOR);     // residents and the office — not the gate
const desk = requireCapability(CAPABILITIES.LOG_GATE_ENTRY);          // the guard on duty, or the office covering
const office = requireCapability(CAPABILITIES.MANAGE_SOCIETY);        // committee / society admin

const topic = societyOfRow('society_forum_topics', (req) => req.body && req.body.topicId);

/*
 * A society's forum is for its members. Posting and reading took the society
 * from the request with no membership check, and pin / lock — marked "Admin
 * only in real impl" — were open to every signed-in account, for any topic in
 * any society.
 */
router.use(authenticate);

router.post('/topic', member, controller.createTopic);
router.get('/topic', member, controller.getTopics);
router.post('/reply', requireMembership(topic), controller.replyToTopic);
router.post('/topic/pin', requireCapability(CAPABILITIES.MANAGE_SOCIETY, topic), controller.pinTopic);
router.post('/topic/lock', requireCapability(CAPABILITIES.MANAGE_SOCIETY, topic), controller.lockTopic);

module.exports = router;

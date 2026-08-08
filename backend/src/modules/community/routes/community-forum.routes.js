const express = require('express');
const router = express.Router();
const controller = require('../controllers/community-forum.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

router.use(authenticate);

router.post('/topic', controller.createTopic);
router.get('/topic', controller.getTopics);
router.post('/reply', controller.replyToTopic);
router.post('/topic/pin', controller.pinTopic); // Admin only in real impl
router.post('/topic/lock', controller.lockTopic); // Admin only in real impl

module.exports = router;

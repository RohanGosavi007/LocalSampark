const express = require('express');
const router = express.Router();
const controller = require('../../../../controllers/private-messaging.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');

router.use(authenticate);

router.post('/', controller.sendMessage);
router.get('/conversations', controller.getConversations);
router.get('/messages', controller.getMessages);
router.post('/read', controller.markRead);

module.exports = router;

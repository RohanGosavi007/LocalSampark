const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middleware/auth.middleware');
const chatbotController = require('../../../../controllers/chatbot.controller');

// Handle chat messages (both AI and non-AI fallback)
// Removed 'authenticate' middleware because visitors (unauthenticated) should also be able to chat
router.post('/message', authenticate, chatbotController.handleChatMessage);

module.exports = router;

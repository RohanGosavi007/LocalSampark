const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agents.controller');

// Logistics Agents Tracking
router.get('/', agentsController.getAgents);

module.exports = router;

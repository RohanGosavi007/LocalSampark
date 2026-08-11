const express = require('express');
const router = express.Router();
const { logVisitor, updateVisitorStatus } = require('../controllers/society-visitor.controller');

// Gatekeeper / Resident Visitor APIs
router.post('/visitors', logVisitor);
router.put('/visitors/status', updateVisitorStatus);

module.exports = router;

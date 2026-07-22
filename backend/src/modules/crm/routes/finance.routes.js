const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance.controller');
const { authenticate, requireAdmin, requireRole } = require('../../../middleware/auth.middleware');

// Generate financial export (CSV or JSON stats)
// Accessible only by superadmin
router.get('/export', authenticate, requireAdmin, requireRole('admin', 'superadmin'), financeController.exportFinancials);

module.exports = router;

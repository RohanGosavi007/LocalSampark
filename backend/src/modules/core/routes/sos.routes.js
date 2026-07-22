const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sos.controller');
const { authenticate, requireRole, requireAdmin } = require('../../../middleware/auth.middleware');

// Trigger an SOS Alert
router.post('/trigger', authenticate, sosController.triggerSOS);

// Add an emergency contact
router.post('/contacts', authenticate, sosController.addContact);

// Admin Routes for SOS
router.get('/active', authenticate, requireAdmin, requireRole('admin', 'superadmin', 'territory_admin', 'area_agent'), sosController.getActiveSOS);
router.post('/:id/resolve', authenticate, requireAdmin, requireRole('admin', 'superadmin', 'territory_admin', 'area_agent'), sosController.resolveSOS);

module.exports = router;

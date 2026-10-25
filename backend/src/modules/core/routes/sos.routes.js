const express = require('express');
const { validate } = require('../../../middleware/validate');
const router = express.Router();
const sosController = require('../controllers/sos.controller');
const { authenticate, requireRole, requireAdmin } = require('../../../middleware/auth.middleware');

// Trigger an SOS Alert
router.post('/trigger', authenticate, validate({
  type: { type: 'string', maxLength: 30 },
  // A position, or nothing: a latitude of 9999 used to be stored and plotted.
  latitude: { type: 'number', min: -90, max: 90, nullable: true },
  longitude: { type: 'number', min: -180, max: 180, nullable: true },
  pincode: { type: 'string', maxLength: 10 },
}), sosController.triggerSOS);

// Add an emergency contact
router.post('/contacts', authenticate, sosController.addContact);

// Admin Routes for SOS
router.get('/active', authenticate, requireAdmin, requireRole('admin', 'super_admin', 'superadmin', 'territory_admin', 'area_agent'), sosController.getActiveSOS);
router.get('/alerts', authenticate, requireAdmin, sosController.getActiveSOS);
router.post('/:id/resolve', authenticate, requireAdmin, requireRole('admin', 'super_admin', 'superadmin', 'territory_admin', 'area_agent'), sosController.resolveSOS);

module.exports = router;

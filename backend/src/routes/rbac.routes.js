const express = require('express');
const router = express.Router();
// const rbacController = require('../controllers/rbac.controller');

// Mock data for RBAC
const mockRoles = [
  'visitor', 'resident', 'resident_member', 'society_admin',
  'security_guard', 'shop_owner', 'service_provider', 'delivery_agent',
  'field_agent', 'area_agent', 'territory_admin', 'moderator', 'super_admin'
];

router.get('/roles', (req, res) => {
  res.json({ success: true, data: mockRoles });
});

router.post('/assign', (req, res) => {
  // Admin assigns role
  const { userId, role } = req.body;
  res.json({ success: true, message: `Role ${role} assigned successfully` });
});

router.post('/request', (req, res) => {
  // User requests upgrade
  res.json({ success: true, message: 'Role request submitted' });
});

router.get('/requests', (req, res) => {
  res.json({ success: true, data: [] });
});

router.put('/requests/:id', (req, res) => {
  res.json({ success: true, message: 'Request updated' });
});

router.post('/override', (req, res) => {
  res.json({ success: true, message: 'Permission overridden' });
});

router.get('/user/:id/permissions', (req, res) => {
  res.json({ success: true, data: { modules: ['feed', 'marketplace', 'carpool'] } });
});

module.exports = router;

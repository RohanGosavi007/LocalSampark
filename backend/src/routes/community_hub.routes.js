const express = require('express');
const router = express.Router();
const communityHubController = require('../controllers/community_hub.controller');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth.middleware');

// Lost & Found
router.post('/lost/post', authenticate, communityHubController.postLostItem);
router.get('/lost/active', authenticate, communityHubController.getLostItems);
router.post('/lost/:alertId/resolve', authenticate, communityHubController.resolveLostItem);

// Garage Sale
router.post('/garage/post', authenticate, communityHubController.postGarageItem);
router.get('/garage/items', authenticate, communityHubController.getGarageItems);
router.post('/garage/:itemId/buy', authenticate, communityHubController.buyGarageItem);

// Admin
router.get('/garage/admin/mode', communityHubController.getWeekendMode);
router.post('/garage/admin/mode', authenticate, requireAdmin, requireRole('admin'), communityHubController.toggleWeekendMode);

module.exports = router;

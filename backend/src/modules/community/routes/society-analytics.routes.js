const express = require('express');
const router = express.Router();
const controller = require('../controllers/society-analytics.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, CAPABILITIES } = require('../middleware/society-capability');

router.use(authenticate);

router.get('/dashboard', requireCapability(CAPABILITIES.MANAGE_SOCIETY), controller.getDashboardOverview);

module.exports = router;
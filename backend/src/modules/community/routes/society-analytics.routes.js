const express = require('express');
const router = express.Router();
const controller = require('../controllers/society-analytics.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireSocietyPermission } = require('../middleware/society-rbac.middleware');

router.use(authenticate);

router.get('/dashboard', requireSocietyPermission('all'), controller.getDashboardOverview);

module.exports = router;
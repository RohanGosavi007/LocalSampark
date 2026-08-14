const express = require('express');
const router = express.Router();
const controller = require('../controllers/integration.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireSocietyPermission } = require('../middleware/society-rbac.middleware');

router.use(authenticate);

router.get('/tally/xml', requireSocietyPermission('finance'), controller.exportTallyXML);
router.get('/export/visitors', requireSocietyPermission('members'), controller.exportVisitorsCSV);
router.get('/export/bills', requireSocietyPermission('finance'), controller.exportBillsCSV);

module.exports = router;

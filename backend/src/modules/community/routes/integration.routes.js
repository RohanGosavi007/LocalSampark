const express = require('express');
const router = express.Router();
const controller = require('../controllers/integration.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, CAPABILITIES } = require('../middleware/society-capability');

router.use(authenticate);

router.get('/tally/xml', requireCapability(CAPABILITIES.MANAGE_SOCIETY), controller.exportTallyXML);
router.get('/export/visitors', requireCapability(CAPABILITIES.MANAGE_SOCIETY), controller.exportVisitorsCSV);
router.get('/export/bills', requireCapability(CAPABILITIES.MANAGE_SOCIETY), controller.exportBillsCSV);

module.exports = router;

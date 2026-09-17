const express = require('express');
const router = express.Router();
const agmController = require('../controllers/agm-management.controller');
const budgetController = require('../controllers/society-budget.controller');
const auditController = require('../controllers/facility-audit.controller');
const docController = require('../controllers/document-template.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, CAPABILITIES } = require('../middleware/society-capability');

router.use(authenticate);

// AGM
router.post('/agm', requireCapability(CAPABILITIES.MANAGE_SOCIETY), agmController.createAGM);
router.get('/agm', agmController.getAGMs);
router.post('/agm/resolution', requireCapability(CAPABILITIES.MANAGE_SOCIETY), agmController.addAGMResolution);
router.get('/agm/:agmId/resolutions', agmController.getAGMResolutions);

// Budget
router.post('/budget', requireCapability(CAPABILITIES.MANAGE_SOCIETY), budgetController.createBudget);
router.get('/budget', requireCapability(CAPABILITIES.MANAGE_SOCIETY), budgetController.getBudgets);
router.post('/budget/expense', requireCapability(CAPABILITIES.MANAGE_SOCIETY), budgetController.recordExpense);

// Audits
router.post('/audit', requireCapability(CAPABILITIES.MANAGE_SOCIETY), auditController.scheduleAudit);
router.get('/audit', requireCapability(CAPABILITIES.MANAGE_SOCIETY), auditController.getAudits);
router.post('/audit/complete', requireCapability(CAPABILITIES.MANAGE_SOCIETY), auditController.completeAudit);

// Documents
router.get('/docs/noc', docController.generateNOC);

module.exports = router;

const express = require('express');
const router = express.Router();
const agmController = require('../controllers/agm-management.controller');
const budgetController = require('../controllers/society-budget.controller');
const auditController = require('../controllers/facility-audit.controller');
const docController = require('../controllers/document-template.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireSocietyPermission } = require('../middleware/society-rbac.middleware');

router.use(authenticate);

// AGM
router.post('/agm', requireSocietyPermission('members'), agmController.createAGM);
router.get('/agm', agmController.getAGMs);
router.post('/agm/resolution', requireSocietyPermission('members'), agmController.addAGMResolution);
router.get('/agm/:agmId/resolutions', agmController.getAGMResolutions);

// Budget
router.post('/budget', requireSocietyPermission('finance'), budgetController.createBudget);
router.get('/budget', requireSocietyPermission('finance'), budgetController.getBudgets);
router.post('/budget/expense', requireSocietyPermission('finance'), budgetController.recordExpense);

// Audits
router.post('/audit', requireSocietyPermission('assets'), auditController.scheduleAudit);
router.get('/audit', requireSocietyPermission('assets'), auditController.getAudits);
router.post('/audit/complete', requireSocietyPermission('assets'), auditController.completeAudit);

// Documents
router.get('/docs/noc', docController.generateNOC);

module.exports = router;

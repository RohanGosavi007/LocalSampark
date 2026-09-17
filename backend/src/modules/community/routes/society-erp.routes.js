const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, CAPABILITIES } = require('../middleware/society-capability');

const vendorController = require('../controllers/vendor-management.controller');
const payrollController = require('../controllers/staff-payroll.controller');
const assetController = require('../controllers/asset-registry.controller');

router.use(authenticate);

// Vendors
router.post('/vendor', requireCapability(CAPABILITIES.MANAGE_SOCIETY), vendorController.createVendor);
router.get('/vendor', requireCapability(CAPABILITIES.MANAGE_SOCIETY), vendorController.listVendors);
router.post('/vendor/invoice', requireCapability(CAPABILITIES.MANAGE_SOCIETY), vendorController.createVendorInvoice);
router.post('/vendor/pay', requireCapability(CAPABILITIES.MANAGE_SOCIETY), vendorController.payVendorInvoice);

// Payroll
router.post('/payroll/generate', requireCapability(CAPABILITIES.MANAGE_SOCIETY), payrollController.generateMonthlyPayroll);
router.get('/payroll/summary', requireCapability(CAPABILITIES.MANAGE_SOCIETY), payrollController.getPayrollSummary);

// Assets
router.post('/asset', requireCapability(CAPABILITIES.MANAGE_SOCIETY), assetController.registerAsset);
router.post('/asset/maintenance', requireCapability(CAPABILITIES.MANAGE_SOCIETY), assetController.logMaintenance);
router.get('/asset', requireCapability(CAPABILITIES.MANAGE_SOCIETY), assetController.getAssets);

module.exports = router;

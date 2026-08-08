const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../../middleware/auth.middleware');
const { requireSocietyPermission } = require('../../../../middleware/society-rbac.middleware');

const vendorController = require('../../../../controllers/vendor-management.controller');
const payrollController = require('../../../../controllers/staff-payroll.controller');
const assetController = require('../../../../controllers/asset-registry.controller');

router.use(authenticate);

// Vendors
router.post('/vendor', requireSocietyPermission('vendors'), vendorController.createVendor);
router.get('/vendor', requireSocietyPermission('vendors'), vendorController.listVendors);
router.post('/vendor/invoice', requireSocietyPermission('vendors'), vendorController.createVendorInvoice);
router.post('/vendor/pay', requireSocietyPermission('finance'), vendorController.payVendorInvoice);

// Payroll
router.post('/payroll/generate', requireSocietyPermission('finance'), payrollController.generateMonthlyPayroll);
router.get('/payroll/summary', requireSocietyPermission('finance'), payrollController.getPayrollSummary);

// Assets
router.post('/asset', requireSocietyPermission('assets'), assetController.registerAsset);
router.post('/asset/maintenance', requireSocietyPermission('assets'), assetController.logMaintenance);
router.get('/asset', requireSocietyPermission('assets'), assetController.getAssets);

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('../controllers/billing-engine.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

router.use(authenticate);

// Admin / Treasurer routes
router.post('/generate', controller.generateBills);
router.post('/payment', controller.recordPayment);

// Resident routes
router.get('/my-bills', controller.getMyBills);
router.get('/bill/:id', controller.getBillDetails);

// Tally Integration
router.post('/tally/sync', controller.syncToTally);
router.get('/tally/export-csv', controller.exportTallyCSV);

module.exports = router;

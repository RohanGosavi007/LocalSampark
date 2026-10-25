const express = require('express');
const router = express.Router();
const controller = require('../controllers/billing-engine.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, requireMembership, societyOfRow, pinOwnFlat, CAPABILITIES } = require('../middleware/society-capability');

// Who may do what, per society (see middleware/society-capability.js):
const member = requireMembership();                                   // any active member
const resident = requireCapability(CAPABILITIES.APPROVE_VISITOR);     // residents and the office — not the gate
const desk = requireCapability(CAPABILITIES.LOG_GATE_ENTRY);          // the guard on duty, or the office covering
const office = requireCapability(CAPABILITIES.MANAGE_SOCIETY);        // committee / society admin

const bill = (idOf) => societyOfRow('society_maintenance_bills', idOf);

/*
 * This router was `authenticate` and nothing else. Any signed-in account could
 * generate a month of bills for any society, record a payment of any amount
 * against any bill ("In reality, this requires Admin/Treasurer role", said the
 * handler), read any flat's bill, and export any society's accounts.
 */
router.use(authenticate);

// Admin routes
router.post('/generate', office, controller.generateBills);
// Recording a payment by hand is the treasurer's entry in the books.
router.post('/payment', requireCapability(CAPABILITIES.MANAGE_SOCIETY, bill((req) => req.body && req.body.billId)), controller.recordPayment);

// Resident routes
router.get('/my-bills', controller.getMyBills);
// A member of the bill's society; the handler narrows a resident to their own flat.
router.get('/bill/:id', requireMembership(bill((req) => req.params.id)), controller.getBillDetails);

// Tally integration
router.post('/tally/sync', requireCapability(CAPABILITIES.MANAGE_SOCIETY, bill((req) => req.body && req.body.billId)), controller.syncToTally);
router.get('/tally/export-csv', office, controller.exportTallyCSV);

module.exports = router;

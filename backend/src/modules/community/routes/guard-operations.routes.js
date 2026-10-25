const express = require('express');
const router = express.Router();
const controller = require('../controllers/guard-operations.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, requireMembership, societyOfRow, pinOwnFlat, CAPABILITIES } = require('../middleware/society-capability');

// Who may do what, per society (see middleware/society-capability.js):
const member = requireMembership();                                   // any active member
const resident = requireCapability(CAPABILITIES.APPROVE_VISITOR);     // residents and the office — not the gate
const desk = requireCapability(CAPABILITIES.LOG_GATE_ENTRY);          // the guard on duty, or the office covering
const office = requireCapability(CAPABILITIES.MANAGE_SOCIETY);        // committee / society admin

/*
 * The comment here read "Assume middleware checks for Guard role implicitly in
 * actual implementations". Nothing did: any signed-in account could log
 * vehicles into any society's gate register, ring any resident's intercom,
 * configure gates and read the vehicle log.
 */
router.use(authenticate);

// Guard Patrol
router.get('/patrol/routes', desk, controller.getPatrolRoutes);
router.post('/patrol/start', desk, controller.startPatrol);
// These two find the patrol log by id AND by the calling guard, in the handler.
router.post('/patrol/scan', controller.scanCheckpoint);
router.post('/patrol/end', controller.endPatrol);

// Gate Operations
router.post('/vehicle', desk, controller.logVehicle);
router.post('/utility', desk, controller.logUtilityDelivery);
// A resident rating a guard or a service in their own society.
router.post('/rate', member, controller.rateTarget);
router.post('/intercom/call', desk, controller.triggerIntercom);

// Multi-gate management
const gateController = require('../controllers/gate-management.controller');
router.post('/gate/configure', office, gateController.configureGate);
router.post('/gate/assign', requireCapability(CAPABILITIES.MANAGE_SOCIETY, societyOfRow('society_gates', (req) => req.body && req.body.gateId)), gateController.assignGuardToGate);
router.get('/gate/lookup-vehicle', desk, gateController.lookupVehicle);
router.get('/gate/vehicle-log', desk, gateController.getVehicleLog);
router.get('/gate/utility-history', desk, gateController.getUtilityHistory);
router.get('/gate/dashboard', desk, gateController.getGateDashboard);

module.exports = router;

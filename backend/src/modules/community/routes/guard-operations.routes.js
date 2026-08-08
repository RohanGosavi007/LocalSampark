const express = require('express');
const router = express.Router();
const controller = require('../../../../controllers/guard-operations.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');

router.use(authenticate); // Note: Assume middleware checks for Guard role implicitly in actual implementations

// Patrols
router.get('/patrol/routes', controller.getPatrolRoutes);
router.post('/patrol/start', controller.startPatrol);
router.post('/patrol/scan', controller.scanCheckpoint);
router.post('/patrol/end', controller.endPatrol);

// Vehicle & Utility Logs
router.post('/vehicle', controller.logVehicle);
router.post('/utility', controller.logUtilityDelivery);
router.post('/rate', controller.rateTarget);
router.post('/intercom/call', controller.triggerIntercom);

// Gate Management (Missing from Phase 4 earlier)
const gateController = require('../../../../controllers/gate-management.controller');
router.post('/gate/configure', gateController.configureGate);
router.post('/gate/assign', gateController.assignGuardToGate);
router.get('/gate/lookup-vehicle', gateController.lookupVehicle);
router.get('/gate/vehicle-log', gateController.getVehicleLog);
router.get('/gate/utility-history', gateController.getUtilityHistory);
router.get('/gate/dashboard', gateController.getGateDashboard);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const controller = require('../controllers/society-visitor.controller');

// Every handler reads req.user to scope the query to the guard's society, so
// the whole router is authenticated. It previously was not, which both leaked
// the gate log and crashed on req.user.id for anonymous callers.
router.use(authenticate);

// ─── Visitors ───────────────────────────────────────────────
router.get('/visitors/today', controller.getTodayVisitors);
router.post('/visitors', controller.logVisitor);
router.put('/visitors/status', controller.updateVisitorStatus);
router.put('/visitors/:id/check-out', controller.checkOutVisitor);

// ─── Packages ───────────────────────────────────────────────
router.get('/packages/pending', controller.getPendingPackages);
router.post('/packages', controller.logPackage);

// ─── Staff attendance ───────────────────────────────────────
router.get('/staff/attendance/today', controller.getTodayStaffAttendance);

// ─── Emergency ──────────────────────────────────────────────
router.post('/emergency', controller.raiseEmergency);

module.exports = router;

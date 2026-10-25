const express = require('express');
const router = express.Router();
const controller = require('../controllers/society-visitor.controller');
const rc = require('../controllers/society-resident.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, requireMembership, societyOfRow, pinOwnFlat, CAPABILITIES } = require('../middleware/society-capability');

// Who may do what, per society (see middleware/society-capability.js):
const member = requireMembership();                                   // any active member
const resident = requireCapability(CAPABILITIES.APPROVE_VISITOR);     // residents and the office — not the gate
const desk = requireCapability(CAPABILITIES.LOG_GATE_ENTRY);          // the guard on duty, or the office covering
const office = requireCapability(CAPABILITIES.MANAGE_SOCIETY);        // committee / society admin

// The gate register. Every handler is scoped to a society; these guards decide
// whose. It was authenticated only, so any member — or, for a society named in
// a token, anyone — could write gate entries and read the day's visitors.
router.use(authenticate);

// ─── Visitors ───────────────────────────────────────────────
router.get('/visitors/today', desk, controller.getTodayVisitors);
router.post('/visitors', desk, controller.logVisitor);
// Approving is the resident's (for their flat) or the office's; the handler
// decides which capability the requested status needs.
router.put('/visitors/status', member, controller.updateVisitorStatus);
router.put('/visitors/:id/check-out', desk, controller.checkOutVisitor);

// ─── Packages ───────────────────────────────────────────────
router.get('/packages/pending', desk, controller.getPendingPackages);
router.post('/packages', desk, controller.logPackage);

// ─── Staff attendance ───────────────────────────────────────
router.get('/staff/attendance/today', desk, controller.getTodayStaffAttendance);

// ─── Emergency ──────────────────────────────────────────────
router.post('/emergency', member, controller.raiseEmergency);

// ─── Resident & office surface ──────────────────────────────
// What the web society page and the mobile society tabs call. Until this
// block existed every one of these answered 404.
router.get('/context', member, rc.getContext);

router.get('/my-visitors', member, rc.getMyVisitors);
router.get('/visitors/all', office, rc.getAllVisitors);
router.get('/visitors/analytics', office, rc.getVisitorAnalytics);
// The handler checks approveVisitor against the visitor's own flat.
router.put('/visitors/:id/approve', member, controller.approveVisitor);
router.put('/visitors/:id/decline', member, controller.declineVisitor);
router.put('/visitors/:id/check-in', desk, controller.checkInVisitor);

router.get('/members', member, rc.getMembers);
router.post('/members', office, rc.addMember);
router.put('/members/:id', office, rc.updateMember);
router.delete('/members/:id', office, rc.removeMember);
router.get('/directory', member, rc.getDirectory);

router.get('/guard-messages', desk, rc.getGuardMessages);
router.get('/my-guard-messages', member, rc.getMyGuardMessages);
router.post('/guard-message', member, rc.sendGuardMessage);
router.put('/guard-messages/:id/read', desk, rc.markGuardMessageRead);
router.get('/guard-reminders', desk, rc.getGuardReminders);
router.post('/guard-reminder', member, rc.createGuardReminder);
router.put('/guard-reminders/:id/dismiss', desk, rc.dismissGuardReminder);

router.get('/staff', member, rc.getStaff);
router.post('/staff', office, rc.addStaff);
router.post('/staff/:id/attendance', desk, rc.markStaffAttendance);

router.get('/bills', office, rc.getBills);
router.get('/bills/summary', office, rc.getBillSummary);
router.get('/my-bills', member, rc.getMyBills);
router.post('/bills/generate', office, rc.generateBills);
router.put('/bills/:id/pay', member, rc.payBill);

router.get('/parking', member, rc.getParking);
router.get('/my-parking', member, rc.getMyParking);
router.post('/parking', office, rc.addParking);
router.delete('/parking/:id', office, rc.removeParking);

router.get('/amenities', member, rc.getAmenities);
router.post('/amenities', office, rc.addAmenity);
router.post('/amenities/:id/book', member, rc.bookAmenity);
router.get('/my-bookings', member, rc.getMyBookings);
router.put('/bookings/:id/cancel', member, rc.cancelBooking);

router.get('/complaints/all', office, rc.getAllComplaints);
router.get('/my-complaints', member, rc.getMyComplaints);
router.post('/complaints', member, rc.createComplaint);
router.put('/complaints/:id/assign', office, rc.assignComplaint);
router.put('/complaints/:id/resolve', office, rc.resolveComplaint);

router.get('/my-packages', member, rc.getMyPackages);
router.put('/packages/:id/collect', member, rc.collectPackage);

router.get('/polls', member, rc.getPolls);
router.post('/polls', office, rc.createPoll);
router.put('/polls/:id/close', office, rc.closePoll);
router.post('/polls/:id/vote', member, rc.votePoll);
router.get('/polls/:id/results', member, rc.getPollResults);

router.get('/emergency/active', member, rc.getActiveEmergencies);
router.put('/emergency/:id/resolve', desk, rc.resolveEmergency);

router.get('/events', member, rc.getEvents);
router.post('/events', office, rc.createEvent);
router.post('/events/:id/rsvp', member, rc.rsvpEvent);
router.delete('/events/:id', office, rc.deleteEvent);

router.get('/settings', member, rc.getSettings);
router.put('/settings', office, rc.updateSettings);

module.exports = router;

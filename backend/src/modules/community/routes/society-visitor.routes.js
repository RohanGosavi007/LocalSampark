const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { queryOne } = require('../../../config/database');
const ctrl = require('../controllers/society-visitor.controller');

// ─── SOCIETY ROLE MIDDLEWARE ────────────────────────────────
// Checks user's role in society_members table
const requireSocietyRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const member = await queryOne(
        'SELECT * FROM society_members WHERE user_id = $1 AND is_active = 1',
        [req.user.id]
      );
      if (!member) {
        return res.status(403).json({ success: false, error: 'You are not a member of any society' });
      }
      if (roles.length > 0 && !roles.includes(member.role)) {
        return res.status(403).json({ success: false, error: `Required role: ${roles.join(' or ')}. Your role: ${member.role}` });
      }
      req.societyMember = member;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Any authenticated society member
const requireMember = requireSocietyRole();

// ─── ROLE & SOCIETY INFO ────────────────────────────────────
router.get('/my-role', authenticate, ctrl.getMySocietyRole);

// ─── VISITOR MANAGEMENT (Features 1-2) ──────────────────────
router.post('/visitors', authenticate, requireSocietyRole('guard'), ctrl.logVisitor);
router.get('/visitors/today', authenticate, requireSocietyRole('guard'), ctrl.getTodayVisitors);
router.put('/visitors/:id/check-in', authenticate, requireSocietyRole('guard'), ctrl.checkInVisitor);
router.put('/visitors/:id/check-out', authenticate, requireSocietyRole('guard'), ctrl.checkOutVisitor);
router.get('/my-visitors', authenticate, requireSocietyRole('resident'), ctrl.getMyVisitors);
router.put('/visitors/:id/approve', authenticate, requireSocietyRole('resident'), ctrl.approveVisitor);
router.put('/visitors/:id/decline', authenticate, requireSocietyRole('resident'), ctrl.declineVisitor);
router.get('/visitors/all', authenticate, requireSocietyRole('admin'), ctrl.getAllVisitors);
router.get('/visitors/analytics', authenticate, requireSocietyRole('admin'), ctrl.getVisitorAnalytics);

// ─── MEMBER MANAGEMENT (Feature 3) ─────────────────────────
router.get('/members', authenticate, requireSocietyRole('admin'), ctrl.getMembers);
router.post('/members', authenticate, requireSocietyRole('admin'), ctrl.addMember);
router.put('/members/:id', authenticate, requireSocietyRole('admin'), ctrl.updateMember);
router.delete('/members/:id', authenticate, requireSocietyRole('admin'), ctrl.removeMember);

// ─── GUARD MESSAGING (Feature 4) ───────────────────────────
router.post('/guard-message', authenticate, requireSocietyRole('resident', 'admin'), ctrl.sendGuardMessage);
router.get('/guard-messages', authenticate, requireSocietyRole('guard'), ctrl.getGuardMessages);
router.put('/guard-messages/:id/read', authenticate, requireSocietyRole('guard'), ctrl.markMessageRead);

// ─── GUARD REMINDERS (Feature 5) ───────────────────────────
router.post('/guard-reminder', authenticate, requireSocietyRole('resident', 'admin'), ctrl.setGuardReminder);
router.get('/guard-reminders', authenticate, requireSocietyRole('guard'), ctrl.getGuardReminders);
router.put('/guard-reminders/:id/dismiss', authenticate, requireSocietyRole('guard'), ctrl.dismissReminder);

// ─── DOMESTIC STAFF (Feature 6) ────────────────────────────
router.get('/staff', authenticate, requireMember, ctrl.getStaff);
router.post('/staff', authenticate, requireSocietyRole('admin'), ctrl.addStaff);
router.put('/staff/:id', authenticate, requireSocietyRole('admin'), ctrl.updateStaff);
router.delete('/staff/:id', authenticate, requireSocietyRole('admin'), ctrl.deleteStaff);
router.post('/staff/:id/attendance', authenticate, requireSocietyRole('guard'), ctrl.markStaffAttendance);
router.get('/staff/attendance/today', authenticate, requireSocietyRole('guard', 'admin'), ctrl.getTodayAttendance);
router.get('/staff/:id/attendance-history', authenticate, requireMember, ctrl.getStaffAttendanceHistory);

// ─── MAINTENANCE BILLS (Feature 7) ─────────────────────────
router.post('/bills/generate', authenticate, requireSocietyRole('admin'), ctrl.generateBills);
router.get('/bills', authenticate, requireSocietyRole('admin'), ctrl.getAllBills);
router.get('/bills/summary', authenticate, requireSocietyRole('admin'), ctrl.getBillsSummary);
router.get('/my-bills', authenticate, requireSocietyRole('resident'), ctrl.getMyBills);
router.put('/bills/:id/pay', authenticate, requireSocietyRole('resident'), ctrl.payBill);

// ─── PARKING (Feature 8) ───────────────────────────────────
router.get('/parking', authenticate, requireSocietyRole('admin'), ctrl.getParkingSlots);
router.post('/parking', authenticate, requireSocietyRole('admin'), ctrl.createParkingSlot);
router.put('/parking/:id', authenticate, requireSocietyRole('admin'), ctrl.updateParkingSlot);
router.delete('/parking/:id', authenticate, requireSocietyRole('admin'), ctrl.deleteParkingSlot);
router.get('/my-parking', authenticate, requireSocietyRole('resident'), ctrl.getMyParking);
router.post('/parking/visitor', authenticate, requireSocietyRole('guard'), ctrl.logVisitorParking);

// ─── AMENITY BOOKING (Feature 9) ───────────────────────────
router.get('/amenities', authenticate, requireMember, ctrl.getAmenities);
router.post('/amenities', authenticate, requireSocietyRole('admin'), ctrl.createAmenity);
router.put('/amenities/:id', authenticate, requireSocietyRole('admin'), ctrl.updateAmenity);
router.post('/amenities/:id/book', authenticate, requireSocietyRole('resident'), ctrl.bookAmenity);
router.get('/amenities/:id/bookings', authenticate, requireMember, ctrl.getAmenityBookings);
router.get('/my-bookings', authenticate, requireSocietyRole('resident'), ctrl.getMyBookings);
router.put('/bookings/:id/cancel', authenticate, requireSocietyRole('resident'), ctrl.cancelBooking);

// ─── COMPLAINTS (Feature 10) ───────────────────────────────
router.post('/complaints', authenticate, requireSocietyRole('resident'), ctrl.fileComplaint);
router.get('/my-complaints', authenticate, requireSocietyRole('resident'), ctrl.getMyComplaints);
router.get('/complaints/all', authenticate, requireSocietyRole('admin'), ctrl.getAllComplaints);
router.put('/complaints/:id/assign', authenticate, requireSocietyRole('admin'), ctrl.assignComplaint);
router.put('/complaints/:id/resolve', authenticate, requireSocietyRole('admin'), ctrl.resolveComplaint);

// ─── PACKAGES (Feature 11) ─────────────────────────────────
router.post('/packages', authenticate, requireSocietyRole('guard'), ctrl.logPackage);
router.get('/packages/pending', authenticate, requireSocietyRole('guard', 'admin'), ctrl.getPendingPackages);
router.get('/my-packages', authenticate, requireSocietyRole('resident'), ctrl.getMyPackages);
router.put('/packages/:id/collect', authenticate, requireMember, ctrl.collectPackage);

// ─── POLLS (Feature 12) ────────────────────────────────────
router.post('/polls', authenticate, requireSocietyRole('admin'), ctrl.createPoll);
router.get('/polls', authenticate, requireMember, ctrl.getPolls);
router.post('/polls/:id/vote', authenticate, requireSocietyRole('resident'), ctrl.votePoll);
router.get('/polls/:id/results', authenticate, requireMember, ctrl.getPollResults);
router.put('/polls/:id/close', authenticate, requireSocietyRole('admin'), ctrl.closePoll);

// ─── EMERGENCY (Feature 13) ────────────────────────────────
router.post('/emergency', authenticate, requireMember, ctrl.triggerEmergency);
router.get('/emergency/active', authenticate, requireMember, ctrl.getActiveEmergencies);
router.put('/emergency/:id/resolve', authenticate, requireSocietyRole('admin', 'guard'), ctrl.resolveEmergency);

// ─── DIRECTORY (Feature 14) ────────────────────────────────
router.get('/directory', authenticate, requireMember, ctrl.getDirectory);

// ─── EVENTS (Feature 15) ───────────────────────────────────
router.post('/events', authenticate, requireSocietyRole('admin'), ctrl.createEvent);
router.get('/events', authenticate, requireMember, ctrl.getEvents);
router.post('/events/:id/rsvp', authenticate, requireSocietyRole('resident'), ctrl.rsvpEvent);
router.get('/events/:id/attendees', authenticate, requireSocietyRole('admin'), ctrl.getEventAttendees);
router.delete('/events/:id', authenticate, requireSocietyRole('admin'), ctrl.deleteEvent);

// ─── SETTINGS & NOTICES ────────────────────────────────────
router.get('/settings', authenticate, requireSocietyRole('admin'), ctrl.getSettings);
router.put('/settings', authenticate, requireSocietyRole('admin'), ctrl.updateSettings);
router.post('/notices', authenticate, requireSocietyRole('admin'), ctrl.postNotice);
router.get('/notices', authenticate, requireMember, ctrl.getNotices);

module.exports = router;

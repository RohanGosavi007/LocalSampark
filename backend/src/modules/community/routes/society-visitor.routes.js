const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth.middleware');
const { queryOne } = require('../../../config/database.sqlite');
const ctrl = require('../controllers/society-visitor.controller');

// â”€â”€â”€ SOCIETY ROLE MIDDLEWARE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      console.error('[requireSocietyRole Error]', error);
      next(error);
    }
  };
};

// Any authenticated society member
const requireMember = requireSocietyRole();

// â”€â”€â”€ ROLE & SOCIETY INFO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/my-role', authenticate, ctrl.getMySocietyRole);

// â”€â”€â”€ VISITOR MANAGEMENT (Features 1-2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/visitors', authenticate, requireSocietyRole('guard'), ctrl.logVisitor);
router.get('/visitors/today', authenticate, requireSocietyRole('guard'), ctrl.getTodayVisitors);
router.put('/visitors/:id/check-in', authenticate, requireSocietyRole('guard'), ctrl.checkInVisitor);
router.put('/visitors/:id/check-out', authenticate, requireSocietyRole('guard'), ctrl.checkOutVisitor);
router.get('/my-visitors', authenticate, requireSocietyRole('resident'), ctrl.getMyVisitors);
router.put('/visitors/:id/approve', authenticate, requireSocietyRole('resident'), ctrl.approveVisitor);
router.put('/visitors/:id/decline', authenticate, requireSocietyRole('resident'), ctrl.declineVisitor);
router.get('/visitors/all', authenticate, requireSocietyRole('admin'), ctrl.getAllVisitors);
router.get('/visitors/analytics', authenticate, requireSocietyRole('admin'), ctrl.getVisitorAnalytics);

// â”€â”€â”€ MEMBER MANAGEMENT (Feature 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/members', authenticate, requireSocietyRole('admin'), ctrl.getMembers);
router.post('/members', authenticate, requireSocietyRole('admin'), ctrl.addMember);
router.put('/members/:id', authenticate, requireSocietyRole('admin'), ctrl.updateMember);
router.delete('/members/:id', authenticate, requireSocietyRole('admin'), ctrl.removeMember);

// â”€â”€â”€ GUARD MESSAGING (Feature 4) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/guard-message', authenticate, requireSocietyRole('resident', 'admin'), ctrl.sendGuardMessage);
router.get('/guard-messages', authenticate, requireSocietyRole('guard'), ctrl.getGuardMessages);
router.put('/guard-messages/:id/read', authenticate, requireSocietyRole('guard'), ctrl.markMessageRead);

// â”€â”€â”€ GUARD REMINDERS (Feature 5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/guard-reminder', authenticate, requireSocietyRole('resident', 'admin'), ctrl.setGuardReminder);
router.get('/guard-reminders', authenticate, requireSocietyRole('guard'), ctrl.getGuardReminders);
router.put('/guard-reminders/:id/dismiss', authenticate, requireSocietyRole('guard'), ctrl.dismissReminder);

// â”€â”€â”€ DOMESTIC STAFF (Feature 6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/staff', authenticate, requireMember, ctrl.getStaff);
router.post('/staff', authenticate, requireSocietyRole('admin'), ctrl.addStaff);
router.put('/staff/:id', authenticate, requireSocietyRole('admin'), ctrl.updateStaff);
router.delete('/staff/:id', authenticate, requireSocietyRole('admin'), ctrl.deleteStaff);
router.post('/staff/:id/attendance', authenticate, requireSocietyRole('guard'), ctrl.markStaffAttendance);
router.get('/staff/attendance/today', authenticate, requireSocietyRole('guard', 'admin'), ctrl.getTodayAttendance);
router.get('/staff/:id/attendance-history', authenticate, requireMember, ctrl.getStaffAttendanceHistory);

// â”€â”€â”€ MAINTENANCE BILLS (Feature 7) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/bills/generate', authenticate, requireSocietyRole('admin'), ctrl.generateBills);
router.get('/bills', authenticate, requireSocietyRole('admin'), ctrl.getAllBills);
router.get('/bills/summary', authenticate, requireSocietyRole('admin'), ctrl.getBillsSummary);
router.get('/my-bills', authenticate, requireSocietyRole('resident'), ctrl.getMyBills);
router.put('/bills/:id/pay', authenticate, requireSocietyRole('resident'), ctrl.payBill);

// â”€â”€â”€ PARKING (Feature 8) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/parking', authenticate, requireSocietyRole('admin'), ctrl.getParkingSlots);
router.post('/parking', authenticate, requireSocietyRole('admin'), ctrl.createParkingSlot);
router.put('/parking/:id', authenticate, requireSocietyRole('admin'), ctrl.updateParkingSlot);
router.delete('/parking/:id', authenticate, requireSocietyRole('admin'), ctrl.deleteParkingSlot);
router.get('/my-parking', authenticate, requireSocietyRole('resident'), ctrl.getMyParking);
router.post('/parking/visitor', authenticate, requireSocietyRole('guard'), ctrl.logVisitorParking);

// â”€â”€â”€ AMENITY BOOKING (Feature 9) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/amenities', authenticate, requireMember, ctrl.getAmenities);
router.post('/amenities', authenticate, requireSocietyRole('admin'), ctrl.createAmenity);
router.put('/amenities/:id', authenticate, requireSocietyRole('admin'), ctrl.updateAmenity);
router.post('/amenities/:id/book', authenticate, requireSocietyRole('resident'), ctrl.bookAmenity);
router.get('/amenities/:id/bookings', authenticate, requireMember, ctrl.getAmenityBookings);
router.get('/my-bookings', authenticate, requireSocietyRole('resident'), ctrl.getMyBookings);
router.put('/bookings/:id/cancel', authenticate, requireSocietyRole('resident'), ctrl.cancelBooking);

// â”€â”€â”€ COMPLAINTS (Feature 10) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/complaints', authenticate, requireSocietyRole('resident'), ctrl.fileComplaint);
router.get('/my-complaints', authenticate, requireSocietyRole('resident'), ctrl.getMyComplaints);
router.get('/complaints/all', authenticate, requireSocietyRole('admin'), ctrl.getAllComplaints);
router.put('/complaints/:id/status', authenticate, requireSocietyRole('admin'), ctrl.updateComplaintStatus);
router.post('/complaints/:id/reopen', authenticate, requireSocietyRole('resident'), ctrl.reopenComplaint);
router.post('/complaints/:id/rate', authenticate, requireSocietyRole('resident'), ctrl.rateResolution);
router.get('/complaints/:id/timeline', authenticate, requireMember, ctrl.getComplaintTimeline);
router.put('/complaints/:id/eta', authenticate, requireSocietyRole('admin'), ctrl.setComplaintETA);

// â”€â”€â”€ PACKAGES (Feature 11) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/packages', authenticate, requireSocietyRole('guard'), ctrl.logPackage);
router.get('/packages/pending', authenticate, requireSocietyRole('guard', 'admin'), ctrl.getPendingPackages);
router.get('/my-packages', authenticate, requireSocietyRole('resident'), ctrl.getMyPackages);
router.put('/packages/:id/collect', authenticate, requireMember, ctrl.collectPackage);

// â”€â”€â”€ POLLS (Feature 12) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/polls', authenticate, requireSocietyRole('admin'), ctrl.createPoll);
router.get('/polls', authenticate, requireMember, ctrl.getPolls);
router.post('/polls/:id/vote', authenticate, requireSocietyRole('resident'), ctrl.votePoll);
router.get('/polls/:id/results', authenticate, requireMember, ctrl.getPollResults);
router.put('/polls/:id/close', authenticate, requireSocietyRole('admin'), ctrl.closePoll);

// â”€â”€â”€ EMERGENCY (Feature 13) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/emergency', authenticate, requireMember, ctrl.triggerEmergency);
router.get('/emergency/active', authenticate, requireMember, ctrl.getActiveEmergencies);
router.put('/emergency/:id/resolve', authenticate, requireSocietyRole('admin', 'guard'), ctrl.resolveEmergency);

// â”€â”€â”€ DIRECTORY (Feature 14) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/directory', authenticate, requireMember, ctrl.getDirectory);
router.put('/directory/privacy', authenticate, requireMember, ctrl.updateDirectoryPrivacy);

// â”€â”€â”€ EVENTS (Feature 15) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/events', authenticate, requireSocietyRole('admin'), ctrl.createEvent);
router.get('/events', authenticate, requireMember, ctrl.getEvents);
router.post('/events/:id/rsvp', authenticate, requireSocietyRole('resident'), ctrl.rsvpEvent);
router.get('/events/:id/attendees', authenticate, requireSocietyRole('admin'), ctrl.getEventAttendees);
router.delete('/events/:id', authenticate, requireSocietyRole('admin'), ctrl.deleteEvent);

// â”€â”€â”€ SETTINGS & NOTICES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/settings', authenticate, requireSocietyRole('admin'), ctrl.getSettings);
router.put('/settings', authenticate, requireSocietyRole('admin'), ctrl.updateSettings);
router.post('/notices', authenticate, requireSocietyRole('admin'), ctrl.postNotice);
router.get('/notices', authenticate, requireMember, ctrl.getNotices);
router.post('/notices/:id/read', authenticate, requireMember, ctrl.markNoticeRead);

module.exports = router;

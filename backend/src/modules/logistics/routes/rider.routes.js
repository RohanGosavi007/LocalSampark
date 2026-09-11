const express = require('express');
const router = express.Router();
const { getRiderProfile, updateRiderStatus, updateLocation, registerRider } = require('../controllers/rider.controller');
const { authenticate, optionalAuth } = require('../../../middleware/auth.middleware');

// These were entirely unauthenticated — the original comment here read
// "in reality these would be protected by rider JWT middleware". Anyone could
// PUT a status or POST a GPS fix for any rider id.
//
// Ownership is now enforced in the controller via delivery_riders.user_id,
// added and backfilled by migration 089. loadOwnedRider() refuses an unlinked
// rider rather than falling open, so migration 089 must be applied before rider
// status and location updates will work.
//
// /register stays public: it is the onboarding entry point. optionalAuth is
// applied so that a rider onboarding from inside the app is linked to their
// account immediately, instead of relying on the phone-number backfill.
router.post('/register', optionalAuth, registerRider);
router.get('/:id', authenticate, getRiderProfile);
router.put('/:id/status', authenticate, updateRiderStatus);
router.post('/:id/location', authenticate, updateLocation);

module.exports = router;

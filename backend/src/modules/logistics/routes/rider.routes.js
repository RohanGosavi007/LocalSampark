const express = require('express');
const router = express.Router();
const { getRiderProfile, updateRiderStatus, updateLocation, registerRider } = require('../controllers/rider.controller');

// Mock simple routes, in reality these would be protected by rider JWT middleware
router.post('/register', registerRider);
router.get('/:id', getRiderProfile);
router.put('/:id/status', updateRiderStatus);
router.post('/:id/location', updateLocation);

module.exports = router;

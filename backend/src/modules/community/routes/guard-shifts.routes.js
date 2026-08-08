const express = require('express');
const router = express.Router();
const controller = require('../../../../controllers/guard-shift.controller');
const { authenticate } = require('../../../../middleware/auth.middleware');

router.use(authenticate);
router.post('/', controller.createShift);
router.get('/roster', controller.getRoster);
router.post('/attendance', controller.markShiftAttendance);

module.exports = router;
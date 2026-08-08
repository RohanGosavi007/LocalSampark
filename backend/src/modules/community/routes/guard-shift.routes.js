const express = require('express');
const router = express.Router();
const controller = require('../controllers/guard-shift.controller');
const authMiddleware = require('../../../middleware/auth.middleware');
const { requireSocietyPermission } = require('../middleware/society-rbac.middleware');

router.use(authMiddleware);

router.post('/', requireSocietyPermission('members'), controller.createShift); // admins
router.get('/', controller.getRoster);
router.post('/attendance', controller.markShiftAttendance); // guards

module.exports = router;

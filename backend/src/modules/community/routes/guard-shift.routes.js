const express = require('express');
const router = express.Router();
const controller = require('../controllers/guard-shift.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { requireCapability, CAPABILITIES } = require('../middleware/society-capability');

// `authenticate`, not the module object.
//
// This was `router.use(require('../../../middleware/auth.middleware'))`, which
// hands Express the whole exports object where it expects a function. Express
// rejects that at mount time — "argument handler is required" — so requiring
// this file threw and any attempt to mount it would have taken the server down
// at boot. It survived only because routes/index.js mounts guard-shifts.routes
// (plural), a different file, leaving this one as a landmine for whoever wired
// it up next.
router.use(authenticate);

router.post('/', requireCapability(CAPABILITIES.MANAGE_SOCIETY), controller.createShift); // admins
router.get('/', controller.getRoster);
router.post('/attendance', controller.markShiftAttendance); // guards

module.exports = router;

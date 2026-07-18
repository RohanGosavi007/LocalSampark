const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/request', authenticate, deliveryController.requestDelivery);
router.get('/jobs', authenticate, deliveryController.getJobs);
router.get('/my-jobs', authenticate, deliveryController.getMyJobs);
router.post('/jobs/:jobId/accept', authenticate, deliveryController.acceptJob);
router.post('/jobs/:jobId/complete', authenticate, deliveryController.completeJob);
router.post('/onboarding', authenticate, deliveryController.onboarding);
router.get('/analytics', authenticate, deliveryController.getAnalytics);
router.post('/jobs/:jobId/verify-otp', authenticate, async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'OTP is required' });

    // Mock validation: accept '1234' or any 4-digit number as valid for testing
    if (otp.length === 4) {
      res.json({ success: true, message: 'OTP verified successfully. Order delivered.' });
    } else {
      res.status(400).json({ error: 'Invalid OTP provided' });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;

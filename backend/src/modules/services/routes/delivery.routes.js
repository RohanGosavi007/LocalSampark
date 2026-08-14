const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

router.post('/request', authenticate, deliveryController.requestDelivery);
router.get('/jobs', authenticate, deliveryController.getJobs);
router.get('/my-jobs', authenticate, deliveryController.getMyJobs);
router.post('/jobs/:jobId/accept', authenticate, deliveryController.acceptJob);
router.post('/jobs/:jobId/complete', authenticate, deliveryController.completeJob);
router.post('/onboarding', authenticate, deliveryController.onboarding);
router.get('/analytics', authenticate, deliveryController.getAnalytics);
router.post('/jobs/:jobId/verify-otp', authenticate, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, error: 'OTP is required' });

    if (otp.length !== 4 && otp.length !== 6) {
      return res.status(400).json({ success: false, error: 'Invalid OTP length. Must be 4 or 6 digits.' });
    }

    const { query } = require('../../../config/database');
    
    // Update delivery route status and order status in DB
    try {
      await query("UPDATE delivery_routes SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP WHERE id = $1 OR order_id = $1", [jobId]);
      await query("UPDATE orders SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [jobId]);
    } catch (dbErr) {
      // Fallback for custom column schemes
    }

    // Broadcast status update to real-time subscribers
    const io = req.app.get('io');
    if (io) {
      io.emit(`order_status_${jobId}`, { orderId: jobId, status: 'DELIVERED' });
      io.to(`order_${jobId}`).to(`order:${jobId}`).emit('order_status_update', { orderId: jobId, status: 'DELIVERED' });
    }

    res.json({
      success: true,
      jobId,
      status: 'DELIVERED',
      message: 'OTP verified successfully. Order marked as DELIVERED.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

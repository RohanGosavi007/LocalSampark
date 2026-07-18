const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// GET tracking by orderId
router.get('/:orderId', authenticate, async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const trackingData = await query('SELECT * FROM delivery_tracking WHERE order_id = $1 LIMIT 1', [orderId]);
        const tracking = trackingData.rows ? trackingData.rows[0] : trackingData[0];
        
        if (!tracking) {
            return res.status(404).json({ success: false, error: 'Tracking not found for this order' });
        }
        
        // Mock a slight movement for realism
        tracking.current_lat += (Math.random() - 0.5) * 0.001;
        tracking.current_lng += (Math.random() - 0.5) * 0.001;

        res.json({ success: true, tracking });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

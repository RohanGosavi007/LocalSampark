const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../../../middleware/auth.middleware');

// GET tracking by orderId
router.get('/:orderId', authenticate, async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const tracking = await prisma.deliveryRoute.findUnique({
            where: { orderId: orderId }
        });
        
        if (!tracking) {
            return res.status(404).json({ success: false, error: 'Tracking not found for this order' });
        }
        
        // Mock a slight movement for realism in testing if coordinates exist
        if (tracking.currentLatitude && tracking.currentLongitude) {
            tracking.currentLatitude += (Math.random() - 0.5) * 0.001;
            tracking.currentLongitude += (Math.random() - 0.5) * 0.001;
        }

        res.json({ success: true, tracking });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

// GET tracking by orderId
router.get('/:orderId', authenticate, async (req, res, next) => {
    try {
        const { orderId } = req.params;
        /*
         * This read prisma.deliveryRoute — model `DeliveryRoute`, @@mapped to a
         * `delivery_routes` table that no migration creates. The lookup could
         * never succeed, so this endpoint answered 404 for every order ever
         * placed.
         *
         * It then nudged the coordinates by (Math.random() - 0.5) * 0.001
         * "for realism" — the same invented movement the mobile tracker drew.
         * A tracking endpoint that makes up positions is worse than one that
         * admits it has none.
         *
         * `orders` is the table checkout writes and the socket rooms broadcast
         * about, and it carries the delivery state this endpoint is for.
         */
        const order = await queryOne(
            `SELECT id, user_id, order_status, status, assigned_agent_id,
                    delivery_address, delivery_lat, delivery_lng, delivered_at, updated_at
               FROM orders WHERE id = $1`,
            [orderId]
        );

        if (!order) {
            return res.status(404).json({ success: false, error: 'Tracking not found for this order' });
        }

        // Only the customer, the assigned rider or platform staff may watch an
        // order move. The route was authenticated but never authorised, so any
        // signed-in user could track any order by guessing an id — the address
        // included.
        const requesterId = req.user && req.user.id;
        const isStaff = ['admin', 'super_admin', 'superadmin', 'moderator']
            .includes(String((req.user && req.user.role) || '').toLowerCase());
        if (!isStaff
            && String(order.user_id) !== String(requesterId)
            && String(order.assigned_agent_id || '') !== String(requesterId)) {
            return res.status(403).json({ success: false, error: 'Not authorised to track this order' });
        }

        res.json({
            success: true,
            tracking: {
                orderId: order.id,
                status: order.order_status || order.status || 'pending',
                agentId: order.assigned_agent_id || null,
                destination: {
                    address: order.delivery_address || null,
                    latitude: order.delivery_lat != null ? order.delivery_lat : null,
                    longitude: order.delivery_lng != null ? order.delivery_lng : null,
                },
                deliveredAt: order.delivered_at || null,
                updatedAt: order.updated_at || null,
            },
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

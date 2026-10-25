const express = require('express');
const router = express.Router();
const { queryOne } = require('../../../config/database');
const { authenticate } = require('../../../middleware/auth.middleware');

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

async function getOrderTrackingPayload(orderId, reqUser) {
  const order = await queryOne(
    `SELECT id, user_id, order_status, status, assigned_agent_id,
            delivery_address, delivery_lat, delivery_lng, delivered_at,
            created_at, updated_at
       FROM orders WHERE id = $1`,
    [orderId]
  );

  if (!order) {
    const err = new Error('Tracking not found for this order');
    err.status = 404;
    throw err;
  }

  const requesterId = reqUser && (reqUser.id || reqUser.userId);
  const isStaff = ['admin', 'super_admin', 'superadmin', 'territory_admin', 'franchise_owner', 'moderator']
    .includes(String((reqUser && reqUser.role) || '').toLowerCase()) || reqUser?.isSuperAdmin;

  if (!isStaff
      && String(order.user_id) !== String(requesterId)
      && String(order.assigned_agent_id || '') !== String(requesterId)) {
    const err = new Error('Not authorised to track this order');
    err.status = 403;
    throw err;
  }

  const status = String(order.order_status || order.status || 'pending').toLowerCase();

  // Milestones progression
  const milestones = [
    { key: 'placed', title: 'Order Placed', completed: true, timestamp: order.created_at },
    { key: 'confirmed', title: 'Order Confirmed', completed: ['confirmed', 'preparing', 'ready', 'assigned', 'out_for_delivery', 'delivered'].includes(status) },
    { key: 'preparing', title: 'Preparing in Kitchen / Store', completed: ['preparing', 'ready', 'assigned', 'out_for_delivery', 'delivered'].includes(status) },
    { key: 'assigned', title: 'Rider Assigned', completed: ['assigned', 'out_for_delivery', 'delivered'].includes(status) },
    { key: 'out_for_delivery', title: 'Out for Delivery', completed: ['out_for_delivery', 'delivered'].includes(status) },
    { key: 'delivered', title: 'Delivered', completed: status === 'delivered', timestamp: order.delivered_at || (status === 'delivered' ? order.updated_at : null) }
  ];

  // Rider details
  let rider = null;
  let distanceKm = null;
  let etaMinutes = null;

  if (order.assigned_agent_id) {
    const agent = await queryOne(
      `SELECT da.id, da.vehicle_type, da.vehicle_number, da.current_lat, da.current_lng, da.updated_at,
              u.full_name AS rider_name, u.phone_number AS rider_phone
         FROM delivery_agents da
         LEFT JOIN users u ON u.id = da.user_id
        WHERE da.id = $1 OR da.user_id = $1
        LIMIT 1`,
      [order.assigned_agent_id]
    );

    if (agent) {
      rider = {
        name: agent.rider_name || 'Delivery Partner',
        phone: agent.rider_phone || null,
        vehicleType: agent.vehicle_type || 'motorcycle',
        vehicleNumber: agent.vehicle_number || null,
        currentLat: agent.current_lat != null ? Number(agent.current_lat) : null,
        currentLng: agent.current_lng != null ? Number(agent.current_lng) : null,
        lastUpdated: agent.updated_at || null
      };

      if (rider.currentLat != null && order.delivery_lat != null) {
        distanceKm = calculateDistanceKm(rider.currentLat, rider.currentLng, order.delivery_lat, order.delivery_lng);
        if (distanceKm != null) {
          // Average urban delivery speed ~20km/h + 5 min traffic buffer
          etaMinutes = Math.max(3, Math.round((distanceKm / 20) * 60 + 5));
        }
      }
    }
  }

  if (status === 'delivered') {
    etaMinutes = 0;
  }

  return {
    orderId: order.id,
    status,
    milestones,
    rider,
    destination: {
      address: order.delivery_address || null,
      latitude: order.delivery_lat != null ? Number(order.delivery_lat) : null,
      longitude: order.delivery_lng != null ? Number(order.delivery_lng) : null,
    },
    distanceKm,
    etaMinutes,
    deliveredAt: order.delivered_at || null,
    updatedAt: order.updated_at || null
  };
}

// GET /tracking/:orderId
router.get('/:orderId', authenticate, async (req, res, next) => {
  try {
    const tracking = await getOrderTrackingPayload(req.params.orderId, req.user);
    res.json({ success: true, tracking });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;
module.exports.getOrderTrackingPayload = getOrderTrackingPayload;

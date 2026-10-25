const {
  ROLES,
  LEGACY_ROLE_ALIASES,
  normalizeRole,
  isFullAdmin,
  isValidRole
} = require('./src/roles');

const {
  FEATURES,
  isFeatureEnabled,
  getAllFeatures
} = require('./src/features');

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  ASSIGNED: 'assigned',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  ARRIVED: 'arrived',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const POST_TYPES = {
  DISCUSSION: 'discussion',
  ANNOUNCEMENT: 'announcement',
  ALERT: 'alert',
  OFFER: 'offer',
  LOST_FOUND: 'lost_found'
};

module.exports = {
  ROLES,
  LEGACY_ROLE_ALIASES,
  normalizeRole,
  isFullAdmin,
  isValidRole,
  FEATURES,
  isFeatureEnabled,
  getAllFeatures,
  ORDER_STATUS,
  POST_TYPES
};

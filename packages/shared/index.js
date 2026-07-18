const ROLES = {
  USER: 'user',
  SHOP_OWNER: 'shop_owner',
  DELIVERY_AGENT: 'delivery_agent',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

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
  ORDER_STATUS,
  POST_TYPES
};

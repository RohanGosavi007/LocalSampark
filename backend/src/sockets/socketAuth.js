/**
 * Authorisation helpers for socket handlers.
 *
 * The HTTP routes in this codebase check who is calling. The socket handlers
 * did not: every `socket.on(...)` took a `shopId` or `orderId` straight from
 * the payload and acted on it, and the handshake middleware degrades an
 * unrecognised token to a guest session rather than refusing the connection.
 *
 * The result was that any connected client — including one that never signed
 * in — could emit `merchant_update_order_status` for any order id and tell
 * that customer their food was on its way, or emit `fleet_location_update` to
 * paint a fake rider onto any shop's dashboard.
 *
 * Nothing here is clever. It is the same question the HTTP middleware asks,
 * asked in the place that was not asking it.
 */

const { queryOne } = require('../config/database');
const logger = require('../config/logger');

const ADMIN_ROLES = ['admin', 'super_admin'];

/** The authenticated user id on a socket, or null for a guest. */
function userIdOf(socket) {
  const user = socket && socket.user;
  if (!user || user.isGuest) return null;
  return user.id || user.userId || null;
}

function isAdmin(socket) {
  const role = String(socket?.user?.role || '').toLowerCase();
  return ADMIN_ROLES.includes(role);
}

/**
 * Whether this socket may act as the given shop.
 *
 * Verified against local_shops.owner_id rather than trusted from the payload.
 */
async function canActAsShop(socket, shopId) {
  if (!shopId) return false;
  if (isAdmin(socket)) return true;

  const userId = userIdOf(socket);
  if (!userId) return false;

  try {
    const shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [shopId]);
    if (!shop) return false;
    return String(shop.owner_id) === String(userId);
  } catch (err) {
    // Denying by default: a failure to establish ownership is not permission.
    logger.warn('Socket shop authorisation failed, denying: ' + err.message);
    return false;
  }
}

/**
 * Whether this socket may act on an order.
 *
 * Either the customer who placed it or the shop fulfilling it. Riders are not
 * covered here because the delivery routes carry their own assignment check.
 */
async function canActOnOrder(socket, orderId) {
  if (!orderId) return false;
  if (isAdmin(socket)) return true;

  const userId = userIdOf(socket);
  if (!userId) return false;

  try {
    const order = await queryOne(
      `SELECT o.user_id, s.owner_id
         FROM shop_orders o
         LEFT JOIN local_shops s ON s.id = o.shop_id
        WHERE o.id = $1`,
      [orderId]
    );
    if (!order) return false;
    return String(order.user_id) === String(userId) || String(order.owner_id) === String(userId);
  } catch (err) {
    logger.warn('Socket order authorisation failed, denying: ' + err.message);
    return false;
  }
}

/**
 * Reports a refusal back to the emitter.
 *
 * Silently dropping an unauthorised emit makes a genuine bug — a shop owner
 * whose session expired mid-shift — indistinguishable from an attack, and the
 * owner sees a dashboard that has simply stopped updating.
 */
function refuse(socket, event, reason = 'not_authorised') {
  socket.emit('socket_error', { event, reason });
}

module.exports = {
  userIdOf,
  isAdmin,
  canActAsShop,
  canActOnOrder,
  refuse,
};

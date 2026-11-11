/**
 * What happens around an order once it exists (C8: "transactional event
 * dispatch"; C13: notifications that open the order).
 *
 * Placing an order told the shop only through a socket event, so a shop owner
 * whose dashboard was not open heard nothing, and the customer got no
 * confirmation at all. Now the shop owner and the customer are notified
 * (in-app inbox and push, modules/core/services/notification.service.js).
 *
 * Never throws: a notification that cannot be sent must not undo an order
 * that has been placed and paid for.
 */
const logger = require('../config/logger');

const ORDER_LINK = (orderId) => `/order-tracking?id=${encodeURIComponent(orderId)}`;

function notifications() {
  return require('../modules/core/services/notification.service');
}

const when = (iso) => {
  if (!iso) return null;
  const d = new Date(new Date(iso).getTime() + 330 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/** An order was placed: the shop owner and the customer are told. */
async function orderPlaced({ order, shop, user }) {
  if (!order || !order.id) return;
  const ref = String(order.id).slice(0, 8).toUpperCase();
  const total = Number(order.total_amount) || 0;
  const slot = order.scheduled_for ? ` for ${when(order.scheduled_for)}` : '';
  const customerName = (user && (user.full_name || user.name)) || 'A customer';
  try {
    await notifications().notifyNewOrder(order.shop_id, order.id, customerName, total);
  } catch (error) {
    logger.error(`[orderEvents] shop not notified of order ${order.id}: ${error.message}`);
  }
  try {
    await notifications().sendToUser(order.user_id, {
      type: 'order_update',
      title: 'Order placed',
      body: `Order #${ref} from ${(shop && shop.name) || 'the shop'} is placed${slot}. ₹${total}.`,
      data: { orderId: order.id, status: order.order_status || 'pending' },
      actionUrl: ORDER_LINK(order.id),
      icon: '🛒',
    });
  } catch (error) {
    logger.error(`[orderEvents] customer not notified of order ${order.id}: ${error.message}`);
  }

  // Email, within each person's settings (services/notificationPrefs.service.js).
  // The email service only logs when no mail server is configured.
  try {
    const prefsSvc = require('./notificationPrefs.service');
    const email = require('../modules/core/services/email.service');
    const { queryOne } = require('../config/database');
    const customer = user && user.email ? user : await queryOne('SELECT id, full_name, email FROM users WHERE id = $1', [order.user_id]);
    if (customer && customer.email && prefsSvc.allows(await prefsSvc.get(order.user_id), 'order_update', 'email')) {
      await email.sendOrderConfirmation(customer, order, shop || {});
    }
    const ownerId = shop && shop.owner_id;
    const owner = ownerId ? await queryOne('SELECT id, email FROM users WHERE id = $1', [ownerId]) : null;
    if (owner && owner.email && prefsSvc.allows(await prefsSvc.get(owner.id), 'order_update', 'email')) {
      await email.sendNewOrderNotification(owner.email, order, customer || {});
    }
  } catch (error) {
    logger.error(`[orderEvents] order ${order.id} email not sent: ${error.message}`);
  }
}

module.exports = { orderPlaced, ORDER_LINK };

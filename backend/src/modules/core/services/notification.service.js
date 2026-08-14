const crypto = require('crypto');
const { query, queryOne } = require('../../../config/database');

/**
 * Notification Service
 * Handles: Socket.io real-time push + Database persistence for offline users
 * Notification types: order_update, appointment_reminder, appointment_update,
 *   dispute_update, payout_settled, new_review, chat_message, flash_sale,
 *   return_update, system, promotion
 */

let supabaseInstance = null;

/**
 * Initialize with Supabase Realtime instance (called from server.js)
 */
function init(supabase) {
  supabaseInstance = supabase;
}

const { Queue, Worker } = require('bullmq');

let notificationQueue = null;

// Initialize BullMQ asynchronously when Redis is ready
function initQueue(redisClient) {
  if (redisClient && !notificationQueue) {
    notificationQueue = new Queue('notification-queue', { connection: redisClient });
    
    // Start background worker for notifications
    const worker = new Worker('notification-queue', async (job) => {
      const { recipientId, notification } = job.data;
      await processNotification(recipientId, notification);
    }, { connection: redisClient });

    worker.on('failed', (job, err) => {
      console.error(`[NOTIFICATION-QUEUE] Job failed: ${err.message}`);
    });
  }
}

/**
 * Send a notification to a specific user (Async API - Offloaded to Queue)
 */
async function sendToUser(recipientId, notification) {
  const id = crypto.randomUUID();
  
  if (notificationQueue) {
    // 10x Scale: Offload to background BullMQ worker
    await notificationQueue.add('send-notification', { recipientId, notification: { ...notification, id } });
    return id;
  }
  
  // Fallback to synchronous execution
  await processNotification(recipientId, { ...notification, id });
  return id;
}

/**
 * Actual heavy processing logic
 */
async function processNotification(recipientId, notification) {
  const { id, type, title, body, data, actionUrl, icon } = notification;

  // 1. Persist to database
  try {
    await queryOne(
      `INSERT INTO shop_notifications (id, recipient_id, type, title, body, data, action_url, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, recipientId, type, title, body || '', JSON.stringify(data || {}), actionUrl || '', icon || '']
    );
  } catch (err) {
    console.error('[NOTIFICATION] DB persist failed:', err.message);
  }

  // 2. Push via Supabase Realtime if user is connected
  if (supabaseInstance) {
    supabaseInstance.broadcast(`user:${recipientId}`, 'notification', {
      id, type, title, body, data, actionUrl, icon,
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Send notification to shop owner by shop ID
 */
async function sendToShopOwner(shopId, notification) {
  let shop = null;
  try {
    shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [shopId]);
  } catch (e) {
    try {
      shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [shopId]);
    } catch (e2) {}
  }
  if (!shop) {
    try {
      shop = await queryOne('SELECT owner_id FROM local_shops WHERE id = $1', [shopId]);
    } catch (e3) {}
  }
  if (shop && shop.owner_id) {
    return sendToUser(shop.owner_id, notification);
  }
  return null;
}

/**
 * Send notification to all users in a region
 */
async function sendToRegion(regionId, notification) {
  const users = await query('SELECT id FROM users WHERE region_id = $1', [regionId]);
  const userList = users.rows || users;
  const ids = [];
  for (const user of userList) {
    const nId = await sendToUser(user.id, notification);
    if (nId) ids.push(nId);
  }
  return ids;
}

/**
 * Get unread notifications for a user
 */
async function getUnread(userId, limit = 50) {
  const notifications = await query(
    'SELECT * FROM shop_notifications WHERE recipient_id = $1 AND (is_read = 0 OR is_read = false) ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return notifications.rows || notifications;
}

/**
 * Get all notifications for a user (paginated)
 */
async function getAll(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const notifications = await query(
    'SELECT * FROM shop_notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  const countResult = await queryOne(
    'SELECT COUNT(*) as total FROM shop_notifications WHERE recipient_id = $1',
    [userId]
  );
  return {
    notifications: notifications.rows || notifications,
    total: parseInt(countResult.total || 0),
    page, limit,
  };
}

/**
 * Mark notification as read
 */
async function markRead(notificationId, userId) {
  return queryOne(
    'UPDATE shop_notifications SET is_read = 1 WHERE id = $1 AND recipient_id = $2 RETURNING *',
    [notificationId, userId]
  );
}

/**
 * Mark all notifications as read
 */
async function markAllRead(userId) {
  await query('UPDATE shop_notifications SET is_read = 1 WHERE recipient_id = $1 AND is_read = 0', [userId]);
  return { success: true };
}

/**
 * Get unread count
 */
async function getUnreadCount(userId) {
  const result = await queryOne(
    'SELECT COUNT(*) as count FROM shop_notifications WHERE recipient_id = $1 AND is_read = 0',
    [userId]
  );
  return parseInt(result.count || 0);
}

// ─── CONVENIENCE METHODS ──────────────────────────────────────────

async function notifyOrderUpdate(userId, orderId, status, shopName) {
  const statusMessages = {
    accepted: { title: 'Order Accepted! ✅', body: `${shopName} has accepted your order.` },
    preparing: { title: 'Being Prepared 🍳', body: `Your order from ${shopName} is being prepared.` },
    ready_for_pickup: { title: 'Ready for Pickup! 📦', body: `Your order from ${shopName} is ready.` },
    dispatched: { title: 'Out for Delivery 🚴', body: `Your order from ${shopName} is on its way!` },
    delivered: { title: 'Delivered! 🎉', body: `Your order from ${shopName} has been delivered.` },
    cancelled: { title: 'Order Cancelled ❌', body: `Your order from ${shopName} has been cancelled.` },
  };
  const msg = statusMessages[status] || { title: 'Order Update', body: `Status: ${status}` };
  return sendToUser(userId, {
    type: 'order_update', ...msg,
    data: { orderId, status },
    actionUrl: `/order-tracking/${orderId}`,
    icon: '📦',
  });
}

async function notifyNewOrder(shopId, orderId, customerName, totalAmount) {
  return sendToShopOwner(shopId, {
    type: 'order_update',
    title: 'New Order! 🔔',
    body: `${customerName} placed an order of ₹${totalAmount}`,
    data: { orderId },
    actionUrl: '/shop-dashboard',
    icon: '🛒',
  });
}

async function notifyAppointmentBooked(shopId, appointmentId, customerName, serviceName, date, time) {
  return sendToShopOwner(shopId, {
    type: 'appointment_update',
    title: 'New Appointment! 📅',
    body: `${customerName} booked ${serviceName} on ${date} at ${time}`,
    data: { appointmentId },
    actionUrl: '/shop-dashboard',
    icon: '📅',
  });
}

async function notifyAppointmentReminder(userId, appointmentId, shopName, serviceName, time) {
  return sendToUser(userId, {
    type: 'appointment_reminder',
    title: 'Appointment Reminder ⏰',
    body: `Your ${serviceName} at ${shopName} is in 30 minutes (${time}).`,
    data: { appointmentId },
    actionUrl: '/my-orders',
    icon: '⏰',
  });
}

async function notifyDisputeUpdate(userId, disputeId, status) {
  return sendToUser(userId, {
    type: 'dispute_update',
    title: 'Dispute Update ⚖️',
    body: `Your dispute has been updated to: ${status}`,
    data: { disputeId, status },
    actionUrl: '/my-orders',
    icon: '⚖️',
  });
}

async function notifyPayoutSettled(shopId, payoutId, amount) {
  return sendToShopOwner(shopId, {
    type: 'payout_settled',
    title: 'Payout Settled! 💰',
    body: `₹${amount} has been settled to your bank account.`,
    data: { payoutId },
    actionUrl: '/shop-dashboard',
    icon: '💰',
  });
}

async function notifyNewReview(shopId, reviewerName, rating) {
  return sendToShopOwner(shopId, {
    type: 'new_review',
    title: 'New Review ⭐',
    body: `${reviewerName} gave you ${rating} stars.`,
    data: { rating },
    actionUrl: '/shop-dashboard',
    icon: '⭐',
  });
}

// ─── SUPABASE EVENT BROADCASTERS ──────────────────────────────────────

function emitOrderStatus(orderId, status, data = {}) {
  if (supabaseInstance) {
    supabaseInstance.broadcast(`order:${orderId}`, 'shop:order:status', { orderId, status, ...data });
  }
}

function emitShopNewOrder(shopId, orderData) {
  if (supabaseInstance) {
    supabaseInstance.broadcast(`shop:${shopId}`, 'shop:order:new', orderData);
  }
}

function emitDeliveryLocation(orderId, coordinates) {
  if (supabaseInstance) {
    supabaseInstance.broadcast(`order:${orderId}`, 'delivery:location:update', coordinates);
  }
}

function emitChatMessage(shopId, senderId, receiverId, message) {
  if (supabaseInstance) {
    supabaseInstance.broadcast(`user:${receiverId}`, 'shop:chat:message', {
      shopId, senderId, message, createdAt: new Date().toISOString(),
    });
  }
}

function emitKDSUpdate(shopId, ticketData) {
  if (supabaseInstance) {
    supabaseInstance.broadcast(`shop:${shopId}`, 'shop:kds:update', ticketData);
  }
}

module.exports = {
  init, initQueue,
  sendToUser, sendToShopOwner, sendToRegion,
  getUnread, getAll, markRead, markAllRead, getUnreadCount,
  notifyOrderUpdate, notifyNewOrder,
  notifyAppointmentBooked, notifyAppointmentReminder,
  notifyDisputeUpdate, notifyPayoutSettled, notifyNewReview,
  emitOrderStatus, emitShopNewOrder, emitDeliveryLocation,
  emitChatMessage, emitKDSUpdate,
};

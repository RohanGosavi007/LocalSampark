/**
 * Where a notification opens in the app (C13: deep links into order and shop
 * screens).
 *
 * The server writes links for the web (actionUrl, e.g. /order-tracking?id=…)
 * and puts the ids in `data`. Tapping a notification in the app's inbox did
 * nothing ("Add navigation logic here"), and a tapped push only opened the app.
 * React-free so it can be tested; used by the inbox and by
 * src/components/NotificationTapHandler.js.
 */

const enc = encodeURIComponent;

/** The app route for a notification, or null when it opens nothing in particular. */
export function notificationTarget(n) {
  if (!n) return null;
  let data = n.data || {};
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (data.orderId) return `/orders/track/${enc(String(data.orderId))}`;
  if (data.ticketId) return '/support';
  if (data.shopId && /review|shop/i.test(String(data.type || n.type || ''))) return `/modules/shop/${enc(String(data.shopId))}`;

  const url = String(n.actionUrl || data.actionUrl || '');
  if (!url) return null;
  const order = /^\/order-tracking(?:\?id=|\/)([^&/?#]+)/.exec(url);
  if (order) return `/orders/track/${enc(decodeURIComponent(order[1]))}`;
  if (url === '/order-tracking') return '/orders';
  if (url.startsWith('/support') || url.startsWith('/legal/grievance')) return '/support';
  const shop = /^\/shops\/([^/?#]+)/.exec(url);
  if (shop) return `/modules/shop/${enc(decodeURIComponent(shop[1]))}`;
  if (url.startsWith('/shop-dashboard')) return '/modules/shop-dashboard';
  if (url.startsWith('/notifications')) return '/modules/notifications';
  return null;
}

/** The same, for a push the customer tapped (expo-notifications content). */
export function pushTarget(content) {
  if (!content) return null;
  const data = content.data || {};
  return notificationTarget({ data, actionUrl: data.actionUrl, type: data.type });
}

/** The icon family for a stored notification type. */
export function notificationKind(type) {
  const t = String(type || '');
  if (/order|return|dispute/.test(t)) return 'order';
  if (/promotion|flash_sale/.test(t)) return 'promotion';
  if (/review|chat/.test(t)) return 'community';
  return 'system';
}

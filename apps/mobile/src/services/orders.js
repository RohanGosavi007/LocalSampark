/**
 * The customer's orders in the app (C9): milestones, the cancellation window,
 * the GST invoice and "order again".
 *
 * The tracking screen had none of these. Its progress bar looked for statuses
 * called "placed" and "packing", which the server never sends, so every real
 * order showed no progress at all. The rules live here, free of React, so they
 * can be tested without a device; app/orders renders them.
 *
 * The statuses and the cancellation window mirror
 * backend/src/services/orderLifecycle.service.js. The server enforces them;
 * the app only decides what to offer.
 */
import { apiGet, apiPut, apiPost, API_BASE, getAuthHeaders } from '../lib/api';

export const ORDER_STEPS = [
  { key: 'pending', label: 'Placed' },
  { key: 'confirmed', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'out_for_delivery', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
];

// Statuses between the listed steps count as the nearest earlier one.
const RANK = {
  pending: 0, placed: 0,
  confirmed: 1, accepted: 1,
  preparing: 2, ready: 2, assigned: 2,
  picked_up: 3, out_for_delivery: 3,
  delivered: 4, return_requested: 4, returned: 4,
};

/** Statuses a customer may still cancel from (orderLifecycle CUSTOMER_CANCELLABLE_FROM). */
export const CUSTOMER_CANCELLABLE = ['pending', 'confirmed'];

/** Statuses after which nothing more will happen to the order on its own. */
export const FINAL_STATUSES = ['delivered', 'cancelled', 'returned', 'rejected', 'failed'];

export const POLL_INTERVAL_MS = 15000;

const norm = (s) => String(s || 'pending').toLowerCase();

/** Index into ORDER_STEPS reached so far; -1 for a cancelled order. */
export function stepIndex(status) {
  const s = norm(status);
  if (s === 'cancelled' || s === 'rejected') return -1;
  return Object.prototype.hasOwnProperty.call(RANK, s) ? RANK[s] : 0;
}

export const canCancel = (status) => CUSTOMER_CANCELLABLE.includes(norm(status));
export const isFinal = (status) => FINAL_STATUSES.includes(norm(status));

/** Server events that mean "this order changed; read it again". */
export const ORDER_EVENTS = ['ORDER_STATUS_UPDATED', 'order_status_update', 'ORDER_RIDER_ASSIGNED'];
export const isEventFor = (payload, id) => Boolean(payload && String(payload.orderId) === String(id));

/** Poll only when the live socket is down and the order can still change. */
export const shouldPoll = (status, socketConnected) => !socketConnected && !isFinal(status);

/** The short reference shown to customers, as on the web and the invoice. */
export const orderRef = (id) => String(id || '').slice(0, 8).toUpperCase();

export const statusLabel = (status) => {
  const t = norm(status).replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** "12 Nov, 18:00–19:00" in India time, for an order placed for a slot (C8). */
export function slotText(iso) {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  const pad = (n) => String(n).padStart(2, '0');
  const ist = (ms) => new Date(ms + 330 * 60 * 1000);
  const s = ist(at);
  const e = ist(at + 3600000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${s.getUTCDate()} ${months[s.getUTCMonth()]}, ${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}–${pad(e.getUTCHours())}:${pad(e.getUTCMinutes())}`;
}

/** Shapes GET /orders/:id for the screen. Nothing is invented. */
export function presentOrder(res) {
  const o = (res && (res.order || res)) || null;
  if (!o || !o.id) return null;
  return {
    id: o.id,
    shopId: o.shop_id || null,
    shopName: o.shop_name || 'Shop',
    status: norm(o.status || o.order_status),
    total: Number(o.total_amount) || 0,
    eta: o.eta || o.estimated_delivery_time || null,
    // C8: the window the order was placed for (null: as soon as possible).
    scheduledFor: o.scheduled_for || null,
    paymentMethod: String(o.payment_method || '').toLowerCase() || null,
    pickup: o.fulfillment_method === 'pickup',
    driver: o.delivery_agent_name
      ? { name: o.delivery_agent_name, phone: o.delivery_agent_phone || null, vehicle: o.delivery_agent_vehicle || null }
      : null,
    items: ((res && res.items) || []).map((it) => ({
      productId: it.product_id,
      name: it.name || it.product_name || 'Item',
      quantity: Number(it.quantity) || 1,
    })),
  };
}

export async function loadOrder(id, api = { apiGet }) {
  const order = presentOrder(await api.apiGet(`/orders/${encodeURIComponent(id)}`));
  if (!order) throw new Error('Order not found');
  return order;
}

/** GET /orders/my-orders; an empty history is an empty list, never a sample. */
export async function listMyOrders(api = { apiGet }) {
  const res = await api.apiGet('/orders/my-orders');
  if (Array.isArray(res)) return res;
  return (res && (res.data || res.rows)) || [];
}

/**
 * Cancels the order. Refuses locally outside the window; the server's own
 * refusal (e.g. "The shop has started preparing this order…") is thrown as is.
 */
export async function cancelOrder(order, api = { apiPut }) {
  if (!canCancel(order.status)) {
    throw new Error('This order can no longer be cancelled.');
  }
  const res = await api.apiPut(`/orders/${encodeURIComponent(order.id)}/status`, {
    status: 'cancelled',
    reason: 'Cancelled by customer',
  });
  return norm((res && res.status) || 'cancelled');
}

/**
 * Builds the cart lines for "order again": only items the shop still lists,
 * at today's price, never the price on the old order.
 */
export function reorderLines(order, listedProducts) {
  const current = new Map((listedProducts || []).map((p) => [String(p.id), p]));
  const lines = [];
  const missing = [];
  for (const it of order.items || []) {
    const product = current.get(String(it.productId));
    const unavailable = !product || [false, 0, '0'].includes(product.is_available)
      || (product.stock_quantity != null && Number(product.stock_quantity) <= 0);
    if (unavailable) { missing.push(it.name); continue; }
    lines.push({
      product: { ...product, shop_id: order.shopId, shop_name: order.shopName, price: Number(product.price) },
      quantity: it.quantity,
    });
  }
  return { lines, missing };
}

/**
 * Puts the order's items back in the cart. The cart holds one shop at a time;
 * if it already belongs to another shop, nothing is added and the caller is
 * told so rather than the cart being silently emptied.
 */
export async function orderAgain(order, cart, api = { apiGet }) {
  const listed = await api.apiGet(`/shops/${encodeURIComponent(order.shopId)}/products`);
  const products = Array.isArray(listed) ? listed : (listed && (listed.data || listed.products)) || [];
  const { lines, missing } = reorderLines(order, products);
  if (!lines.length) {
    return { added: 0, missing, reason: 'none_available' };
  }
  let added = 0;
  for (const { product, quantity } of lines) {
    const r = cart.addItem(product, quantity);
    if (r && r.added === false) {
      return { added, missing, reason: r.reason, currentShopName: r.currentShopName };
    }
    added += 1;
  }
  return { added, missing, reason: null };
}

export const invoiceUrl = (id) => `${API_BASE}/orders/${encodeURIComponent(id)}/invoice/pdf`;
export const invoiceFileName = (id) => `Invoice-${orderRef(id)}.pdf`;

/**
 * Downloads the GST invoice PDF into the cache and opens the share sheet, from
 * which the customer can view or save it.
 *
 * The JSON invoice is requested first: it goes through api.js, which refreshes
 * an expired session and turns a refusal into a readable message. The file
 * download itself cannot do either.
 */
export async function downloadInvoice(id, deps) {
  const { api = { apiGet }, fs, sharing, headers = getAuthHeaders } = deps;
  await api.apiGet(`/orders/${encodeURIComponent(id)}/invoice`);
  const auth = await headers();
  const target = new fs.File(fs.Paths.cache, invoiceFileName(id));
  if (target.exists) target.delete();
  const file = await fs.File.downloadFileAsync(invoiceUrl(id), target, {
    headers: { Authorization: auth.Authorization, Accept: 'application/pdf' },
  });
  if (await sharing.isAvailableAsync()) {
    await sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: invoiceFileName(id) });
  }
  return file.uri;
}

/**
 * C11: review a delivered order's shop. The server checks the order is this
 * customer's and delivered; a second review replaces the first.
 */
export async function reviewOrder(order, rating, text, api = { apiPost }) {
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('Choose a rating from 1 to 5 stars.');
  if (String(order.status).toLowerCase() !== 'delivered') throw new Error('You can review an order once it has been delivered.');
  const body = { rating: stars };
  const trimmed = String(text || '').trim();
  if (trimmed) body.review = trimmed.slice(0, 2000);
  return api.apiPost(`/shops/${encodeURIComponent(order.shopId)}/orders/${encodeURIComponent(order.id)}/review`, body);
}

// ── returns (C10) ───────────────────────────────────────────────────────────

/** The server's reason codes (modules/ecommerce/services/return.service.js), with labels. */
export const RETURN_REASONS = [
  ['damaged', 'Damaged'], ['wrong_item', 'Wrong item'], ['missing_items', 'Items missing'],
  ['spoiled_or_expired', 'Spoiled or expired'], ['quality_issue', 'Poor quality'],
  ['not_as_described', 'Not as described'], ['other', 'Something else'],
];

export const RETURN_STATUS = {
  pending_review: 'Waiting for the shop to decide',
  verified_approved: 'Accepted',
  rejected: 'Not accepted',
};

const UPI = /^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9]{1,63}$/;

/** Where an accepted return's money is (D10: a cash refund is paid by hand while the wallet is off). */
export function refundText(r) {
  const amount = `₹${Number(r.refund_amount)}`;
  if (r.refund_channel === 'wallet') return `${amount} refunded to your LocalSampark wallet.`;
  if (r.refund_channel === 'manual_payout') {
    return r.payout_status === 'paid'
      ? `${amount} sent${r.refund_upi ? ` to ${r.refund_upi}` : ''} (reference ${r.payout_reference}).`
      : `${amount} will be sent${r.refund_upi ? ` to ${r.refund_upi}` : ''}; our team will tell you when it is.`;
  }
  return r.refund_reference_id ? `${amount} refunded to your original payment method.` : `${amount} is being refunded to your original payment method.`;
}

/** Returns an error message, or null when the request can be sent. */
export function validateReturn(form) {
  if (!form || !RETURN_REASONS.some(([c]) => c === form.reasonCode)) return 'Choose what went wrong.';
  if (form.reasonCode === 'other' && !String(form.reason || '').trim()) return 'Tell us what went wrong.';
  if (String(form.reason || '').length > 1000) return 'Please keep the details under 1000 characters.';
  if ((form.photos || []).length > 5) return 'Attach at most 5 photos.';
  if (!['return', 'replacement'].includes(form.returnType || 'return')) return 'Choose a refund or a replacement.';
  if (form.refundUpi && !UPI.test(String(form.refundUpi).trim())) return 'Enter a UPI ID like name@bank.';
  return null;
}

/** The customer's own return requests. */
export async function myReturns(api = { apiGet }) {
  const res = await api.apiGet('/orders/returns/mine');
  return (res && res.data) || [];
}

/** Uploads one photo (a local file uri) and resolves to its web address. */
export async function uploadReturnPhoto(orderId, photo, deps = {}) {
  const fetchImpl = deps.fetch || fetch;
  const headers = { ...(await (deps.headers || getAuthHeaders)()) };
  delete headers['Content-Type'];
  const body = new FormData();
  body.append('files', { uri: photo.uri, name: photo.name || 'photo.jpg', type: photo.type || 'image/jpeg' });
  body.append('purpose', 'return_photo');
  body.append('referenceId', String(orderId));
  const res = await fetchImpl(`${API_BASE}/upload`, { method: 'POST', headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || 'A photo could not be uploaded.');
  return data.url;
}

/** Sends a return request (uploading any photos first). */
export async function requestReturn(order, form, deps = {}) {
  const problem = validateReturn(form);
  if (problem) throw new Error(problem);
  const api = deps.api || { apiPost };
  const evidenceUrls = [];
  for (const photo of form.photos || []) evidenceUrls.push(await uploadReturnPhoto(order.id, photo, deps));
  const reason = String(form.reason || '').trim();
  return api.apiPost(`/orders/${encodeURIComponent(order.id)}/returns`, {
    returnType: form.returnType || 'return',
    reasonCode: form.reasonCode,
    ...(reason ? { reason } : {}),
    ...(form.refundUpi ? { refundUpi: String(form.refundUpi).trim() } : {}),
    evidenceUrls,
  });
}

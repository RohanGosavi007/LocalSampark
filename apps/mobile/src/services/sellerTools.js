/**
 * S5, S6 and S7 on Android: the seller's coupons, review replies and shop
 * figures. The same endpoints the web shop manager uses; input is checked here
 * first so the phone can say what is wrong without a round trip, and the
 * server's own refusal is passed on as it words it.
 */
import { apiGet, apiPost, apiPatch } from '../lib/api';

/** The signed-in owner's shop id (GET /shops/my-shop). */
export async function myShopId() {
  const res = await apiGet('/shops/my-shop');
  const id = res && res.shop && res.shop.id;
  if (!id) throw new Error('No shop is linked to this account.');
  return id;
}

// ─── S5: coupons ────────────────────────────────────────────────────────────

/** Checks a coupon form and returns { body } for the API, or { error }. */
export function couponFromForm(form) {
  const code = String(form.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: 'Use 3–30 letters or numbers for the code.' };
  const type = form.discount_type === 'fixed' ? 'fixed' : 'percentage';
  const value = Number(form.discount_value);
  if (!(value > 0)) return { error: 'The discount must be more than 0.' };
  if (type === 'percentage' && value > 100) return { error: 'A percentage discount must be between 1 and 100.' };
  const minOrder = form.min_order_amount === '' || form.min_order_amount == null ? 0 : Number(form.min_order_amount);
  if (!(minOrder >= 0)) return { error: 'The minimum order cannot be negative.' };
  const body = { code, discount_type: type, discount_value: value, min_order_amount: minOrder };
  if (form.max_discount_amount !== '' && form.max_discount_amount != null) {
    const cap = Number(form.max_discount_amount);
    if (!(cap > 0)) return { error: 'The maximum discount must be more than ₹0.' };
    body.max_discount_amount = cap;
  }
  return { body };
}

export const isCouponActive = (c) => [true, 1, '1', 't', 'true'].includes(c && c.is_active);

export function couponSummary(c) {
  const off = String(c.discount_type) === 'percentage' ? `${Number(c.discount_value)}% off` : `₹${Number(c.discount_value)} off`;
  const min = Number(c.min_order_amount) > 0 ? ` on orders over ₹${Number(c.min_order_amount)}` : '';
  return `${off}${min}`;
}

export async function listCoupons(shopId) {
  const res = await apiGet(`/shops/${shopId}/coupons`);
  return (res && res.data) || [];
}

export async function createCoupon(shopId, form) {
  const { body, error } = couponFromForm(form);
  if (error) throw new Error(error);
  const res = await apiPost(`/shops/${shopId}/coupons`, body);
  return res.data;
}

export async function setCouponActive(shopId, couponId, active) {
  const res = await apiPatch(`/shops/${shopId}/coupons/${couponId}`, { is_active: Boolean(active) });
  return res.data;
}

// ─── S6: review replies ─────────────────────────────────────────────────────

export function replyFromInput(text) {
  const reply = String(text || '').trim();
  if (!reply) return { error: 'Write a reply first.' };
  if (reply.length > 1000) return { error: 'Keep your reply under 1000 characters.' };
  return { reply };
}

export async function replyToReview(reviewId, text) {
  const { reply, error } = replyFromInput(text);
  if (error) throw new Error(error);
  return apiPost(`/shops/my-shop/reviews/${reviewId}/reply`, { reply });
}

// ─── S7: shop figures ───────────────────────────────────────────────────────

/** GET /shops/my-shop/analytics-data, as the four figures the screen shows. */
export async function loadShopFigures() {
  const res = await apiGet('/shops/my-shop/analytics-data');
  return shopFigures(res && res.analytics);
}

export function shopFigures(a) {
  if (!a) return [];
  return [
    { id: 'revenue', label: 'Revenue (delivered)', value: `₹${Number(a.revenue || 0).toLocaleString('en-IN')}` },
    { id: 'orders', label: 'Orders delivered', value: String(Number(a.orders) || 0) },
    { id: 'conversion', label: 'Orders completed', value: `${a.conversion}%` },
    // Not tracked yet: unknown, never shown as 0.
    { id: 'views', label: 'Store views', value: a.views == null ? '—' : String(a.views) },
  ];
}

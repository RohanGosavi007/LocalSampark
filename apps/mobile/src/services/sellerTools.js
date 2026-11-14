/**
 * S5, S6 and S7 on Android: the seller's coupons, review replies and shop
 * figures. The same endpoints the web shop manager uses; input is checked here
 * first so the phone can say what is wrong without a round trip, and the
 * server's own refusal is passed on as it words it.
 */
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '../lib/api';

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

// ─── S2: product variants ───────────────────────────────────────────────────

const VARIANT_MAX_MODIFIER = 100000;

/**
 * The same rules as the server (productVariants write routes), so the phone
 * can point at the field. `price` is the product's price: an option may not
 * take it below ₹0. Returns { body } or { problems }.
 */
export function variantFromForm(form, price = 0) {
  const problems = {};
  const name = String(form.variant_name || '').trim();
  const value = String(form.variant_value || '').trim();
  if (!name) problems.variant_name = 'What is this option? For example: Size.';
  if (!value) problems.variant_value = 'Which one? For example: Large.';
  const modRaw = String(form.price_modifier ?? '').trim();
  const mod = modRaw === '' ? 0 : Number(modRaw);
  if (!Number.isFinite(mod) || Math.abs(mod) > VARIANT_MAX_MODIFIER) problems.price_modifier = 'Enter the extra (or reduced) price in ₹, like 20 or -10.';
  else if ((Number(price) || 0) + mod < 0) problems.price_modifier = 'That would make this option cost less than ₹0.';
  const stockRaw = String(form.inventory_count ?? '').trim();
  const stock = stockRaw === '' ? 0 : Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) problems.inventory_count = 'Stock is a whole number, 0 or more.';
  if (Object.keys(problems).length) return { problems };
  return { body: { variant_name: name, variant_value: value, price_modifier: mod, inventory_count: stock } };
}

export async function listVariants(shopId, productId) {
  const res = await apiGet(`/shops/${shopId}/products/${productId}/variants`);
  return ((res && res.variants) || []).map((v) => ({
    id: String(v.id),
    label: `${v.variant_name}: ${v.variant_value}`,
    priceModifier: Number(v.price_modifier) || 0,
    stock: Number(v.inventory_count) || 0,
  }));
}

export const variantPriceLabel = (mod) => (mod === 0 ? 'Same price' : `${mod > 0 ? '+' : '-'}₹${Math.abs(mod)}`);

function withProblems(e) {
  const list = e && e.data && Array.isArray(e.data.problems) ? e.data.problems : [];
  if (list.length) e.problems = Object.fromEntries(list.map((p) => [p.field, p.message]));
  return e;
}

export async function addVariant(shopId, productId, price, form) {
  const checked = variantFromForm(form, price);
  if (checked.problems) throw Object.assign(new Error('Some details need fixing.'), { problems: checked.problems });
  try {
    return (await apiPost(`/shops/${shopId}/products/${productId}/variants`, checked.body)).variant;
  } catch (e) { throw withProblems(e); }
}

export async function updateVariantStock(shopId, productId, variantId, stock) {
  const n = Number(stock);
  if (!Number.isInteger(n) || n < 0) throw new Error('Stock is a whole number, 0 or more.');
  return (await apiPut(`/shops/${shopId}/products/${productId}/variants/${variantId}`, { inventory_count: n })).variant;
}

export async function removeVariant(shopId, productId, variantId) {
  return apiDelete(`/shops/${shopId}/products/${productId}/variants/${variantId}`);
}

// ─── S3: order actions and packing slip ────────────────────────────────────

/**
 * What the shop can do next with an order, following the order pipeline
 * (orderLifecycle: confirmed → preparing → ready → handed over / out for
 * delivery → delivered). `status` is the board status the API sends (an order
 * out for delivery arrives as "dispatched"); `type` is 'Pickup' or 'Delivery'.
 *
 * The screen offered "Mark Ready" straight after Accept (the pipeline requires
 * "preparing" first, so the server refused it), a "Dispatch" button on orders a
 * delivery partner had already taken (also refused), and nothing at all for an
 * order the shop was delivering itself — it could never be completed from the
 * phone.
 */
export function orderActions(order) {
  const status = String((order && order.status) || '').toLowerCase();
  const pickup = order && order.type === 'Pickup';
  const hasRider = Boolean(order && order.hasRider) || status === 'assigned';
  const partner = { actions: [], note: 'A delivery partner is handling this order.' };
  switch (status) {
    case 'pending':
      return { actions: [{ label: 'Decline', status: 'cancelled', tone: 'decline' }, { label: 'Accept', status: 'confirmed' }] };
    case 'confirmed':
      return { actions: [{ label: 'Start preparing', status: 'preparing' }] };
    case 'preparing':
      return { actions: [{ label: 'Mark ready', status: 'ready' }] };
    case 'ready':
      if (pickup) return { actions: [{ label: 'Handed over', status: 'delivered' }] };
      if (hasRider) return partner;
      return { actions: [{ label: 'Out for delivery', status: 'out_for_delivery', tone: 'delivery' }], note: 'Delivery partners nearby can also pick this up.' };
    case 'assigned':
      return partner;
    case 'dispatched':
    case 'out_for_delivery':
      return hasRider ? partner : { actions: [{ label: 'Mark delivered', status: 'delivered' }] };
    default:
      return { actions: [] };
  }
}

/** The packing slip is for an order being made up, not a new or finished one. */
export const canPrintSlip = (status) => ['confirmed', 'preparing', 'ready', 'assigned'].includes(String(status || '').toLowerCase());

/** The 80 mm text packing slip (GET /orders/:id/packing-slip). */
export async function loadPackingSlip(orderId) {
  const res = await apiGet(`/orders/${orderId}/packing-slip?format=json`);
  if (!res || !res.slipText) throw new Error('The packing slip could not be loaded.');
  return res.slipText;
}

// ─── S1: KYC ────────────────────────────────────────────────────────────────

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z0-9]{13}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^[0-9]{9,18}$/;

export const KYC_STATUS_LABEL = {
  not_started: 'Not submitted yet',
  submitted: 'Submitted — under review',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Needs changes',
  resubmission_required: 'Needs changes',
};

/** Whether the seller can (re)submit: nothing sent yet, or sent back for changes. */
export const kycNeedsSubmission = (status) => ['not_started', 'rejected', 'resubmission_required'].includes(status || 'not_started');

/**
 * The same rules as the server (vendor-kyc.routes kycProblems), checked first
 * so the phone can point at the field. Returns { body } or { problems }.
 */
export function kycFromForm(form) {
  const up = (v) => String(v || '').trim().toUpperCase();
  const problems = {};
  const pan = up(form.pan_number);
  if (!pan) problems.pan_number = 'PAN is required.';
  else if (!PAN_RE.test(pan)) problems.pan_number = 'PAN looks like ABCDE1234F.';
  const gst = up(form.gst_number);
  if (gst && !GSTIN_RE.test(gst)) problems.gst_number = 'GSTIN is 15 characters, like 27ABCDE1234F1Z5.';
  const account = String(form.bank_account_number || '').replace(/\s/g, '');
  const ifsc = up(form.bank_ifsc);
  if (account && !ACCOUNT_RE.test(account)) problems.bank_account_number = 'Account number is 9 to 18 digits.';
  if (ifsc && !IFSC_RE.test(ifsc)) problems.bank_ifsc = 'IFSC looks like HDFC0001234.';
  if (account && !ifsc) problems.bank_ifsc = 'IFSC is needed with the account number.';
  if (ifsc && !account) problems.bank_account_number = 'Account number is needed with the IFSC.';
  if (Object.keys(problems).length) return { problems };
  const body = { pan_number: pan };
  if (gst) body.gst_number = gst;
  if (account) { body.bank_account_number = account; body.bank_ifsc = ifsc; }
  if (String(form.bank_name || '').trim()) body.bank_name = String(form.bank_name).trim();
  return { body };
}

export async function loadKyc(shopId) {
  const res = await apiGet(`/shops/${shopId}/kyc`);
  return (res && res.kyc) || { kyc_status: 'not_started' };
}

/** POST /shops/:id/kyc. Throws with { problems } keyed by field when the form or the server refuses it. */
export async function submitKyc(shopId, form) {
  const checked = kycFromForm(form);
  if (checked.problems) {
    const err = new Error('Some KYC details need fixing.');
    err.problems = checked.problems;
    throw err;
  }
  try {
    return await apiPost(`/shops/${shopId}/kyc`, checked.body);
  } catch (e) {
    const list = e && e.data && Array.isArray(e.data.problems) ? e.data.problems : [];
    if (list.length) e.problems = Object.fromEntries(list.map((p) => [p.field, p.message]));
    throw e;
  }
}

// ─── S4: earnings and settlements ───────────────────────────────────────────

const PAYOUT_STATUS = { calculated: 'Being prepared', approved: 'Approved — on its way', paid: 'Paid', failed: 'Failed' };

/**
 * The shop's ledger and settlement history. The merchant "Settlements" button
 * opened the admin revenue tab, whose /admin/* calls a seller is refused, so a
 * seller saw "Nothing pending" instead of their own money.
 */
export async function loadEarnings(shopId) {
  const res = await apiGet('/shops/my-shop/ledger');
  const ledger = (res && res.ledger) || null;
  if (!ledger) throw new Error('Your earnings could not be loaded.');
  let payouts = [];
  if (shopId) {
    const pr = await apiGet(`/shops/${shopId}/payouts`);
    payouts = (pr && Array.isArray(pr.payouts) && pr.payouts) || [];
  }
  return earningsView(ledger, payouts);
}

const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function earningsView(ledger, payouts = []) {
  return {
    figures: [
      { id: 'gross', label: 'Gross sales', value: inr(ledger.grossSales) },
      { id: 'commission', label: 'Platform commission', value: `-${inr(ledger.platformCommission)}` },
      { id: 'net', label: 'Net earnings', value: inr(ledger.netPayout) },
      { id: 'pending', label: 'Awaiting settlement', value: inr(ledger.pendingPayouts) },
    ],
    settledSoFar: inr(ledger.settledPayouts),
    transactions: (ledger.transactions || []).map((t) => ({
      id: String(t.order_id),
      gross: inr(t.gross_amount),
      commission: `-${inr(t.commission)}${t.source === 'estimated' ? ' (estimated)' : ''}`,
      net: inr(t.net_amount),
    })),
    payouts: payouts.map((p) => ({
      id: String(p.id),
      period: `${String(p.period_start || '').slice(0, 10)} – ${String(p.period_end || '').slice(0, 10)}`,
      amount: inr(p.net_payout),
      status: PAYOUT_STATUS[p.payout_status] || String(p.payout_status || ''),
    })),
  };
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

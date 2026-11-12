/**
 * C7: a coupon at checkout in the app. The server prices it: the code goes
 * into the quote and the order, and the bill comes back with what it took off
 * (bill.coupon) or why it does not apply (bill.couponError).
 */

/** A code as typed, ready to send, or null. */
export function cleanCouponCode(value) {
  const v = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return v && v.length <= 40 ? v : null;
}

/** The request body with the applied coupon, if there is one. */
export function withCoupon(body, code) {
  return code ? { ...body, couponCode: code } : body;
}

/** What to show under the coupon: { ok, text }, or null with nothing applied. */
export function couponSummary(bill) {
  if (!bill) return null;
  if (bill.couponError) return { ok: false, text: bill.couponError.message };
  const c = bill.coupon;
  if (!c) return null;
  const saved = c.type === 'free_delivery'
    ? `free delivery${c.deliveryWaived > 0 ? ` (saves ₹${Number(c.deliveryWaived).toFixed(2)})` : ''}`
    : `you save ₹${Number(c.discount).toFixed(2)}`;
  return { ok: true, text: `${c.code} applied: ${saved}` };
}

/** Why the order cannot be placed with this coupon, or null. */
export function couponBlocks(code, bill) {
  if (!code || !bill || !bill.couponError) return null;
  return `${bill.couponError.message}. Remove the coupon to place the order without it.`;
}

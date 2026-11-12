/**
 * C7: what the checkout says about a coupon. The server prices it: the bill
 * comes back with what it took off (bill.coupon) or why it does not apply
 * (bill.couponError). Free of React so it can be tested with node --test.
 */

/** A code as typed, ready to send, or null. */
export function cleanCouponCode(value) {
  const v = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return v && v.length <= 40 ? v : null;
}

/** { ok, text } to show under the coupon, or null with nothing applied. */
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

/**
 * C7 on the website: the coupon at checkout (src/lib/coupon.js,
 * src/components/CouponField.js) and that both checkouts send it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { couponSummary, cleanCouponCode } from '../src/lib/coupon.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('[C7.15] the checkout says what a coupon saved, or why it does not apply, and shows the discount on the bill', () => {
  assert.equal(cleanCouponCode('  save10 '), 'SAVE10');
  assert.equal(cleanCouponCode('   '), null);
  assert.equal(couponSummary(null), null);
  assert.equal(couponSummary({ coupon: null, couponError: null }), null);
  assert.deepEqual(couponSummary({ coupon: { code: 'SAVE10', type: 'percentage', discount: 40 } }), { ok: true, text: 'SAVE10 applied: you save ₹40.00' });
  assert.deepEqual(couponSummary({ coupon: { code: 'SHIP', type: 'free_delivery', discount: 0, deliveryWaived: 20 } }), { ok: true, text: 'SHIP applied: free delivery (saves ₹20.00)' });
  assert.deepEqual(couponSummary({ couponError: { code: 'MIN_ORDER_NOT_MET', message: 'Minimum order value for this coupon is ₹500' } }), { ok: false, text: 'Minimum order value for this coupon is ₹500' });

  // The bill lists the discount the server sends (src/lib/deliveryQuote.js billLines).
  assert.match(read('../src/lib/deliveryQuote.js'), /if \(bill\.discount > 0\) lines\.push\(\{ label: 'Discount'/);
});

test('[C7.16] both checkouts send the applied coupon with the quote and the order, and refuse to order with one that does not apply', () => {
  for (const file of ['../src/app/checkout/page.js', '../src/app/shops/[id]/components/CheckoutModal.js']) {
    const src = read(file);
    assert.match(src, /<CouponField /, file);
    assert.match(src, /couponCode: couponCode \|\| undefined/, file);
    assert.match(src, /bill\.couponError/, file);
    assert.match(src, /couponCode\]\);/, `${file}: the quote is asked again when the coupon changes`);
  }
});

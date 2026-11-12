/**
 * C7 in the app: the coupon at checkout (src/services/coupon.js and
 * app/modules/checkout/index.js).
 */
const fs = require('fs');
const path = require('path');
const { cleanCouponCode, withCoupon, couponSummary, couponBlocks } = require('../src/services/coupon');

test('[C7.17] the app sends the coupon, says what it saved or why it does not apply, and will not order with a refused one', () => {
  expect(cleanCouponCode(' welcome50 ')).toBe('WELCOME50');
  expect(cleanCouponCode('')).toBeNull();
  expect(withCoupon({ shopId: 's1' }, 'SAVE10')).toEqual({ shopId: 's1', couponCode: 'SAVE10' });
  expect(withCoupon({ shopId: 's1' }, null)).toEqual({ shopId: 's1' });

  expect(couponSummary({ coupon: { code: 'SAVE10', type: 'percentage', discount: 40 } })).toEqual({ ok: true, text: 'SAVE10 applied: you save ₹40.00' });
  expect(couponSummary({ coupon: { code: 'SHIP', type: 'free_delivery', deliveryWaived: 20 } }).text).toMatch(/free delivery \(saves ₹20.00\)/);
  const refused = { couponError: { code: 'FIRST_ORDER_ONLY', message: 'This coupon is valid only on your first order' } };
  expect(couponSummary(refused)).toEqual({ ok: false, text: 'This coupon is valid only on your first order' });
  expect(couponBlocks('WELCOME50', refused)).toMatch(/first order\. Remove the coupon/);
  expect(couponBlocks(null, refused)).toBeNull();
  expect(couponBlocks('SAVE10', { coupon: { code: 'SAVE10' } })).toBeNull();

  const screen = fs.readFileSync(path.join(__dirname, '../app/modules/checkout/index.js'), 'utf8');
  // The quote (single shop and multi-shop) and both ways of ordering carry it.
  expect(screen).toMatch(/const where = withCoupon\(/);
  expect((screen.match(/\}, couponCode\), \{ headers: \{ 'Idempotency-Key'/g) || []).length).toBe(2);
  expect(screen).toMatch(/couponBlocks\(couponCode, bill\)/);
  expect(screen).toMatch(/Coupon discount/);
});

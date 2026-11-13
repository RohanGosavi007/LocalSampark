/**
 * S5, S6 and S7 on Android: a seller's coupons, review replies and shop
 * figures, through the same endpoints as the web shop manager.
 */
jest.mock('../src/lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const { apiGet, apiPost, apiPatch } = require('../src/lib/api');
const tools = require('../src/services/sellerTools');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
  apiPatch.mockReset();
});

describe('[S5.3] shop-coupon: the seller\'s coupons on the phone', () => {
  test('[S5.3] a valid form becomes the request body, code upper-cased', () => {
    expect(tools.couponFromForm({ code: ' diwali10 ', discount_type: 'percentage', discount_value: '10', min_order_amount: '200', max_discount_amount: '80' }))
      .toEqual({ body: { code: 'DIWALI10', discount_type: 'percentage', discount_value: 10, min_order_amount: 200, max_discount_amount: 80 } });
  });

  test.each([
    [{ code: 'x', discount_value: '10' }, 'letters or numbers'],
    [{ code: 'OK10', discount_value: '0' }, 'more than 0'],
    [{ code: 'OK10', discount_type: 'percentage', discount_value: '150' }, 'between 1 and 100'],
    [{ code: 'OK10', discount_value: '10', min_order_amount: '-1' }, 'cannot be negative'],
  ])('[S5.3] terms nobody can honour are refused before sending: %p', async (form, message) => {
    expect(tools.couponFromForm(form).error).toContain(message);
    await expect(tools.createCoupon('shop-1', form)).rejects.toThrow(message);
    expect(apiPost).not.toHaveBeenCalled();
  });

  test('[S5.3] create, list and switch off go to the shop\'s own coupon endpoints', async () => {
    apiGet.mockResolvedValueOnce({ shop: { id: 'shop-1' } });
    expect(await tools.myShopId()).toBe('shop-1');

    apiPost.mockResolvedValueOnce({ data: { id: 'c1', code: 'OK10' } });
    await tools.createCoupon('shop-1', { code: 'ok10', discount_type: 'fixed', discount_value: '50' });
    expect(apiPost).toHaveBeenCalledWith('/shops/shop-1/coupons', { code: 'OK10', discount_type: 'fixed', discount_value: 50, min_order_amount: 0 });

    apiPatch.mockResolvedValueOnce({ data: { id: 'c1', is_active: false } });
    await tools.setCouponActive('shop-1', 'c1', false);
    expect(apiPatch).toHaveBeenCalledWith('/shops/shop-1/coupons/c1', { is_active: false });

    expect(tools.couponSummary({ discount_type: 'percentage', discount_value: 10, min_order_amount: 200 })).toBe('10% off on orders over ₹200');
    expect(tools.isCouponActive({ is_active: 0 })).toBe(false);
    expect(tools.isCouponActive({ is_active: '1' })).toBe(true);
  });

  test('[S5.3] a seller with no shop is told so', async () => {
    apiGet.mockResolvedValueOnce({});
    await expect(tools.myShopId()).rejects.toThrow('No shop is linked');
  });

  test('[S5.3] the coupons screen is reachable from the shop dashboard and uses these', () => {
    expect(read('app/modules/merchant/ShopDashboard.js')).toContain("router.push('/modules/merchant/coupons')");
    const screen = read('app/modules/merchant/coupons.js');
    expect(screen).toContain('createCoupon(shopId, form)');
    expect(screen).toContain('setCouponActive(shopId, c.id, !isCouponActive(c))');
  });
});

describe('[S6.3] seller: reply to a review on the phone', () => {
  test('[S6.3] a reply is trimmed and posted to the review', async () => {
    apiPost.mockResolvedValueOnce({ success: true });
    await tools.replyToReview('r1', '  Thank you!  ');
    expect(apiPost).toHaveBeenCalledWith('/shops/my-shop/reviews/r1/reply', { reply: 'Thank you!' });
  });

  test.each([['', 'Write a reply first'], ['   ', 'Write a reply first'], ['x'.repeat(1001), 'under 1000']])(
    '[S6.3] an empty or overlong reply is refused before sending', async (text, message) => {
      await expect(tools.replyToReview('r1', text)).rejects.toThrow(message);
      expect(apiPost).not.toHaveBeenCalled();
    }
  );

  test('[S6.3] the server\'s refusal reaches the seller', async () => {
    apiPost.mockRejectedValueOnce(new Error('Review not found'));
    await expect(tools.replyToReview('other-shops-review', 'Hello')).rejects.toThrow('Review not found');
  });

  test('[S6.3] the reviews tab shows the reply and lets the seller write one', () => {
    const tab = read('app/(tabs)/reviews.js');
    expect(tab).toContain("reply: r.reply || ''");
    expect(tab).toContain('<ReviewReply');
    expect(read('src/components/ReviewReply.js')).toContain('replyToReview(reviewId, text)');
  });
});

describe('[S7.3] analytics: the shop\'s real figures on the phone', () => {
  test('[S7.3] the figures are the server\'s totals, and views stay unknown', async () => {
    apiGet.mockResolvedValueOnce({ success: true, analytics: { revenue: 125000, orders: 42, placedOrders: 50, conversion: '84.0', views: null } });
    const figures = await tools.loadShopFigures();
    expect(apiGet).toHaveBeenCalledWith('/shops/my-shop/analytics-data');
    const byId = Object.fromEntries(figures.map((f) => [f.id, f.value]));
    expect(byId).toEqual({ revenue: '₹1,25,000', orders: '42', conversion: '84.0%', views: '—' });
  });

  test('[S7.3] nothing loaded is nothing shown, not zeros', () => {
    expect(tools.shopFigures(null)).toEqual([]);
  });

  test('[S7.3] the figures screen is reachable from the shop dashboard', () => {
    expect(read('app/modules/merchant/ShopDashboard.js')).toContain("router.push('/modules/merchant/analytics')");
    expect(read('app/modules/merchant/analytics.js')).toContain('loadShopFigures()');
  });
});

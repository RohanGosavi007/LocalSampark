/**
 * S5, S6 and S7 on Android: a seller's coupons, review replies and shop
 * figures, through the same endpoints as the web shop manager.
 */
jest.mock('../src/lib/api', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiPut: jest.fn(),
  apiDelete: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const { apiGet, apiPost, apiPatch, apiPut, apiDelete } = require('../src/lib/api');
const tools = require('../src/services/sellerTools');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
  apiPatch.mockReset();
  apiPut.mockReset();
  apiDelete.mockReset();
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

describe('[S4.3] seller: earnings and settlements on the phone', () => {
  const LEDGER = {
    grossSales: 1000, platformCommission: 0, netPayout: 1000, settledPayouts: 600, pendingPayouts: 400,
    transactions: [
      { order_id: 'abcdef12-0000', gross_amount: 600, commission: 0, net_amount: 600, source: 'recorded' },
      { order_id: 'fedcba98-0000', gross_amount: 400, commission: 0, net_amount: 400, source: 'estimated' },
    ],
  };

  test('[S4.3] the ledger and settlement history come from the seller\'s own endpoints', async () => {
    apiGet
      .mockResolvedValueOnce({ success: true, ledger: LEDGER })
      .mockResolvedValueOnce({ success: true, payouts: [{ id: 'p1', period_start: '2026-11-01T00:00', period_end: '2026-11-07T00:00', net_payout: 600, payout_status: 'paid' }] });
    const view = await tools.loadEarnings('shop-1');
    expect(apiGet).toHaveBeenNthCalledWith(1, '/shops/my-shop/ledger');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/shops/shop-1/payouts');

    const byId = Object.fromEntries(view.figures.map((f) => [f.id, f.value]));
    expect(byId.pending).toBe('₹400.00'); // net minus what has been settled
    expect(view.settledSoFar).toBe('₹600.00');
    expect(view.payouts).toEqual([{ id: 'p1', period: '2026-11-01 – 2026-11-07', amount: '₹600.00', status: 'Paid' }]);
    expect(view.transactions[1].commission).toContain('(estimated)');
    expect(view.transactions[0].commission).not.toContain('(estimated)');
  });

  test('[S4.3] a failed ledger load is an error, not zeros', async () => {
    apiGet.mockResolvedValueOnce({ success: false });
    await expect(tools.loadEarnings('shop-1')).rejects.toThrow('could not be loaded');
  });

  test('[S4.3] the dashboard "Settlements" button opens the seller\'s earnings, not the admin revenue tab', () => {
    const dash = read('app/modules/merchant/ShopDashboard.js');
    expect(dash).toContain("router.push('/modules/merchant/earnings')");
    expect(dash).not.toContain("router.push('/(tabs)/revenue')");
    expect(read('app/modules/merchant/earnings.js')).toContain('loadEarnings(id)');
  });
});

describe('[S1.3] seller: KYC from the phone', () => {
  test('[S1.3] a valid form becomes the request, upper-cased and trimmed', () => {
    expect(tools.kycFromForm({ pan_number: ' abcde1234f ', gst_number: '', bank_account_number: '9876 5432 1012', bank_ifsc: 'hdfc0001234', bank_name: ' HDFC Bank ' }))
      .toEqual({ body: { pan_number: 'ABCDE1234F', bank_account_number: '987654321012', bank_ifsc: 'HDFC0001234', bank_name: 'HDFC Bank' } });
  });

  test.each([
    [{}, 'pan_number', 'PAN is required'],
    [{ pan_number: 'ABC123' }, 'pan_number', 'ABCDE1234F'],
    [{ pan_number: 'ABCDE1234F', gst_number: '27ABC' }, 'gst_number', '15 characters'],
    [{ pan_number: 'ABCDE1234F', bank_account_number: '987654321012' }, 'bank_ifsc', 'IFSC is needed'],
    [{ pan_number: 'ABCDE1234F', bank_account_number: '12', bank_ifsc: 'HDFC0001234' }, 'bank_account_number', '9 to 18 digits'],
  ])('[S1.3] %p is refused at the field before sending', async (form, field, message) => {
    expect(tools.kycFromForm(form).problems[field]).toContain(message);
    await expect(tools.submitKyc('shop-1', form)).rejects.toMatchObject({ problems: expect.objectContaining({ [field]: expect.stringContaining(message) }) });
    expect(apiPost).not.toHaveBeenCalled();
  });

  test('[S1.3] a valid form is posted to the shop\'s KYC, and the server\'s field problems reach the screen', async () => {
    apiPost.mockResolvedValueOnce({ success: true, status: 'submitted' });
    await tools.submitKyc('shop-1', { pan_number: 'ABCDE1234F' });
    expect(apiPost).toHaveBeenCalledWith('/shops/shop-1/kyc', { pan_number: 'ABCDE1234F' });

    const refused = Object.assign(new Error('These KYC details need fixing.'), { data: { problems: [{ field: 'pan_number', message: 'PAN is required.' }] } });
    apiPost.mockRejectedValueOnce(refused);
    await expect(tools.submitKyc('shop-1', { pan_number: 'ABCDE1234F' })).rejects.toMatchObject({ problems: { pan_number: 'PAN is required.' } });
  });

  test('[S1.3] only a missing or sent-back KYC can be submitted again', () => {
    expect(tools.kycNeedsSubmission('not_started')).toBe(true);
    expect(tools.kycNeedsSubmission(undefined)).toBe(true);
    expect(tools.kycNeedsSubmission('rejected')).toBe(true);
    expect(tools.kycNeedsSubmission('submitted')).toBe(false);
    expect(tools.kycNeedsSubmission('verified')).toBe(false);
  });

  test('[S1.3] registering a shop leads to KYC, and the dashboard links to it', () => {
    expect(read('app/modules/register-shop/index.js')).toContain("router.replace('/modules/merchant/kyc')");
    expect(read('app/modules/merchant/ShopDashboard.js')).toContain("router.push('/modules/merchant/kyc')");
    expect(read('app/modules/merchant/kyc.js')).toContain('submitKyc(shopId, form)');
  });
});

describe('[S2.6] seller: the product list includes unlisted products', () => {
  test('[S2.6] the products screen reads the owner\'s own list, not the storefront listing that hides unlisted items', () => {
    const screen = read('app/(tabs)/products.js');
    expect(screen).toContain('shop.products');
    // The storefront listing returns only available products: a product switched
    // off disappeared from the seller's own screen and could not be switched on.
    expect(screen).not.toMatch(/apiGet\(`\/shops\/\$\{resolved\}\/products`\)/);
  });
});

describe('[S2.7] seller: product options (variants) from the phone', () => {
  test('[S2.7] a valid option becomes the request body', () => {
    expect(tools.variantFromForm({ variant_name: ' Size ', variant_value: 'Large', price_modifier: '20', inventory_count: '5' }, 100))
      .toEqual({ body: { variant_name: 'Size', variant_value: 'Large', price_modifier: 20, inventory_count: 5 } });
    expect(tools.variantFromForm({ variant_name: 'Pack', variant_value: '1 kg' }, 100).body).toMatchObject({ price_modifier: 0, inventory_count: 0 });
  });

  test.each([
    [{ variant_value: 'L' }, 'variant_name'],
    [{ variant_name: 'Size' }, 'variant_value'],
    [{ variant_name: 'Size', variant_value: 'L', price_modifier: 'abc' }, 'price_modifier'],
    [{ variant_name: 'Size', variant_value: 'L', price_modifier: '-150' }, 'price_modifier'],
    [{ variant_name: 'Size', variant_value: 'L', inventory_count: '-3' }, 'inventory_count'],
    [{ variant_name: 'Size', variant_value: 'L', inventory_count: '2.5' }, 'inventory_count'],
  ])('[S2.7] %p is refused at the field and nothing is sent', async (form, field) => {
    expect(tools.variantFromForm(form, 100).problems).toHaveProperty(field);
    await expect(tools.addVariant('shop-1', 'prod-1', 100, form)).rejects.toMatchObject({ problems: expect.objectContaining({ [field]: expect.any(String) }) });
    expect(apiPost).not.toHaveBeenCalled();
  });

  test('[S2.7] options are listed, added, restocked and removed through the product\'s own endpoints', async () => {
    apiGet.mockResolvedValueOnce({ success: true, variants: [{ id: 'v1', variant_name: 'Size', variant_value: 'Large', price_modifier: '20.00', inventory_count: 5 }] });
    expect(await tools.listVariants('shop-1', 'prod-1')).toEqual([{ id: 'v1', label: 'Size: Large', priceModifier: 20, stock: 5 }]);
    expect(apiGet).toHaveBeenCalledWith('/shops/shop-1/products/prod-1/variants');

    apiPost.mockResolvedValueOnce({ variant: { id: 'v2' } });
    await tools.addVariant('shop-1', 'prod-1', 100, { variant_name: 'Size', variant_value: 'Small', price_modifier: '-10', inventory_count: '3' });
    expect(apiPost).toHaveBeenCalledWith('/shops/shop-1/products/prod-1/variants', { variant_name: 'Size', variant_value: 'Small', price_modifier: -10, inventory_count: 3 });

    apiPut.mockResolvedValueOnce({ variant: { id: 'v1' } });
    await tools.updateVariantStock('shop-1', 'prod-1', 'v1', '9');
    expect(apiPut).toHaveBeenCalledWith('/shops/shop-1/products/prod-1/variants/v1', { inventory_count: 9 });
    await expect(tools.updateVariantStock('shop-1', 'prod-1', 'v1', '-1')).rejects.toThrow('whole number');

    apiDelete.mockResolvedValueOnce({ success: true });
    await tools.removeVariant('shop-1', 'prod-1', 'v1');
    expect(apiDelete).toHaveBeenCalledWith('/shops/shop-1/products/prod-1/variants/v1');
  });

  test('[S2.7] the server\'s field problems reach the screen', async () => {
    const refused = Object.assign(new Error('bad'), { data: { problems: [{ field: 'price_modifier', message: 'Too low.' }] } });
    apiPost.mockRejectedValueOnce(refused);
    await expect(tools.addVariant('shop-1', 'prod-1', 100, { variant_name: 'Size', variant_value: 'L' })).rejects.toMatchObject({ problems: { price_modifier: 'Too low.' } });
  });

  test('[S2.7] price labels read plainly', () => {
    expect(tools.variantPriceLabel(0)).toBe('Same price');
    expect(tools.variantPriceLabel(20)).toBe('+₹20');
    expect(tools.variantPriceLabel(-10)).toBe('-₹10');
  });

  test('[S2.7] the products tab opens the options screen, which uses these', () => {
    expect(read('app/(tabs)/products.js')).toContain("pathname: '/modules/merchant/variants'");
    expect(read('app/modules/merchant/variants.js')).toContain('addVariant(shopId, productId, price, form)');
  });
});

describe('[S3.6] seller: order steps follow the pipeline, with a packing slip', () => {
  const order = (status, type = 'Pickup', hasRider = false) => ({ status, type, hasRider });
  const labels = (o) => tools.orderActions(o).actions.map((a) => `${a.label}→${a.status}`);

  test('[S3.6] a new order is accepted or declined; an accepted one is prepared (never straight to ready)', () => {
    expect(labels(order('pending'))).toEqual(['Decline→cancelled', 'Accept→confirmed']);
    expect(labels(order('confirmed'))).toEqual(['Start preparing→preparing']);
    expect(labels(order('preparing'))).toEqual(['Mark ready→ready']);
  });

  test('[S3.6] a ready pickup order is handed over, never sent out for delivery', () => {
    expect(labels(order('ready', 'Pickup'))).toEqual(['Handed over→delivered']);
  });

  test('[S3.6] a ready delivery order can go out with the shop\'s own delivery, unless a delivery partner has it', () => {
    expect(labels(order('ready', 'Delivery'))).toEqual(['Out for delivery→out_for_delivery']);
    expect(tools.orderActions(order('ready', 'Delivery', true))).toEqual({ actions: [], note: 'A delivery partner is handling this order.' });
    expect(tools.orderActions(order('assigned', 'Delivery')).actions).toEqual([]);
  });

  test('[S3.6] a shop delivering itself can complete the order; one a partner is delivering cannot', () => {
    expect(labels(order('dispatched', 'Delivery'))).toEqual(['Mark delivered→delivered']);
    expect(labels(order('out_for_delivery', 'Delivery'))).toEqual(['Mark delivered→delivered']);
    expect(tools.orderActions(order('dispatched', 'Delivery', true)).actions).toEqual([]);
  });

  test('[S3.6] finished and unknown orders offer nothing', () => {
    for (const s of ['delivered', 'cancelled', 'returned', 'mystery', '']) expect(tools.orderActions(order(s)).actions).toEqual([]);
  });

  test('[S3.6] every action the screen can offer is a step the pipeline allows', () => {
    // The server's table (orderLifecycle.TRANSITIONS), restated: an action not in it is refused.
    const T = { pending: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'], ready: ['out_for_delivery', 'delivered', 'cancelled'], assigned: ['out_for_delivery', 'delivered', 'cancelled'], out_for_delivery: ['delivered', 'cancelled'] };
    const board = { dispatched: 'out_for_delivery' };
    for (const status of ['pending', 'confirmed', 'preparing', 'ready', 'dispatched']) {
      for (const type of ['Pickup', 'Delivery']) {
        for (const a of tools.orderActions(order(status, type)).actions) {
          expect(T[board[status] || status]).toContain(a.status);
        }
      }
    }
  });

  test('[S3.6] the slip is offered for an order being made up, and is fetched as text', async () => {
    expect(['confirmed', 'preparing', 'ready'].every(tools.canPrintSlip)).toBe(true);
    expect(['pending', 'delivered', 'cancelled'].some(tools.canPrintSlip)).toBe(false);

    apiGet.mockResolvedValueOnce({ success: true, slipText: 'LOCAL SAMPARK KITCHEN\nPACKING SLIP' });
    expect(await tools.loadPackingSlip('o1')).toBe('LOCAL SAMPARK KITCHEN\nPACKING SLIP');
    expect(apiGet).toHaveBeenCalledWith('/orders/o1/packing-slip?format=json');
    apiGet.mockResolvedValueOnce({ success: true });
    await expect(tools.loadPackingSlip('o1')).rejects.toThrow('could not be loaded');
  });

  test('[S3.6] the orders screen renders from these rules and carries whether a partner has the order', () => {
    const screen = read('app/(tabs)/orders.js');
    expect(screen).toContain('orderActions(order)');
    expect(screen).toContain('hasRider: Boolean(o.assigned_agent_id)');
    expect(screen).toContain('loadPackingSlip(order.id)');
    // The old per-tab buttons that offered refused steps are gone.
    expect(screen).not.toContain('label="Dispatch"');
    expect(screen).not.toMatch(/label="Mark Ready"[^\n]*status="ready"/);
  });
});

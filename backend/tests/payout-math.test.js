/**
 * Settlement arithmetic for one order.
 *
 * services/payout.service.js settleOrder() is pure: an order row, the
 * commission terms fixed on it, and the platform settings in; what the shop
 * earns, what the platform takes, and who was holding the money, out. The
 * payout for a period is the sum of these lines (less TDS and any dues
 * carried forward), which src/__tests__/services/shopPayouts.test.js runs
 * against the real tables.
 *
 * These assert on the money, case by case, for each place the customer's
 * money can be when the order is delivered.
 */
const { settleOrder, collectedBy } = require('../src/services/payout.service');

const CONFIG = { gst_on_commission_percent: 18, gateway_fee_percent: 2 };
const FIVE = { percent: 5, convenienceFee: 0 };

/** An order as it is stored: ₹500 of items, delivered by a platform rider. */
const order = (overrides = {}) => ({
  id: 'o1',
  subtotal: 500,
  total_amount: 545, // + ₹40 delivery + ₹5 platform fee
  delivery_fee: 40,
  platform_fee: 5,
  small_order_fee: 0,
  discount: 0,
  payment_method: 'razorpay',
  cash_collected_by: null,
  assigned_agent_id: 'rider-1',
  fulfillment_method: 'delivery',
  ...overrides,
});

describe('who was holding the money', () => {
  it('the platform, for an order paid online or from the wallet', () => {
    expect(collectedBy(order({ payment_method: 'razorpay' }))).toBe('platform');
    expect(collectedBy(order({ payment_method: 'wallet' }))).toBe('platform');
  });

  it('the rider or the shop for cash, as recorded at delivery', () => {
    expect(collectedBy(order({ payment_method: 'cod', cash_collected_by: 'rider' }))).toBe('rider');
    expect(collectedBy(order({ payment_method: 'cod', cash_collected_by: 'shop' }))).toBe('shop');
  });

  it('for a cash order from before collection was recorded: the rider if there was one, else the shop', () => {
    expect(collectedBy(order({ payment_method: 'cod' }))).toBe('rider');
    expect(collectedBy(order({ payment_method: 'cod', assigned_agent_id: null }))).toBe('shop');
  });
});

describe('an order paid online, delivered by a platform rider', () => {
  const line = settleOrder(order(), FIVE, CONFIG);

  it('charges commission on the items only — not on the delivery charge or the platform fee', () => {
    expect(line.items).toBe(500);
    expect(line.commissionAmount).toBe(25);
  });

  it('keeps the delivery charge for the platform, which pays the rider from it', () => {
    expect(line.sales).toBe(500);
    expect(line.shopDelivered).toBe(false);
  });

  it('adds GST on the commission and the gateway cost on the shop\'s share', () => {
    expect(line.gst).toBe(4.5);
    expect(line.gatewayFee).toBe(10);
  });

  it('owes the shop the rest', () => {
    expect(line.collectedBy).toBe('platform');
    expect(line.shopHolds).toBe(0);
    expect(line.net).toBe(500 - 25 - 4.5 - 10);
  });
});

describe('a wallet order', () => {
  it('has no gateway cost: the money never went through the gateway', () => {
    const line = settleOrder(order({ payment_method: 'wallet' }), FIVE, CONFIG);
    expect(line.gatewayFee).toBe(0);
    expect(line.net).toBe(500 - 25 - 4.5);
  });
});

describe('cash collected by a platform rider', () => {
  it('is settled exactly like a prepaid order: the platform owes the shop', () => {
    const line = settleOrder(order({ payment_method: 'cod', cash_collected_by: 'rider' }), FIVE, CONFIG);
    expect(line.collectedBy).toBe('rider');
    expect(line.gatewayFee).toBe(0);
    expect(line.net).toBe(500 - 25 - 4.5);
  });
});

describe('cash collected by the shop', () => {
  it('at the counter: the shop holds everything and owes commission, GST and the platform fee', () => {
    const pickup = order({
      payment_method: 'cod', cash_collected_by: 'shop', assigned_agent_id: null,
      fulfillment_method: 'pickup', delivery_fee: 0, total_amount: 505,
    });
    const line = settleOrder(pickup, FIVE, CONFIG);

    expect(line.shopHolds).toBe(505);
    expect(line.platformFeesHeldByShop).toBe(5);
    expect(line.net).toBe(-(25 + 4.5 + 5));
  });

  it('on its own delivery: the delivery charge is the shop\'s, so only commission, GST and the platform fee are owed', () => {
    const selfDelivered = order({ payment_method: 'cod', cash_collected_by: 'shop', assigned_agent_id: null });
    const line = settleOrder(selfDelivered, FIVE, CONFIG);

    expect(line.shopDelivered).toBe(true);
    expect(line.sales).toBe(540);
    expect(line.net).toBe(-(25 + 4.5 + 5));
  });
});

describe('a prepaid order the shop delivered itself', () => {
  it('passes the delivery charge to the shop, with the gateway cost on it', () => {
    const line = settleOrder(order({ assigned_agent_id: null }), FIVE, CONFIG);
    expect(line.sales).toBe(540);
    expect(line.gatewayFee).toBe(10.8);
    expect(line.net).toBe(540 - 25 - 4.5 - 10.8);
  });
});

describe('commission terms', () => {
  it('adds the per-order fee to the percentage, and charges GST on both', () => {
    const line = settleOrder(order({ payment_method: 'wallet' }), { percent: 10, convenienceFee: 3 }, CONFIG);
    expect(line.commissionAmount).toBe(53);
    expect(line.gst).toBe(9.54);
  });

  it('charges nothing at 0%', () => {
    const line = settleOrder(order({ payment_method: 'wallet' }), { percent: 0, convenienceFee: 0 }, CONFIG);
    expect(line.commissionAmount).toBe(0);
    expect(line.net).toBe(500);
  });
});

describe('orders placed before the item total was recorded', () => {
  it('take the items to be the total less the charges, a platform discount added back', () => {
    const legacy = order({ subtotal: null, total_amount: 525, discount: 20, payment_method: 'wallet' });
    expect(settleOrder(legacy, FIVE, CONFIG).items).toBe(500);
  });

  it('treat missing charges as zero rather than NaN', () => {
    const legacy = { id: 'o2', total_amount: '300', payment_method: 'wallet', assigned_agent_id: 'r' };
    const line = settleOrder(legacy, FIVE, CONFIG);
    for (const value of Object.values(line)) {
      if (typeof value === 'number') expect(Number.isNaN(value)).toBe(false);
    }
    expect(line.items).toBe(300);
  });
});

describe('money safety', () => {
  it('rounds every amount to paise', () => {
    const line = settleOrder(order({ subtotal: 333.33, payment_method: 'razorpay' }), { percent: 7.5, convenienceFee: 0 }, CONFIG);
    for (const key of ['commissionAmount', 'gst', 'gatewayFee', 'net', 'sales']) {
      expect(Math.round(line[key] * 100) / 100).toBe(line[key]);
    }
  });
});

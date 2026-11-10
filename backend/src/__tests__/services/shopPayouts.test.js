/**
 * Shop settlement, against the real tables.
 *
 * Which orders are settled in which period, that none is settled twice, and
 * that cash the shop took itself is netted against what the platform owes it
 * — with a period that comes out owing carried into the next.
 *
 * The per-order arithmetic is tested case by case in tests/payout-math.test.js.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const PayoutService = require('../../services/payout.service');

const OWNER = fx('spo-owner');
const BUYER = fx('spo-buyer');
const SHOP = fx('spo-shop');
const DAY = '2026-09-10';
const START = `${DAY}T00:00:00.000Z`;
const END = '2026-09-11T00:00:00.000Z';
const NEXT_END = '2026-09-12T00:00:00.000Z';

async function cleanup() {
  await query(`DELETE FROM payout_line_items WHERE CAST(order_id AS TEXT) LIKE '${fxLike('spo')}'`);
  await query(`DELETE FROM shop_payouts WHERE shop_id = '${fx('spo-shop')}'`);
  await query(`DELETE FROM shop_commissions WHERE shop_id = '${fx('spo-shop')}'`);
  await query(`DELETE FROM orders WHERE CAST(id AS TEXT) LIKE '${fxLike('spo')}'`);
  await query(`DELETE FROM local_shops WHERE id = '${fx('spo-shop')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('spo')}'`);
}

/**
 * An order of `items` rupees with a ₹5 platform fee. Delivered by a platform
 * rider unless `rider: null`; collected at the counter when `pickup`.
 */
async function order(id, {
  items, method, paid = true, status = 'delivered', collectedBy = null, rider = fx('spo-rider'), pickup = false,
  deliveredAt = `${DAY}T12:00:00.000Z`, createdAt = `${DAY}T10:00:00.000Z`, commission = null,
}) {
  const deliveryFee = pickup ? 0 : 30;
  await query(
    `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, platform_fee, payment_method, payment_status,
                         order_status, delivered_at, created_at, assigned_agent_id, fulfillment_method, cash_collected_by, commission_percent)
     VALUES ($1, $2, $3, $4, $5, $6, 5, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [id, BUYER, SHOP, items, items + deliveryFee + 5, deliveryFee, method, paid ? 'paid' : 'pending', status,
      status === 'delivered' ? deliveredAt : null, createdAt, pickup ? null : rider, pickup ? 'pickup' : 'delivery', collectedBy, commission]
  );
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'SPO Owner', '9811600001', 'shop_owner')", [OWNER]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'SPO Buyer', '9811600002', 'user')", [BUYER]);
  await query(`INSERT INTO users (id, full_name, phone_number, role) VALUES ('${fx('spo-rider')}', 'SPO Rider', '9811600003', 'delivery_agent')`);
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, commission_override_percent)
     VALUES ($1, $2, 'SPO Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87, 10)`,
    [SHOP, OWNER]
  );

  // Day one.
  await order(fx('spo-online'), { items: 1000, method: 'razorpay' });
  await order(fx('spo-wallet'), { items: 500, method: 'wallet', commission: 5 });
  // Cash a platform rider collected: the platform holds it, as for a prepaid order.
  await order(fx('spo-rider-cash'), { items: 200, method: 'cod', collectedBy: 'rider' });
  // Cash the customer has not paid yet.
  await order(fx('spo-unpaid-cash'), { items: 800, method: 'cod', paid: false });
  // Paid, but not delivered yet.
  await order(fx('spo-undelivered'), { items: 300, method: 'razorpay', status: 'assigned' });
  // Placed the day before, delivered on the day.
  await order(fx('spo-overnight'), { items: 100, method: 'wallet', createdAt: '2026-09-09T23:50:00.000Z' });

  // Day two: a counter sale in cash, and nothing else.
  await order(fx('spo-counter'), { items: 400, method: 'cod', collectedBy: 'shop', pickup: true, deliveredAt: '2026-09-11T09:00:00.000Z' });
});

afterAll(cleanup);

test('a payout covers what was delivered and paid in the period, at each order\'s own rate', async () => {
  const payouts = (await PayoutService.calculatePayouts(START, END)).filter(Boolean);
  const mine = payouts.find((p) => p.shopId === SHOP);

  expect(mine).toBeDefined();
  expect(mine.status).toBe('calculated');
  expect(mine.totalOrders).toBe(4);
  // Items only: 1000 + 500 + 200 + 100. The riders' delivery charges are the platform's.
  expect(mine.grossGMV).toBe(1800);
  // 10% on three orders (no rate recorded: the shop's own), 5% on the one placed at 5%.
  expect(mine.platformCommission).toBe(100 + 25 + 20 + 10);
  expect(mine.gstOnCommission).toBe(27.9);
  // 2% on the one Razorpay order.
  expect(mine.paymentGatewayFee).toBe(20);
  // 0.1% of the items (s.194-O).
  expect(mine.tdsDeducted).toBe(1.8);
  expect(mine.shopCollected).toBe(0);
  expect(mine.netPayout).toBe(1800 - 155 - 27.9 - 20 - 1.8);

  const lines = await queryMany(
    'SELECT order_id, collected_by FROM payout_line_items WHERE payout_id = $1 ORDER BY order_id', [mine.payoutId]
  );
  // Expected rows in the query's own order (order_id).
  expect(lines).toEqual([
    { order_id: fx('spo-online'), collected_by: 'platform' },
    { order_id: fx('spo-overnight'), collected_by: 'platform' },
    { order_id: fx('spo-rider-cash'), collected_by: 'rider' },
    { order_id: fx('spo-wallet'), collected_by: 'platform' },
  ].sort((a, b) => (a.order_id < b.order_id ? -1 : a.order_id > b.order_id ? 1 : 0)));
});

test('running it again counts nothing twice', async () => {
  const again = (await PayoutService.calculatePayouts(START, END)).filter(Boolean);
  expect(again.find((p) => p.shopId === SHOP)).toBeUndefined();
  expect(await queryMany(`SELECT id FROM shop_payouts WHERE shop_id = '${fx('spo-shop')}'`)).toHaveLength(1);
});

test('a period in which the shop took the cash comes out owing, and is carried forward', async () => {
  const next = (await PayoutService.calculatePayouts(END, NEXT_END)).filter(Boolean);
  const mine = next.find((p) => p.shopId === SHOP);

  // ₹405 taken at the counter: ₹400 of items and the ₹5 platform fee. The shop
  // owes 10% commission (₹40), GST on it (₹7.20), the platform fee and TDS.
  expect(mine.shopCollected).toBe(405);
  expect(mine.platformFeesDue).toBe(5);
  expect(mine.netPayout).toBe(-(40 + 7.2 + 5 + 0.4));
  expect(mine.status).toBe('dues');

  // Unpaid cash and undelivered orders are in no payout at all.
  const settled = (await queryMany(`SELECT order_id FROM payout_line_items WHERE CAST(order_id AS TEXT) LIKE '${fxLike('spo')}'`)).map((l) => l.order_id);
  expect(settled).not.toContain(fx('spo-unpaid-cash'));
  expect(settled).not.toContain(fx('spo-undelivered'));

  // Dues are not something to approve and send.
  await expect(PayoutService.approvePayout(mine.payoutId, fx('spo-admin'))).rejects.toThrow(/dues/);

  // The next payout deducts them, once.
  await order(fx('spo-later'), { items: 1000, method: 'wallet', deliveredAt: '2026-09-12T10:00:00.000Z' });
  const later = (await PayoutService.calculatePayouts(NEXT_END, '2026-09-13T00:00:00.000Z')).filter(Boolean).find((p) => p.shopId === SHOP);
  expect(later.carriedDues).toBe(52.6);
  expect(later.netPayout).toBe(1000 - 100 - 18 - 1 - 52.6);
  expect(later.status).toBe('calculated');
  expect((await queryOne('SELECT absorbed_into FROM shop_payouts WHERE id = $1', [mine.payoutId])).absorbed_into).toBe(later.payoutId);
});

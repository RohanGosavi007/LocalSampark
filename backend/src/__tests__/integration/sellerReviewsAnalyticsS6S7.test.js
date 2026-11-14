/**
 * S6 Seller Review Management and S7 Seller Business Analytics — API proof.
 *
 * S6: the reply route said "Reply added successfully" for a review of another
 *     shop, a review that did not exist, and an empty reply (which blanked the
 *     existing one).
 * S7: both analytics routes read tables checkout never writes (shop_orders,
 *     universal_orders), so every seller saw ₹0 and 0 orders.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { pointSql } = require('../../utils/sqlPoint');
const shopRouter = require('../../modules/ecommerce/routes/shop.routes');

const OWNER_A = fx('s67-owner-a');
const OWNER_B = fx('s67-owner-b');
const BUYER_1 = fx('s67-buyer-1');
const BUYER_2 = fx('s67-buyer-2');
const SHOP_A = fx('s67-shop-a');
const SHOP_B = fx('s67-shop-b');
const REVIEW_A = fx('s67-review-a');
const REVIEW_B = fx('s67-review-b');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM shop_payouts WHERE CAST(id AS TEXT) LIKE '${fxLike('s67')}'`);
  await query(`DELETE FROM shop_commissions WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('s67')}'`);
  await query(`DELETE FROM order_items WHERE CAST(order_id AS TEXT) LIKE '${fxLike('s67')}'`);
  await query(`DELETE FROM orders WHERE CAST(id AS TEXT) LIKE '${fxLike('s67')}'`);
  await query(`DELETE FROM shop_reviews WHERE CAST(id AS TEXT) LIKE '${fxLike('s67')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('s67')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('s67')}'`);
}

async function order(id, shopId, status, total, items = []) {
  await query(
    `INSERT INTO orders (id, user_id, shop_id, total_amount, subtotal, delivery_fee, status, order_status, payment_method, payment_status, fulfillment_method)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7, 'COD', 'unpaid', 'delivery')`,
    // One parameter per column: PostgreSQL refuses a parameter reused for
    // columns of different types ("inconsistent types deduced").
    [id, BUYER_1, shopId, total, total, status, status]
  );
  for (const [n, [name, price, quantity]] of items.entries()) {
    await query(
      'INSERT INTO order_items (id, order_id, product_id, name, price, quantity) VALUES ($1, $2, NULL, $3, $4, $5)',
      [fx(`s67-item-${id.slice(-6)}-${n}`), id, name, price, quantity]
    );
  }
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/shops', shopRouter);

  await cleanup();
  for (const [id, name, phone, role] of [
    [OWNER_A, 'S67 Owner A', '9833667001', 'shop_owner'],
    [OWNER_B, 'S67 Owner B', '9833667002', 'shop_owner'],
    [BUYER_1, 'S67 Buyer 1', '9833667003', 'user'],
    [BUYER_2, 'S67 Buyer 2', '9833667004', 'user'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, role]);
  }
  for (const [id, owner, name] of [[SHOP_A, OWNER_A, 'S67 Shop A'], [SHOP_B, OWNER_B, 'S67 Shop B']]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, is_active, is_verified, latitude, longitude, coordinate)
       VALUES ($1, $2, $3, 'grocery', 'S67 Road', true, true, 18.53, 73.87, ${pointSql(18.53, 73.87)})`,
      [id, owner, name]
    );
  }
  for (const [id, shop, user, text] of [[REVIEW_A, SHOP_A, BUYER_1, 'Fresh vegetables'], [REVIEW_B, SHOP_B, BUYER_2, 'Slow delivery']]) {
    await query(
      `INSERT INTO shop_reviews (id, shop_id, user_id, rating, review_text, is_society_verified, status)
       VALUES ($1, $2, $3, 4, $4, 1, 'Published')`,
      [id, shop, user, text]
    );
  }

  // Shop A: two delivered (₹300 + ₹200), one pending (₹100), one cancelled (₹400).
  await order(fx('s67-order-1'), SHOP_A, 'delivered', 300, [['Rice 5kg', 150, 2]]);
  await order(fx('s67-order-2'), SHOP_A, 'delivered', 200, [['Dal 1kg', 100, 2]]);
  await order(fx('s67-order-3'), SHOP_A, 'pending', 100, [['Rice 5kg', 100, 1]]);
  await order(fx('s67-order-4'), SHOP_A, 'cancelled', 400, [['Ghee', 400, 1]]);
  // Shop B's order must never appear in A's numbers.
  await order(fx('s67-order-5'), SHOP_B, 'delivered', 999);
});

afterAll(cleanup);

describe('[S6.1] seller: reply to verified review', () => {
  const reply = (shopOwner, reviewId, body) => request(app)
    .post(`/shops/my-shop/reviews/${reviewId}/reply`).set(as(shopOwner)).send(body);

  test('[S6.1] the owner replies to a verified review of their shop and customers see it', async () => {
    const res = await reply(OWNER_A, REVIEW_A, { reply: '  Thank you — see you again!  ' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Thank you — see you again!');

    const listed = await request(app).get(`/shops/${SHOP_A}/reviews`);
    const mine = (listed.body.reviews || listed.body.data || []).find((r) => r.id === REVIEW_A);
    expect(mine).toBeTruthy();
    expect(mine.reply).toBe('Thank you — see you again!');
    expect(Number(mine.verified)).toBe(1);
  });

  test('[S6.1] a reply to another shop\'s review is a 404 and changes nothing', async () => {
    const res = await reply(OWNER_A, REVIEW_B, { reply: 'Not my shop' });
    expect(res.status).toBe(404);
    const row = await queryOne('SELECT reply FROM shop_reviews WHERE id = $1', [REVIEW_B]);
    expect(row.reply == null || row.reply === '').toBe(true);
  });

  test('[S6.1] a review that does not exist is a 404', async () => {
    const res = await reply(OWNER_A, fx('s67-review-none'), { reply: 'Hello' });
    expect(res.status).toBe(404);
  });

  test('[S6.1] an empty or overlong reply is refused and the existing reply is kept', async () => {
    expect((await reply(OWNER_A, REVIEW_A, { reply: '   ' })).status).toBe(400);
    expect((await reply(OWNER_A, REVIEW_A, {})).status).toBe(400);
    expect((await reply(OWNER_A, REVIEW_A, { reply: 'x'.repeat(1001) })).status).toBe(400);
    const row = await queryOne('SELECT reply FROM shop_reviews WHERE id = $1', [REVIEW_A]);
    expect(row.reply).toBe('Thank you — see you again!');
  });

  test('[S6.1] a customer without a shop, and a signed-out visitor, cannot reply', async () => {
    const customer = await reply(BUYER_1, REVIEW_A, { reply: 'I am not the owner' });
    expect(customer.status).toBeGreaterThanOrEqual(400);
    const anon = await request(app).post(`/shops/my-shop/reviews/${REVIEW_A}/reply`).send({ reply: 'anon' });
    expect(anon.status).toBe(401);
    const row = await queryOne('SELECT reply FROM shop_reviews WHERE id = $1', [REVIEW_A]);
    expect(row.reply).toBe('Thank you — see you again!');
  });
});

describe('[S7.1] analytics: real database aggregation metrics', () => {
  test('[S7.1] the dashboard totals come from the shop\'s real orders', async () => {
    const res = await request(app).get('/shops/my-shop/analytics-data').set(as(OWNER_A));
    expect(res.status).toBe(200);
    expect(res.body.analytics).toMatchObject({
      revenue: 500, // delivered only: 300 + 200
      orders: 2,
      placedOrders: 4,
      cancelledOrders: 1,
      conversion: '50.0', // 2 of 4 placed were delivered
    });
  });

  test('[S7.1] store views are reported as unknown, not as zero', async () => {
    const res = await request(app).get('/shops/my-shop/analytics-data').set(as(OWNER_A));
    expect(res.body.analytics.views).toBeNull();
  });

  test('[S7.1] another shop\'s orders never appear in these numbers', async () => {
    const res = await request(app).get('/shops/my-shop/analytics-data').set(as(OWNER_B));
    expect(res.body.analytics).toMatchObject({ revenue: 999, orders: 1, placedOrders: 1 });
  });

  test('[S7.1] the period report breaks orders down by status and ranks products, without cancelled sales', async () => {
    const res = await request(app).get('/shops/my-shop/analytics').query({ period: '30d' }).set(as(OWNER_A));
    expect(res.status).toBe(200);
    const { ordersByStatus, revenueByDay, topProducts } = res.body.analytics;

    const byStatus = Object.fromEntries(ordersByStatus.map((r) => [r.status, Number(r.count)]));
    expect(byStatus).toEqual({ delivered: 2, pending: 1, cancelled: 1 });

    const dayRevenue = revenueByDay.reduce((sum, d) => sum + Number(d.revenue), 0);
    expect(dayRevenue).toBe(600); // 300 + 200 + 100; the cancelled ₹400 is left out

    const products = Object.fromEntries(topProducts.map((p) => [p.name, Number(p.revenue)]));
    expect(products).toEqual({ 'Rice 5kg': 400, 'Dal 1kg': 200 }); // Ghee was cancelled
    expect(topProducts[0].name).toBe('Rice 5kg');
  });

  test('[S7.1] analytics need a signed-in shop owner', async () => {
    expect((await request(app).get('/shops/my-shop/analytics-data')).status).toBe(401);
  });
});

describe('[S4.5] seller: ledger from real orders, less what has been settled', () => {
  beforeAll(async () => {
    // One settlement already approved for shop A (₹200), one still being prepared (₹999, not counted).
    for (const [id, net, status] of [[fx('s67-payout-1'), 200, 'approved'], [fx('s67-payout-2'), 999, 'calculated']]) {
      await query(
        `INSERT INTO shop_payouts (id, shop_id, period_start, period_end, net_payout, payout_status)
         VALUES ($1, $2, '2026-11-01', '2026-11-07', $3, $4)`,
        [id, SHOP_A, net, status]
      );
    }
  });

  test("[S4.5] gross sales and transactions are the shop's delivered orders", async () => {
    const res = await request(app).get('/shops/my-shop/ledger').set(as(OWNER_A));
    expect(res.status).toBe(200);
    const { ledger } = res.body;
    expect(ledger.grossSales).toBe(500); // 300 + 200 delivered; pending and cancelled left out
    expect(ledger.transactions.map((t) => t.gross_amount).sort()).toEqual([200, 300]);
    expect(ledger.netPayout).toBe(ledger.grossSales - ledger.platformCommission);
  });

  test('[S4.5] awaiting settlement is net earnings less approved or paid settlements', async () => {
    const { ledger } = (await request(app).get('/shops/my-shop/ledger').set(as(OWNER_A))).body;
    expect(ledger.settledPayouts).toBe(200);
    expect(ledger.pendingPayouts).toBe(Math.max(0, ledger.netPayout - 200));
  });

  test("[S4.5] another shop's orders and settlements never appear", async () => {
    const { ledger } = (await request(app).get('/shops/my-shop/ledger').set(as(OWNER_B))).body;
    expect(ledger.grossSales).toBe(999);
    expect(ledger.settledPayouts).toBe(0);
  });

  test('[S4.5] the ledger needs a signed-in shop owner', async () => {
    expect((await request(app).get('/shops/my-shop/ledger')).status).toBe(401);
  });
});

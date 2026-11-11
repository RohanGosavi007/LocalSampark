/**
 * C8: a delivery time slot or ASAP, and what placing an order tells people.
 *
 *   - slots are one-hour windows inside the shop's opening hours, today and
 *     tomorrow, at least 45 minutes ahead (services/deliverySlots.service.js);
 *   - the quote lists them, an order can be placed for one (orders.scheduled_for,
 *     migration 139) and a time the shop does not offer is refused;
 *   - placing an order notifies the shop owner and the customer, and the
 *     customer's notification opens the order (it used to notify nobody).
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const { slotsFor, commonSlots, chosenSlot } = require('../../services/deliverySlots.service');

const BUYER = fx('c8s-buyer');
const OWNER = fx('c8s-owner');
const SHOP = fx('c8s-shop');
const SHOP_B = fx('c8s-shop-b');
const RICE = fx('c8s-rice');
const SOAP = fx('c8s-soap');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

/** An instant given as India time on a fixed day. */
const ist = (hhmm, day = 0) => new Date(Date.parse(`2026-11-11T${hhmm}:00+05:30`) + day * 86400000);

async function cleanup() {
  await query(`DELETE FROM shop_notifications WHERE CAST(recipient_id AS TEXT) LIKE '${fxLike('c8s')}'`);
  await query(`DELETE FROM shop_commissions WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c8s')}'`);
  await query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8s')}')`);
  await query(`DELETE FROM orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8s')}'`);
  await query(`DELETE FROM batch_orders WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c8s')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('c8s')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('c8s')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c8s')}'`);
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Slot Buyer', '9833444001', 'user')", [BUYER]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Slot Owner', '9833444002', 'shop_owner')", [OWNER]);
  // Open all day, so the slots offered do not depend on when the suite runs.
  for (const id of [SHOP, SHOP_B]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available, opening_hours)
       VALUES ($1, $2, 'Slot Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87, '1', '{"open":"00:00","close":"00:00"}')`,
      [id, OWNER]
    );
  }
  for (const [id, shop, price] of [[RICE, SHOP, 120], [SOAP, SHOP_B, 45]]) {
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, track_inventory)
       VALUES ($1, $2, $3, $4, 0, 0, 0)`,
      [id, shop, id, price]
    );
  }
  app = express();
  app.use(express.json());
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

describe('slots', () => {
  test('[C8.13] one-hour windows inside opening hours, at least 45 minutes ahead, today and tomorrow', () => {
    const shop = { opening_hours: '{"open":"09:00","close":"21:00"}' };
    const slots = slotsFor(shop, ist('10:20'));
    // 10:20 + 45 min = 11:05, so the first window starts at 12:00.
    expect(slots[0]).toMatchObject({ day: 'today', from: '12:00', to: '13:00', start: ist('12:00').toISOString() });
    expect(slots.filter((s) => s.day === 'today').map((s) => s.from)).toEqual(
      ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']);
    expect(slots.find((s) => s.day === 'tomorrow')).toMatchObject({ from: '09:00' });
    expect(slots.every((s) => s.from >= '09:00' && s.to <= '21:00')).toBe(true);

    // Past midnight: 18:00-02:00.
    const late = slotsFor({ opening_hours: { open: '18:00', close: '02:00' } }, ist('17:30'));
    expect(late.filter((s) => s.day === 'today').map((s) => s.from)).toEqual(['19:00', '20:00', '21:00', '22:00', '23:00']);
    expect(late.filter((s) => s.day === 'tomorrow').map((s) => s.from).slice(0, 2)).toEqual(['00:00', '01:00']);

    // No hours given: ASAP only, nothing invented.
    expect(slotsFor({ opening_hours: null }, ist('10:00'))).toEqual([]);
    expect(slotsFor({ opening_hours: 'not json' }, ist('10:00'))).toEqual([]);

    // ASAP is null; a time not on the list is refused.
    expect(chosenSlot(shop, 'asap', ist('10:20'))).toBeNull();
    expect(chosenSlot(shop, undefined, ist('10:20'))).toBeNull();
    expect(chosenSlot(shop, ist('12:00').toISOString(), ist('10:20'))).toBe(ist('12:00').toISOString());
    for (const bad of [ist('11:00'), ist('22:00'), ist('12:30'), 'tomorrow-ish']) {
      expect(() => chosenSlot(shop, bad instanceof Date ? bad.toISOString() : bad, ist('10:20'))).toThrow(/available|Choose/);
    }
    // Two shops: only the windows both offer.
    const both = commonSlots([shop, { opening_hours: '{"open":"15:00","close":"18:00"}' }], ist('10:20'));
    expect(both.filter((s) => s.day === 'today').map((s) => s.from)).toEqual(['15:00', '16:00', '17:00']);
  });
});

describe('placing an order for a slot', () => {
  const order = (extra) => request(app).post('/checkout').set(as(BUYER))
    .send({ shopId: SHOP, items: [{ productId: RICE, quantity: 1 }], paymentMethod: 'cod', deliveryMode: 'pickup', ...extra });

  test('[C8.14] the quote lists the slots, and an order placed for one keeps it; ASAP keeps none', async () => {
    const quote = await request(app).post('/checkout/quote')
      .send({ shopId: SHOP, items: [{ productId: RICE, quantity: 1 }], deliveryMode: 'pickup' });
    expect(quote.status).toBe(200);
    expect(quote.body.slots.length).toBeGreaterThan(0);
    const slot = quote.body.slots[2];

    const scheduled = await order({ deliverySlot: slot.start });
    expect(scheduled.status).toBe(201);
    expect(scheduled.body.order.scheduled_for).toBe(slot.start);

    const asap = await order({ deliverySlot: 'asap' });
    expect(asap.status).toBe(201);
    expect(asap.body.order.scheduled_for).toBeNull();
  });

  test('[C8.15] a time the shop does not offer is refused, and nothing is written', async () => {
    const before = (await queryMany('SELECT id FROM orders WHERE user_id = $1', [BUYER])).length;
    const offGrid = new Date(Date.now() + 3 * 3600000 + 17 * 60000).toISOString();
    for (const deliverySlot of [offGrid, new Date(Date.now() - 3600000).toISOString(), 'whenever']) {
      const res = await order({ deliverySlot });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SLOT_UNAVAILABLE');
    }
    expect((await queryMany('SELECT id FROM orders WHERE user_id = $1', [BUYER])).length).toBe(before);
  });

  test('[C8.16] a multi-shop cart offers the slots both shops share, and both orders keep the one chosen', async () => {
    const items = [{ shop_id: SHOP, product_id: RICE, quantity: 1 }, { shop_id: SHOP_B, product_id: SOAP, quantity: 1 }];
    const quote = await request(app).post('/shops/cart/batch-quote').send({ items, deliveryMode: 'pickup' });
    expect(quote.status).toBe(200);
    const slot = quote.body.slots[1];
    const placed = await request(app).post('/shops/cart/batch-checkout').set(as(BUYER))
      .send({ items, deliveryMode: 'pickup', paymentMethod: 'cod', deliverySlot: slot.start });
    expect(placed.status).toBe(200);
    const rows = await queryMany('SELECT scheduled_for FROM orders WHERE batch_id = $1', [placed.body.batch_id]);
    expect(rows.map((r) => r.scheduled_for)).toEqual([slot.start, slot.start]);
  });
});

describe('what placing an order tells people', () => {
  test('[C8.17] the shop owner and the customer are notified, and the customer\'s notification opens the order', async () => {
    const res = await request(app).post('/checkout').set(as(BUYER))
      .send({ shopId: SHOP, items: [{ productId: RICE, quantity: 2 }], paymentMethod: 'cod', deliveryMode: 'pickup' });
    expect(res.status).toBe(201);
    const orderId = res.body.order.id;

    const find = async (recipient) => (await queryMany(
      'SELECT title, body, data, action_url FROM shop_notifications WHERE recipient_id = $1', [recipient]
    )).filter((n) => String(n.data || '').includes(orderId));
    let mine = [];
    let shops = [];
    for (let i = 0; i < 50 && (!mine.length || !shops.length); i++) {
      await new Promise((r) => setTimeout(r, 50));
      mine = await find(BUYER);
      shops = await find(OWNER);
    }
    expect(shops).toHaveLength(1);
    expect(shops[0].body).toMatch(/Slot Buyer placed an order of ₹/);
    expect(mine).toHaveLength(1);
    expect(mine[0].title).toBe('Order placed');
    expect(mine[0].action_url).toBe(`/order-tracking?id=${orderId}`);
  });
});

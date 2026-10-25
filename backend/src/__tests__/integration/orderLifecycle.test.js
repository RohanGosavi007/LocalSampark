/**
 * An order from placement to delivery or cancellation, and the money that
 * moves with it.
 *
 *   - Nobody starts work on an order waiting for its online payment.
 *   - The customer may cancel until the shop starts preparing; cancelling
 *     returns the stock, and the money — to the wallet, or through Razorpay.
 *   - A rider sees only deliveries that can be made, is paid by distance, and
 *     completes a delivery only with the customer's code.
 *   - Cash taken at the door is recorded against the rider who took it, who
 *     takes no more cash orders past the limit until it is deposited.
 *   - Cash taken by the shop (at the counter, or on its own delivery) is
 *     recorded against the shop, for settlement.
 *   - An order whose online payment never comes is cancelled and its stock
 *     returned; a payment that arrives after that is refunded.
 *   - A parcel is priced from its two locations.
 */

process.env.USE_SQLITE = 'true';
process.env.RAZORPAY_KEY_ID = 'rzp_test_unitTestKey';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-key-secret';

const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const razorpay = require('../../services/razorpay.service');
const payments = require('../../services/payments.service');
const lifecycle = require('../../services/orderLifecycle.service');

const BUYER = 'olc-buyer';
const OWNER = 'olc-owner';
const RIDER = 'olc-rider';
const ADMIN = 'olc-admin';
const STRANGER = 'olc-stranger';
const SHOP = 'olc-shop';
const NEAR = { lat: 18.535, lng: 73.875 }; // 1 km: ₹20 to the customer, ₹20 to the rider

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;
let refunds;
let refundFails;

const order = (id) => queryOne('SELECT * FROM orders WHERE id = $1', [id]);
const walletOf = async (userId) => {
  const row = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
  return row ? Number(row.balance) : 0;
};
const stock = async () => Number((await queryOne("SELECT inventory_count FROM shop_products WHERE id = 'olc-rice'")).inventory_count);
const cashInHand = async () => Number((await queryOne('SELECT cash_in_hand FROM delivery_agents WHERE user_id = $1', [RIDER])).cash_in_hand);

async function cleanup() {
  await query("DELETE FROM rider_cash_ledger WHERE rider_user_id LIKE 'olc-%'");
  await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id LIKE 'olc-%')");
  await query("DELETE FROM wallets WHERE user_id LIKE 'olc-%'");
  await query("DELETE FROM payments WHERE user_id LIKE 'olc-%'");
  await query("DELETE FROM shop_commissions WHERE shop_id LIKE 'olc-%'");
  await query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id LIKE 'olc-%')");
  await query("DELETE FROM orders WHERE user_id LIKE 'olc-%'");
  await query("DELETE FROM shop_products WHERE id LIKE 'olc-%'");
  await query("DELETE FROM delivery_agents WHERE user_id LIKE 'olc-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'olc-%'");
  await query("DELETE FROM users WHERE id LIKE 'olc-%'");
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [
    [BUYER, '9844100001', 'user'], [OWNER, '9844100002', 'shop_owner'], [RIDER, '9844100003', 'delivery_agent'],
    [ADMIN, '9844100004', 'admin'], [STRANGER, '9844100005', 'user'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $1, $2, $3)', [id, phone, role]);
  }
  await query(
    "INSERT INTO delivery_agents (id, user_id, vehicle_type, kyc_status, cash_in_hand) VALUES ('olc-agent', $1, 'motorcycle', 'active', 0)",
    [RIDER]
  );
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available, is_verified)
     VALUES ($1, $2, 'OLC Shop', 'Grocery', 'Shop Road', 'POINT(73.87 18.53)', 18.53, 73.87, 1, 1)`,
    [SHOP, OWNER]
  );
  await query(
    `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, track_inventory)
     VALUES ('olc-rice', $1, 'Rice', 120, 100, 100, 1)`,
    [SHOP]
  );
  await query("INSERT INTO wallets (id, user_id, balance) VALUES ('olc-wallet', $1, 0)", [BUYER]);

  app = express();
  app.use(express.json());
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/orders', require('../../modules/ecommerce/routes/order.routes'));
  app.use('/delivery', require('../../modules/services/routes/delivery.routes'));
  app.use('/admin', require('../../modules/crm/routes/admin-pricing.routes'));
  app.use('/', require('../../modules/ecommerce/routes/unified-superapp.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

beforeEach(() => {
  refunds = [];
  refundFails = false;
  razorpay._setClientForTests({
    orders: { create: async (params) => ({ id: `order_${crypto.randomBytes(7).toString('hex')}`, ...params }) },
    payments: {
      fetch: async () => { throw new Error('not used'); },
      refund: async (paymentId, params) => {
        if (refundFails) throw new Error('gateway unavailable');
        const refund = { id: `rfnd_${crypto.randomBytes(5).toString('hex')}`, payment_id: paymentId, ...params };
        refunds.push(refund);
        return refund;
      },
    },
  });
});

afterAll(async () => {
  razorpay._setClientForTests(null);
  await cleanup();
});

/** Places an order through POST /checkout and returns the stored row. */
async function place({ method = 'cod', pickup = false, quantity = 1 } = {}) {
  const res = await request(app).post('/checkout').set(as(BUYER)).send({
    shopId: SHOP,
    items: [{ productId: 'olc-rice', quantity }],
    paymentMethod: method,
    ...(pickup ? { deliveryMode: 'pickup' } : { deliveryAddress: 'Flat 9', deliveryCoordinate: NEAR }),
  });
  expect(res.status).toBe(201);
  return res.body.order;
}

/** A Razorpay order, then its payment arriving. */
async function placePaidOnline(options = {}) {
  const placed = await place({ method: 'razorpay', ...options });
  const payment = await queryOne("SELECT * FROM payments WHERE purpose = 'order' AND order_id = $1", [placed.id]);
  await payments.settle(payment, `pay_${crypto.randomBytes(6).toString('hex')}`);
  return placed;
}

const shopMoves = (id, status) => request(app).put(`/shops/my-shop/orders/${id}/status`).set(as(OWNER)).send({ status });
const flowMoves = (who, id, status) => request(app).patch(`/orders/${id}/status`).set(as(who)).send({ status });

async function readyForRiders(id) {
  for (const status of ['confirmed', 'preparing', 'ready']) {
    const res = await shopMoves(id, status);
    expect(res.status).toBe(200);
  }
}

describe('who may move an order', () => {
  test('an order waiting for its online payment cannot be started', async () => {
    const placed = await place({ method: 'razorpay', pickup: true });
    const res = await shopMoves(placed.id, 'confirmed');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PAYMENT_PENDING');
  });

  test('a stranger can move nothing, by any route', async () => {
    const placed = await place({ pickup: true });
    expect((await flowMoves(STRANGER, placed.id, 'cancelled')).status).toBe(403);
    expect((await request(app).put(`/orders/${placed.id}/status`).set(as(STRANGER)).send({ status: 'confirmed' })).status).toBe(403);
    expect((await order(placed.id)).order_status).toBe('pending');
  });

  test('statuses are not skipped', async () => {
    const placed = await place({ pickup: true });
    const res = await shopMoves(placed.id, 'delivered');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TRANSITION');
  });

  test('marking an order delivered does not make it paid', async () => {
    // The shop-flow endpoint used to write payment_status = 'paid' on delivery,
    // whatever had been paid. An unpaid online order cannot even be started.
    const placed = await place({ method: 'razorpay', pickup: true });
    for (const status of ['confirmed', 'preparing', 'ready', 'delivered']) {
      await flowMoves(OWNER, placed.id, status);
    }
    expect(await order(placed.id)).toMatchObject({ order_status: 'pending', payment_status: 'pending' });
  });
});

describe('cancelling', () => {
  test('the customer may cancel before preparation starts: stock and wallet money come back', async () => {
    await query('UPDATE wallets SET balance = 500 WHERE user_id = $1', [BUYER]);
    const stockBefore = await stock();
    const placed = await place({ method: 'wallet', quantity: 2 });
    expect(await walletOf(BUYER)).toBe(500 - (240 + 20 + 5));
    expect(await stock()).toBe(stockBefore - 2);

    const res = await flowMoves(BUYER, placed.id, 'cancelled');

    expect(res.status).toBe(200);
    expect(res.body.refund).toBe('wallet');
    expect(await walletOf(BUYER)).toBe(500);
    expect(await stock()).toBe(stockBefore);
    expect(await order(placed.id)).toMatchObject({ order_status: 'cancelled', payment_status: 'refunded' });
    expect((await queryOne('SELECT status FROM shop_commissions WHERE order_id = $1', [placed.id])).status).toBe('refunded');

    // Not twice.
    expect((await flowMoves(BUYER, placed.id, 'cancelled')).status).toBe(400);
    expect(await walletOf(BUYER)).toBe(500);
  });

  test('once the shop is preparing it, the customer cannot cancel', async () => {
    const placed = await place();
    await shopMoves(placed.id, 'confirmed');
    await shopMoves(placed.id, 'preparing');
    const res = await flowMoves(BUYER, placed.id, 'cancelled');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TOO_LATE_TO_CANCEL');
  });

  test('an order paid online is refunded through Razorpay', async () => {
    const placed = await placePaidOnline({ pickup: true });
    await shopMoves(placed.id, 'confirmed');

    const res = await shopMoves(placed.id, 'cancelled');

    expect(res.status).toBe(200);
    expect(res.body.refund).toBe('gateway');
    expect(refunds).toHaveLength(1);
    expect(refunds[0].amount).toBe(12500);
    expect((await order(placed.id)).payment_status).toBe('refunded');
    expect((await queryOne("SELECT status FROM payments WHERE order_id = $1 AND purpose = 'order'", [placed.id])).status).toBe('refunded');
  });

  test('a refund Razorpay refuses waits as refund_pending, and an administrator can retry it', async () => {
    const placed = await placePaidOnline({ pickup: true });
    refundFails = true;
    const res = await shopMoves(placed.id, 'cancelled');
    expect(res.status).toBe(200);
    expect(res.body.refund).toBe('gateway_pending');
    expect((await order(placed.id)).payment_status).toBe('refund_pending');

    const waiting = await request(app).get('/admin/orders/refunds').set(as(ADMIN));
    expect(waiting.body.orders.map((o) => o.id)).toContain(placed.id);
    expect((await request(app).get('/admin/orders/refunds').set(as(BUYER))).status).toBe(403);

    refundFails = false;
    const retried = await request(app).post(`/admin/orders/${placed.id}/refund`).set(as(ADMIN));
    expect(retried.status).toBe(200);
    expect((await order(placed.id)).payment_status).toBe('refunded');
    // Nothing is left to refund.
    expect((await request(app).post(`/admin/orders/${placed.id}/refund`).set(as(ADMIN))).status).toBe(409);
  });
});

describe('a cash order delivered by a platform rider', () => {
  let placed;

  test('is offered to riders once ready, with the rider\'s pay and the cash to collect', async () => {
    placed = await place();
    const pickup = await place({ pickup: true });
    const unpaidOnline = await place({ method: 'razorpay' });
    await readyForRiders(placed.id);
    await readyForRiders(pickup.id);
    await query("UPDATE orders SET order_status = 'ready' WHERE id = $1", [unpaidOnline.id]);

    const res = await request(app).get('/delivery/jobs').set(as(RIDER));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((j) => j.id);
    expect(ids).toContain(String(placed.id));
    expect(ids).not.toContain(String(pickup.id));
    expect(ids).not.toContain(String(unpaidOnline.id));

    const job = res.body.data.find((j) => j.id === String(placed.id));
    expect(job).toMatchObject({ earnings: 20, cash_to_collect: 145, distance_km: 1 });
  });

  test('is completed by the rider with the customer\'s code, and nobody else', async () => {
    expect((await request(app).post(`/delivery/jobs/${placed.id}/accept`).set(as(RIDER))).status).toBe(200);

    // The shop no longer moves it, and the rider cannot skip the code.
    const byShop = await shopMoves(placed.id, 'delivered');
    expect(byShop.status).toBe(409);
    expect(byShop.body.code).toBe('RIDER_ASSIGNED');
    const byRider = await flowMoves(RIDER, placed.id, 'delivered');
    expect(byRider.status).toBe(403);
    expect(byRider.body.code).toBe('HANDOVER_CODE_REQUIRED');

    expect((await request(app).post(`/delivery/jobs/${placed.id}/status`).set(as(RIDER)).send({ status: 'out_for_delivery' })).status).toBe(200);
    const { otp_code: code } = await order(placed.id);
    const done = await request(app).post(`/delivery/jobs/${placed.id}/complete`).set(as(RIDER)).send({ otp: code });

    expect(done.status).toBe(200);
    expect(done.body.data).toEqual({ orderId: placed.id, earnings: 20, cashCollected: 145 });
  });

  test('records the cash against the rider and pays the rider by distance', async () => {
    expect(await order(placed.id)).toMatchObject({ order_status: 'delivered', payment_status: 'paid', cash_collected_by: 'rider' });
    expect(await cashInHand()).toBe(145);
    expect(await walletOf(RIDER)).toBe(20);

    const cash = await request(app).get('/delivery/cash').set(as(RIDER));
    expect(cash.body.data).toMatchObject({ cashInHand: 145, limit: 3000 });
    expect(cash.body.data.ledger[0]).toMatchObject({ order_id: String(placed.id), entry_type: 'collected', amount: 145 });
  });

  test('cash can be paid off from earnings, but not more than is held or earned', async () => {
    expect((await request(app).post('/delivery/cash/settle').set(as(RIDER)).send({ amount: 500 })).status).toBe(409);
    expect((await request(app).post('/delivery/cash/settle').set(as(RIDER)).send({ amount: 100 })).status).toBe(402);
    expect(await cashInHand()).toBe(145);

    const ok = await request(app).post('/delivery/cash/settle').set(as(RIDER)).send({ amount: 20 });
    expect(ok.status).toBe(200);
    expect(ok.body.cashInHand).toBe(125);
    expect(await walletOf(RIDER)).toBe(0);
  });

  test('an administrator records a deposit, never more than is held', async () => {
    const over = await request(app).post('/admin/delivery/agents/olc-agent/cash-deposit').set(as(ADMIN)).send({ amount: 1000 });
    expect(over.status).toBe(409);
    expect((await request(app).post('/admin/delivery/agents/olc-agent/cash-deposit').set(as(BUYER)).send({ amount: 5 })).status).toBe(403);

    const res = await request(app).post(`/admin/delivery/agents/${RIDER}/cash-deposit`).set(as(ADMIN)).send({ amount: 125, note: 'Counter' });
    expect(res.status).toBe(200);
    expect(res.body.cashInHand).toBe(0);

    const ledger = await request(app).get('/admin/delivery/agents/olc-agent/cash').set(as(ADMIN));
    expect(ledger.body.ledger.map((e) => e.entry_type)).toEqual(expect.arrayContaining(['collected', 'deposited']));
  });

  test('a rider over the cash limit takes no more cash orders, but may take prepaid ones', async () => {
    await query("UPDATE delivery_agents SET cash_in_hand = 3000 WHERE user_id = $1", [RIDER]);
    try {
      const cash = await place();
      await readyForRiders(cash.id);
      const refused = await request(app).post(`/delivery/jobs/${cash.id}/accept`).set(as(RIDER));
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('CASH_LIMIT_REACHED');

      const list = await request(app).get('/admin/delivery/cash').set(as(ADMIN));
      expect(list.body.riders.find((r) => r.userId === RIDER)).toMatchObject({ cashInHand: 3000, overLimit: true });

      await query('UPDATE wallets SET balance = 500 WHERE user_id = $1', [BUYER]);
      const prepaid = await place({ method: 'wallet' });
      await readyForRiders(prepaid.id);
      expect((await request(app).post(`/delivery/jobs/${prepaid.id}/accept`).set(as(RIDER))).status).toBe(200);
    } finally {
      await query("UPDATE delivery_agents SET cash_in_hand = 0 WHERE user_id = $1", [RIDER]);
    }
  });
});

describe('cash taken by the shop', () => {
  test('at the counter: a pickup order is handed over once ready, and the cash is the shop\'s to account for', async () => {
    const placed = await place({ pickup: true });
    await readyForRiders(placed.id);
    const res = await shopMoves(placed.id, 'delivered');

    expect(res.status).toBe(200);
    expect(res.body.cashCollected).toBe(125);
    expect(await order(placed.id)).toMatchObject({ order_status: 'delivered', payment_status: 'paid', cash_collected_by: 'shop' });
    expect((await order(placed.id)).delivered_at).not.toBeNull();
  });

  test('on its own delivery: out for delivery first, then delivered', async () => {
    const placed = await place();
    await readyForRiders(placed.id);
    expect((await shopMoves(placed.id, 'delivered')).status).toBe(400);
    expect((await shopMoves(placed.id, 'dispatched')).status).toBe(200);
    expect((await shopMoves(placed.id, 'delivered')).status).toBe(200);
    expect(await order(placed.id)).toMatchObject({ payment_status: 'paid', cash_collected_by: 'shop' });
  });
});

describe('orders whose online payment never comes', () => {
  test('are cancelled after the wait and their stock returned; a late payment is refunded', async () => {
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    // Clear out unpaid orders left by earlier tests, so the stock count below is this order's alone.
    await lifecycle.expireUnpaidOrders({ minutes: 30, now: later });
    const stockBefore = await stock();
    const placed = await place({ method: 'razorpay', quantity: 3 });
    expect(await stock()).toBe(stockBefore - 3);

    // Not yet.
    expect((await lifecycle.expireUnpaidOrders({ minutes: 30 })).cancelled).toBe(0);
    expect((await order(placed.id)).order_status).toBe('pending');

    const result = await lifecycle.expireUnpaidOrders({ minutes: 30, now: later });
    expect(result.cancelled).toBeGreaterThanOrEqual(1);
    expect((await order(placed.id)).order_status).toBe('cancelled');
    expect(await stock()).toBe(stockBefore);

    // The customer pays anyway, after the order was cancelled.
    const payment = await queryOne("SELECT * FROM payments WHERE purpose = 'order' AND order_id = $1", [placed.id]);
    await payments.settle(payment, 'pay_late');
    expect((await order(placed.id)).payment_status).toBe('refund_pending');

    const retry = await lifecycle.expireUnpaidOrders({ minutes: 30, now: later });
    expect(retry.refunded).toBeGreaterThanOrEqual(1);
    expect((await order(placed.id)).payment_status).toBe('refunded');
    expect(refunds.find((r) => r.payment_id === 'pay_late').amount).toBe(Math.round(placed.total_amount * 100));
  });
});

describe('a parcel', () => {
  const pickup = { lat: 18.53, lng: 73.87 };
  const drop = { lat: 18.56, lng: 73.89 }; // 5.1 km: ₹48

  test('is quoted from its two locations', async () => {
    const res = await request(app).post('/delivery/quote').send({ pickup, drop });
    expect(res.status).toBe(200);
    expect(res.body.bill).toMatchObject({ deliveryFee: 48, distanceKm: 5.1, riderPayout: 44.5 });
  });

  test('is charged what the distance comes to, whatever fee the request names, and goes to the riders', async () => {
    const res = await request(app).post('/delivery/request').set(as(BUYER)).send({
      pickup, drop, pickupAddress: 'Home', deliveryAddress: 'Office', packageDetails: 'Keys', deliveryFee: 1, paymentMethod: 'cod',
    });

    expect(res.status).toBe(201);
    expect(res.body.bill).toMatchObject({ deliveryFee: 48, platformFee: 5, total: 53 });
    const parcel = await order(res.body.order.id);
    expect(parcel).toMatchObject({ shop_id: null, total_amount: 53, rider_payout: 44.5, pickup_address: 'Home', order_status: 'ready' });

    const jobs = await request(app).get('/delivery/jobs').set(as(RIDER));
    expect(jobs.body.data.find((j) => j.id === String(parcel.id))).toMatchObject({ type: 'parcel', earnings: 44.5, cash_to_collect: 53 });

    // The sender can call it off until a rider takes it.
    expect((await flowMoves(BUYER, parcel.id, 'cancelled')).status).toBe(200);
  });

  test('needs both locations', async () => {
    const res = await request(app).post('/delivery/request').set(as(BUYER)).send({ pickup, pickupAddress: 'Home', deliveryAddress: 'Office' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LOCATION_REQUIRED');
  });
});

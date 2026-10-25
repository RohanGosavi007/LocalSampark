/**
 * Placing an order, and what it costs.
 *
 * Every route that orders goods from a shop — POST /checkout,
 * POST /shops/:id/orders and POST /shops/cart/batch-checkout — goes through
 * services/orderPlacement.service.js into the `orders` table, which is what the
 * shop's order queue, the rider's job list and the customer's tracking screen
 * read. The bill is worked out on the server:
 *
 *   items         from the catalogue, never from the request
 *   delivery      by distance: ₹20 for the first 2 km, ₹8 a km after that, in
 *                 half-km steps, measured as the crow flies × 1.3 for roads;
 *                 nothing beyond 10 km
 *   platform fee  ₹5 an order
 *
 * (the platform's default settings — services/platformConfig.service.js).
 *
 * POST /universal-orders is a booking paid at the shop.
 *
 * These run the real routes against the real tables. Razorpay is the stand-in
 * from razorpay.service's test hook.
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

const BUYER = 'opp-buyer';
const OWNER = 'opp-owner';
const SHOP = 'opp-shop';
const SHOP_B = 'opp-shop-b';

// The shops are at 18.53, 73.87.
const NEAR = { lat: 18.535, lng: 73.875 }; // 1 km by road: the base charge, ₹20
const MID = { lat: 18.56, lng: 73.89 };    // 5.1 km: ₹20 + 3.5 km × ₹8 = ₹48
const FAR = { lat: 19.2, lng: 74.5 };      // ~130 km: out of range

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;
let gatewayOrders;

const balance = async () => Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [BUYER])).balance);
const setBalance = (rupees) => query('UPDATE wallets SET balance = $1 WHERE user_id = $2', [rupees, BUYER]);
const coins = async () => {
  const row = await queryOne('SELECT sampark_coins_balance FROM loyalty_accounts WHERE user_id = $1', [BUYER]);
  return row ? Number(row.sampark_coins_balance) : 0;
};
const stock = async (id) => Number((await queryOne('SELECT inventory_count FROM shop_products WHERE id = $1', [id])).inventory_count);
const orderCount = async () => (await queryMany('SELECT id FROM orders WHERE user_id = $1', [BUYER])).length;

async function cleanup() {
  await query("DELETE FROM loyalty_transactions WHERE user_id LIKE 'opp-%'");
  await query("DELETE FROM loyalty_accounts WHERE user_id LIKE 'opp-%'");
  await query("DELETE FROM wallet_transactions WHERE wallet_id LIKE 'opp-%'");
  await query("DELETE FROM payments WHERE user_id LIKE 'opp-%'");
  await query("DELETE FROM shop_commissions WHERE shop_id LIKE 'opp-%'");
  await query("DELETE FROM shop_appointments WHERE shop_id LIKE 'opp-%'");
  await query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id LIKE 'opp-%')");
  await query("DELETE FROM orders WHERE user_id LIKE 'opp-%'");
  await query("DELETE FROM batch_orders WHERE user_id LIKE 'opp-%'");
  await query("DELETE FROM universal_order_items WHERE order_id IN (SELECT id FROM universal_orders WHERE user_id LIKE 'opp-%')");
  await query("DELETE FROM universal_orders WHERE user_id LIKE 'opp-%'");
  await query("DELETE FROM universal_catalog_items WHERE shop_id LIKE 'opp-%'");
  await query("DELETE FROM user_addresses WHERE user_id LIKE 'opp-%'");
  await query("DELETE FROM shop_products WHERE id LIKE 'opp-%'");
  await query("DELETE FROM wallets WHERE id LIKE 'opp-%'");
  await query("DELETE FROM local_shops WHERE id LIKE 'opp-%'");
  await query("DELETE FROM users WHERE id LIKE 'opp-%'");
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Opp Buyer', '9833777001', 'user')", [BUYER]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Opp Owner', '9833777002', 'shop_owner')", [OWNER]);
  await query("INSERT INTO wallets (id, user_id, balance) VALUES ('opp-wallet', $1, 0)", [BUYER]);
  for (const id of [SHOP, SHOP_B]) {
    await query(
      `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available)
       VALUES ($1, $2, 'Opp Shop', 'Grocery', 'Test Address', 'POINT(73.87 18.53)', 18.53, 73.87, 1)`,
      [id, OWNER]
    );
  }
  for (const [id, shop, price, inventory, tracked] of [
    ['opp-rice', SHOP, 120, 50, 1],
    ['opp-dal', SHOP, 80, 1, 1],
    ['opp-tv', SHOP, 2500, 0, 0],
    ['opp-soap', SHOP_B, 45, 0, 0],
  ]) {
    await query(
      `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, stock_quantity, track_inventory)
       VALUES ($1, $2, $3, $4, $5, $5, $6)`,
      [id, shop, id, price, inventory, tracked]
    );
  }

  app = express();
  app.use(express.json());
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/universal-orders', require('../../routes/universal-order.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

beforeEach(async () => {
  gatewayOrders = [];
  razorpay._setClientForTests({
    orders: {
      create: async (params) => {
        const order = { id: `order_${crypto.randomBytes(7).toString('hex')}`, ...params };
        gatewayOrders.push(order);
        return order;
      },
    },
    payments: { fetch: async () => { throw new Error('not used'); } },
  });
  await query("UPDATE shop_products SET inventory_count = 50, stock_quantity = 50 WHERE id = 'opp-rice'");
});

afterAll(async () => {
  razorpay._setClientForTests(null);
  await cleanup();
});

describe('POST /checkout', () => {
  const checkout = (body) => request(app).post('/checkout').set(as(BUYER)).send(body);
  const deliverNear = { deliveryAddress: 'Flat 4, Test Society', deliveryCoordinate: NEAR };

  test('needs a session', async () => {
    const res = await request(app).post('/checkout').send({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }] });
    expect(res.status).toBe(401);
  });

  test('cash on delivery: items from the catalogue, delivery by distance, stock taken, commission fixed', async () => {
    const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1, price: 1 }], paymentMethod: 'cod', ...deliverNear });

    expect(res.status).toBe(201);
    expect(res.body.bill).toMatchObject({ subtotal: 120, deliveryFee: 20, smallOrderFee: 0, platformFee: 5, total: 145, distanceKm: 1 });
    expect(res.body.bill.deliveryBreakdown).toMatchObject({ base: 20, distanceCharge: 0, surge: 0 });

    const order = await queryOne('SELECT * FROM orders WHERE id = $1', [res.body.order.id]);
    expect(order).toMatchObject({
      subtotal: 120, total_amount: 145, delivery_fee: 20, platform_fee: 5, rider_payout: 20,
      delivery_distance_km: 1, payment_method: 'cod', payment_status: 'pending', order_status: 'pending',
      fulfillment_method: 'delivery', commission_percent: 0,
    });
    expect(await stock('opp-rice')).toBe(49);

    // The terms the shop will be settled on: 0% launch commission, not of the fees.
    const terms = await queryOne('SELECT gross_amount, commission_percent, commission_amount, net_to_shop FROM shop_commissions WHERE order_id = $1', [order.id]);
    expect(terms).toEqual({ gross_amount: 120, commission_percent: 0, commission_amount: 0, net_to_shop: 120 });
  });

  test('a farther address costs more to deliver, and pays its rider more', async () => {
    const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], deliveryAddress: 'Far side', deliveryCoordinate: MID });

    expect(res.status).toBe(201);
    expect(res.body.bill).toMatchObject({ deliveryFee: 48, distanceKm: 5.1, total: 173 });
    expect(res.body.bill.deliveryBreakdown).toMatchObject({ base: 20, distanceCharge: 28 });
    const order = await queryOne('SELECT rider_payout FROM orders WHERE id = $1', [res.body.order.id]);
    // ₹20 + 3.5 km × ₹7: the rider's pay is by distance, not the customer's charge.
    expect(order.rider_payout).toBe(44.5);
  });

  test('a delivery that cannot be priced or made is refused, and nothing is written', async () => {
    const before = await orderCount();
    const line = { shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }] };

    const noLocation = await checkout({ ...line, deliveryAddress: 'Somewhere' });
    expect(noLocation.status).toBe(400);
    expect(noLocation.body.code).toBe('LOCATION_REQUIRED');

    const tooFar = await checkout({ ...line, deliveryAddress: 'Far away', deliveryCoordinate: FAR });
    expect(tooFar.status).toBe(400);
    expect(tooFar.body.code).toBe('OUT_OF_DELIVERY_RANGE');
    expect(tooFar.body.maxDistanceKm).toBe(10);

    const noAddress = await checkout({ ...line, deliveryCoordinate: NEAR });
    expect(noAddress.status).toBe(400);
    expect(noAddress.body.code).toBe('ADDRESS_REQUIRED');

    await query("UPDATE local_shops SET delivery_available = 0 WHERE id = 'opp-shop'");
    try {
      const noDelivery = await checkout({ ...line, ...deliverNear });
      expect(noDelivery.status).toBe(400);
      expect(noDelivery.body.code).toBe('DELIVERY_NOT_OFFERED');
    } finally {
      await query("UPDATE local_shops SET delivery_available = 1 WHERE id = 'opp-shop'");
    }

    expect(await orderCount()).toBe(before);
    expect(await stock('opp-rice')).toBe(50);
  });

  test('a saved address supplies the location', async () => {
    const address = await queryOne(
      `INSERT INTO user_addresses (user_id, street_address, city, state, postal_code, latitude, longitude)
       VALUES ($1, '12 Test Road', 'Pune', 'MH', '411001', $2, $3) RETURNING id`,
      [BUYER, MID.lat, MID.lng]
    );
    const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], addressId: address.id });

    expect(res.status).toBe(201);
    expect(res.body.bill.deliveryFee).toBe(48);
    expect(res.body.order.delivery_address).toContain('12 Test Road');

    // Someone else's saved address is not found.
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ('opp-other', 'Opp Other', '9833777009', 'user')");
    const theirs = await queryOne(
      `INSERT INTO user_addresses (user_id, street_address, city, state, postal_code, latitude, longitude)
       VALUES ('opp-other', 'Their Road', 'Pune', 'MH', '411001', 18.54, 73.88) RETURNING id`
    );
    const refused = await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], addressId: theirs.id });
    expect(refused.status).toBe(404);
    expect(refused.body.code).toBe('ADDRESS_NOT_FOUND');
  });

  test("the mobile app's field names are understood, and 'online' means Razorpay", async () => {
    const res = await checkout({
      shop_id: SHOP,
      items: [{ product_id: 'opp-rice', quantity: 1, price: 120 }],
      delivery_mode: 'pickup',
      total: 1,
      payment_method: 'online',
    });

    expect(res.status).toBe(201);
    expect(res.body.order.payment_method).toBe('razorpay');
    expect(res.body.order.payment_status).toBe('pending');
    expect(res.body.order.fulfillment_method).toBe('pickup');
    expect(res.body.bill).toMatchObject({ subtotal: 120, deliveryFee: 0, platformFee: 5, total: 125 });
    expect(res.body.paymentData.amount).toBe(12500);
    expect(res.body.paymentData.razorpayOrderId).toBe(gatewayOrders[0].id);
  });

  test('an online order is refused before it is written when Razorpay has no keys', async () => {
    razorpay._setClientForTests(null);
    const saved = { id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET };
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    const before = await orderCount();
    try {
      const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], paymentMethod: 'razorpay', deliveryMode: 'pickup' });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('PAYMENTS_UNAVAILABLE');
    } finally {
      process.env.RAZORPAY_KEY_ID = saved.id;
      process.env.RAZORPAY_KEY_SECRET = saved.secret;
    }
    expect(await orderCount()).toBe(before);
  });

  test('a wallet order debits the wallet and is paid', async () => {
    await setBalance(500);
    const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], paymentMethod: 'wallet', ...deliverNear });

    expect(res.status).toBe(201);
    expect(res.body.order.payment_status).toBe('paid');
    expect(await balance()).toBe(500 - 145);

    const ledger = await queryOne(
      "SELECT amount, type FROM wallet_transactions WHERE wallet_id = 'opp-wallet' AND reference_id = $1", [res.body.order.id]
    );
    expect(ledger).toEqual({ amount: 145, type: 'debit' });
  });

  test('a wallet that cannot cover the order leaves no order and no change', async () => {
    await setBalance(10);
    const before = await orderCount();

    const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], paymentMethod: 'wallet', deliveryMode: 'pickup' });

    expect(res.status).toBe(402);
    expect(await balance()).toBe(10);
    expect(await stock('opp-rice')).toBe(50);
    expect(await orderCount()).toBe(before);
  });

  test('cash is not taken on an order above the cash limit', async () => {
    const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-tv', quantity: 1 }], paymentMethod: 'cod', deliveryMode: 'pickup' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COD_NOT_AVAILABLE');

    await setBalance(5000);
    const wallet = await checkout({ shopId: SHOP, items: [{ productId: 'opp-tv', quantity: 1 }], paymentMethod: 'wallet', deliveryMode: 'pickup' });
    expect(wallet.status).toBe(201);
  });

  test('more than is in stock is refused, and a paid wallet is not charged for it', async () => {
    await setBalance(1000);
    const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-dal', quantity: 2 }], paymentMethod: 'wallet', deliveryMode: 'pickup' });

    expect(res.status).toBe(400);
    expect(await balance()).toBe(1000);
    expect(await stock('opp-dal')).toBe(1);
  });

  test('an unknown payment method, a foreign product and a bad quantity are refused', async () => {
    const pickup = { deliveryMode: 'pickup' };
    expect((await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], paymentMethod: 'iou', ...pickup })).status).toBe(400);
    expect((await checkout({ shopId: SHOP, items: [{ productId: 'opp-soap', quantity: 1 }], ...pickup })).status).toBe(400);
    expect((await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: -3 }], ...pickup })).status).toBe(400);
  });

  test('a delivery location is stored as a point and as numbers', async () => {
    const res = await checkout({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], ...deliverNear });

    expect(res.status).toBe(201);
    expect(res.body.order.delivery_lat).toBe(NEAR.lat);
    expect(res.body.order.delivery_lng).toBe(NEAR.lng);
    expect(res.body.order.delivery_address).toBe('Flat 4, Test Society');
  });
});

describe('POST /shops/:id/orders', () => {
  const place = (body) => request(app).post(`/shops/${SHOP}/orders`).set(as(BUYER)).send(body);
  const rice = { id: 'opp-rice', name: 'opp-rice', price: 120, quantity: 1 };

  test('lands in the orders table the shop works from, charged to the wallet', async () => {
    await setBalance(300);
    const res = await place({ items: [rice], totalAmount: 120, paymentMethod: 'WALLET', deliveryType: 'pickup' });

    expect(res.status).toBe(201);
    const order = await queryOne('SELECT shop_id, payment_method, payment_status, total_amount FROM orders WHERE id = $1', [res.body.order.id]);
    expect(order).toEqual({ shop_id: SHOP, payment_method: 'wallet', payment_status: 'paid', total_amount: 125 });
    expect(await balance()).toBe(175);
  });

  test('a wallet order without the balance is refused and not written', async () => {
    await setBalance(50);
    const before = await orderCount();

    const res = await place({ items: [rice], paymentMethod: 'WALLET', deliveryType: 'pickup' });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe('INSUFFICIENT_BALANCE');
    expect(await balance()).toBe(50);
    expect(await orderCount()).toBe(before);
  });

  test('a Razorpay order is charged what the server works out, not the total the client sends', async () => {
    const res = await place({
      items: [rice], totalAmount: 1, paymentMethod: 'RAZORPAY',
      deliveryType: 'delivery', deliveryAddress: 'Flat 4', deliveryCoordinate: NEAR,
    });

    expect(res.status).toBe(201);
    expect(res.body.order.payment_status).toBe('pending');
    expect(res.body.bill.total).toBe(145);
    expect(res.body.payment).toEqual(expect.objectContaining({
      keyId: 'rzp_test_unitTestKey', amount: 14500, purpose: 'order', referenceId: res.body.order.id,
    }));
    expect(res.body.payment.razorpayOrderId).toBe(gatewayOrders[0].id);
  });

  test('cash is the default and collects nothing', async () => {
    await setBalance(300);
    const res = await place({ items: [rice], deliveryType: 'pickup' });

    expect(res.status).toBe(201);
    expect(res.body.order.payment_method).toBe('cod');
    expect(res.body.order.payment_status).toBe('pending');
    expect(res.body.payment).toBeNull();
    expect(await balance()).toBe(300);
  });

  test('malformed requests are answered 400, not 500', async () => {
    expect((await place({ totalAmount: 120 })).status).toBe(400);
    expect((await place({ items: 'rice' })).status).toBe(400);
    expect((await place({ items: [rice], paymentMethod: 'iou' })).status).toBe(400);
    expect((await place({ items: [{ id: 'svc', type: 'service' }] })).status).toBe(400);
  });

  test('a line the server has no price for cannot be ordered, however it is paid', async () => {
    await setBalance(500);
    const invented = { id: 'opp-not-in-any-catalogue', name: '10 kg rice', price: 1, quantity: 1 };

    for (const paymentMethod of ['WALLET', 'RAZORPAY', 'COD']) {
      const res = await place({ items: [invented], paymentMethod, deliveryType: 'pickup' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ITEM_UNAVAILABLE');
    }
    expect(await balance()).toBe(500);
    expect(gatewayOrders).toHaveLength(0);
  });

  test('a universal-catalogue line is priced from that catalogue, not from the request', async () => {
    const item = await queryOne(
      "INSERT INTO universal_catalog_items (shop_id, title, price, is_active) VALUES ($1, 'opp kettle', 900, '1') RETURNING id", [SHOP]
    );
    const res = await place({ items: [{ id: item.id, name: 'opp kettle', price: 1, quantity: 1 }], totalAmount: 1, paymentMethod: 'RAZORPAY', deliveryType: 'pickup' });

    expect(res.status).toBe(201);
    expect(res.body.bill).toMatchObject({ subtotal: 900, total: 905 });
    expect(res.body.payment.amount).toBe(90500);
  });

  test('an order for a shop that does not exist writes nothing', async () => {
    const before = await orderCount();
    const res = await request(app).post('/shops/opp-no-such-shop/orders').set(as(BUYER)).send({ items: [rice] });
    expect(res.status).toBe(404);
    expect(await orderCount()).toBe(before);
  });
});

describe('POST /shops/cart/batch-checkout', () => {
  const batch = (body) => request(app).post('/shops/cart/batch-checkout').set(as(BUYER)).send(body);
  const cart = [
    { shop_id: SHOP, product_id: 'opp-rice', quantity: 2 },
    { shop_id: SHOP_B, product_id: 'opp-soap', quantity: 1 },
  ];
  const where = { address: 'Flat 4', coordinate: NEAR };
  // Items 2 × 120 + 45 = 285. Delivery once: the dearest leg (₹20) plus ₹10
  // for collecting from a second shop. Platform fee once: ₹5.
  const TOTAL = 285 + 30 + 5;

  test('a wallet cart is charged once, written as paid, and earns coins on what was paid', async () => {
    await setBalance(1000);
    const coinsBefore = await coins();

    const res = await batch({ items: cart, ...where });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalDeliveryFee: 30, platformFee: 5, finalAmount: TOTAL, paymentStatus: 'paid' });
    expect(await balance()).toBe(1000 - TOTAL);
    expect(await coins()).toBe(coinsBefore + Math.floor(TOTAL * 0.01));

    const orders = await queryMany(
      'SELECT shop_id, total_amount, delivery_fee, platform_fee, payment_status FROM orders WHERE batch_id = $1 ORDER BY total_amount', [res.body.batch_id]
    );
    expect(orders).toEqual([
      { shop_id: SHOP_B, total_amount: 55, delivery_fee: 10, platform_fee: 0, payment_status: 'paid' },
      { shop_id: SHOP, total_amount: 265, delivery_fee: 20, platform_fee: 5, payment_status: 'paid' },
    ]);
  });

  test('without the balance nothing is written and no coins are earned', async () => {
    await setBalance(100);
    const coinsBefore = await coins();
    const batchesBefore = (await queryMany('SELECT id FROM batch_orders WHERE user_id = $1', [BUYER])).length;

    const res = await batch({ items: cart, ...where });

    expect(res.status).toBe(402);
    expect(await balance()).toBe(100);
    expect(await coins()).toBe(coinsBefore);
    expect((await queryMany('SELECT id FROM batch_orders WHERE user_id = $1', [BUYER])).length).toBe(batchesBefore);
  });

  test('a cash cart is unpaid and earns nothing yet', async () => {
    await setBalance(1000);
    const coinsBefore = await coins();

    const res = await batch({ items: cart, ...where, paymentMethod: 'cod' });

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('pending');
    expect(res.body.earnedCoins).toBe(0);
    expect(await balance()).toBe(1000);
    expect(await coins()).toBe(coinsBefore);
  });

  test('coins come off what is owed — on the orders themselves, so cash collected is the discounted amount', async () => {
    for (const paymentMethod of ['wallet', 'cod']) {
      await setBalance(1000);
      await query(
        `INSERT INTO loyalty_accounts (user_id, sampark_coins_balance) VALUES ($1, 25)
         ON CONFLICT(user_id) DO UPDATE SET sampark_coins_balance = 25`,
        [BUYER]
      );

      const res = await batch({ items: cart, ...where, use_coins: true, paymentMethod });

      expect(res.status).toBe(200);
      expect(res.body.coinsUsed).toBe(25);
      expect(res.body.finalAmount).toBe(TOTAL - 25);
      const orders = await queryMany('SELECT total_amount, discount FROM orders WHERE batch_id = $1', [res.body.batch_id]);
      expect(orders.reduce((sum, o) => sum + o.total_amount, 0)).toBe(TOTAL - 25);
      expect(orders.reduce((sum, o) => sum + o.discount, 0)).toBe(25);

      if (paymentMethod === 'wallet') {
        expect(await balance()).toBe(1000 - (TOTAL - 25));
        expect(await coins()).toBe(Math.floor((TOTAL - 25) * 0.01));
      } else {
        expect(await balance()).toBe(1000);
      }
    }
  });

  test('lines that are not real products of the shop, or not whole positive quantities, are refused', async () => {
    await setBalance(1000);
    const bad = [
      [{ shop_id: SHOP, product_id: 'opp-rice', quantity: -5 }],
      [{ shop_id: SHOP, product_id: 'opp-rice', quantity: 1.5 }],
      [{ shop_id: SHOP, product_id: 'opp-no-such-product', quantity: 1 }],
      [{ shop_id: SHOP, product_id: 'opp-soap', quantity: 1 }],
      [{ product_id: 'opp-rice', quantity: 1 }],
    ];
    for (const items of bad) {
      const res = await batch({ items, ...where });
      expect(res.status).toBe(400);
    }
    expect((await batch({ items: 'everything' })).status).toBe(400);
    expect((await batch({ items: cart, ...where, paymentMethod: 'razorpay' })).status).toBe(400);
    const noLocation = await batch({ items: cart, address: 'Flat 4' });
    expect(noLocation.status).toBe(400);
    expect(noLocation.body.code).toBe('LOCATION_REQUIRED');
    expect(await balance()).toBe(1000);
  });
});

describe('POST /universal-orders', () => {
  const order = (body) => request(app).post('/universal-orders').set(as(BUYER)).send(body);
  let haircut;
  let withdrawn;

  beforeAll(async () => {
    const add = async (title, price, active) => (await queryOne(
      'INSERT INTO universal_catalog_items (shop_id, title, price, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
      [SHOP, title, price, active]
    )).id;
    haircut = await add('opp haircut', 250, '1');
    withdrawn = await add('opp withdrawn', 10, '0');
  });

  test('paid at the shop: priced from the catalogue, unpaid, method recorded', async () => {
    const res = await order({ shopId: SHOP, totalAmount: 1, items: [{ id: haircut, quantity: 2, price: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe(500);
    const row = await queryOne('SELECT total_amount, payment_method, payment_status FROM universal_orders WHERE id = $1', [res.body.orderId]);
    expect(row).toEqual({ total_amount: 500, payment_method: 'cod', payment_status: 'pending' });
  });

  test('wallet and online payment are refused: settlement would never pay the shop for them', async () => {
    await setBalance(300);
    const before = (await queryMany('SELECT id FROM universal_orders WHERE user_id = $1', [BUYER])).length;

    for (const paymentMethod of ['wallet', 'RAZORPAY']) {
      const res = await order({ shopId: SHOP, items: [{ id: haircut, quantity: 1 }], paymentMethod });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('PAY_AT_SHOP_ONLY');
    }
    expect(await balance()).toBe(300);
    expect(gatewayOrders).toHaveLength(0);
    expect((await queryMany('SELECT id FROM universal_orders WHERE user_id = $1', [BUYER])).length).toBe(before);
  });

  test('negative, fractional and withdrawn lines are refused', async () => {
    expect((await order({ shopId: SHOP, items: [{ id: haircut, quantity: -5 }] })).status).toBe(400);
    expect((await order({ shopId: SHOP, items: [{ id: haircut, quantity: 0.5 }] })).status).toBe(400);
    expect((await order({ shopId: SHOP, items: [{ id: withdrawn, quantity: 1 }] })).status).toBe(400);
    expect((await order({ shopId: SHOP_B, items: [{ id: haircut, quantity: 1 }] })).status).toBe(400);
    expect((await order({ shopId: SHOP, items: [{ id: haircut }], paymentMethod: 'iou' })).status).toBe(400);
  });
});

describe('POST /checkout/quote', () => {
  const quote = (body) => request(app).post('/checkout/quote').send(body);

  test('shows the bill the checkout will charge, without a session and without ordering', async () => {
    const before = await orderCount();

    const res = await quote({ shopId: SHOP, fulfillmentMethod: 'SELF_PICKUP', items: [{ productId: 'opp-rice', quantity: 2 }] });

    expect(res.status).toBe(200);
    expect(res.body.bill).toMatchObject({ subtotal: 240, deliveryFee: 0, platformFee: 5, total: 245 });
    expect(res.body.paymentMethods).toEqual({ cod: true, wallet: true, razorpay: true });
    expect(await orderCount()).toBe(before);

    const placed = await request(app).post('/checkout').set(as(BUYER))
      .send({ shopId: SHOP, fulfillmentMethod: 'SELF_PICKUP', items: [{ productId: 'opp-rice', quantity: 2 }] });
    expect(placed.status).toBe(201);
    expect(placed.body.bill).toEqual(res.body.bill);
  });

  test('a delivery quote is priced by distance and says how', async () => {
    const res = await quote({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }], deliveryCoordinate: MID });

    expect(res.status).toBe(200);
    expect(res.body.bill).toMatchObject({ deliveryFee: 48, distanceKm: 5.1, total: 173 });
    expect(res.body.bill.etaMinutes).toBeGreaterThan(0);

    const noLocation = await quote({ shopId: SHOP, items: [{ productId: 'opp-rice', quantity: 1 }] });
    expect(noLocation.status).toBe(400);
    expect(noLocation.body.code).toBe('LOCATION_REQUIRED');
  });

  test('a cart that cannot be ordered cannot be quoted', async () => {
    expect((await quote({ shopId: SHOP, deliveryMode: 'pickup', items: [{ productId: 'opp-soap', quantity: 1 }] })).status).toBe(400);
    expect((await quote({ shopId: 'opp-nope', deliveryMode: 'pickup', items: [{ productId: 'opp-rice', quantity: 1 }] })).status).toBe(404);
    expect((await quote({ items: [] })).status).toBe(400);
  });
});

/**
 * C4: the product page and the rules it states.
 *
 *   - GET /shops/:shopId/products/:productId: gallery, price/MRP/discount,
 *     seller (FSSAI for a food business), the return window returns apply,
 *     Legal Metrology declarations (missing ones named, never filled in) and
 *     reviews marked verified only for customers with a delivered order;
 *   - a variant is priced as base + modifier and stocked on its own, in the
 *     cart and at checkout (checkout used to charge the base price);
 *   - the seller's per-order limit is enforced in the cart and at checkout;
 *   - the seller can declare all of it, and cannot price above MRP.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const rules = require('../../services/catalogRules');

const BUYER = fx('c4x-buyer');
const REVIEWER = fx('c4x-reviewer');
const OWNER = fx('c4x-owner');
const OWNER_B = fx('c4x-owner-b');
const GROCER = fx('c4x-grocer');
const GADGETS = fx('c4x-gadgets');
const ATTA = fx('c4x-atta');
const TSHIRT = fx('c4x-tshirt');
const SMALL = fx('c4x-tshirt-s');
const LARGE = fx('c4x-tshirt-l');
const HIDDEN = fx('c4x-hidden');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM cart_items WHERE CAST(product_id AS TEXT) LIKE '${fxLike('c4x')}'`);
  await query(`DELETE FROM shop_commissions WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c4x')}'`);
  await query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c4x')}')`);
  await query(`DELETE FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c4x')}'`);
  await query(`DELETE FROM shop_reviews WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c4x')}'`);
  await query(`DELETE FROM product_variants WHERE CAST(product_id AS TEXT) LIKE '${fxLike('c4x')}'`);
  await query(`DELETE FROM shop_products WHERE CAST(id AS TEXT) LIKE '${fxLike('c4x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('c4x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c4x')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role, name] of [
    [BUYER, '9833222001', 'user', 'Asha Buyer'], [REVIEWER, '9833222002', 'user', 'Ravi Reviewer'],
    [OWNER, '9833222003', 'shop_owner', 'Grocer Owner'], [OWNER_B, '9833222004', 'shop_owner', 'Gadget Owner'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available, fssai_license_number, is_active, is_verified, approval_status)
     VALUES ($1, $2, 'C4 Grocer', 'Grocery', '12 Market Road, Dhanori', 'POINT(73.87 18.53)', 18.53, 73.87, '1', '11521999000123', '1', '1', 'approved')`,
    [GROCER, OWNER]
  );
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, delivery_available, is_active, is_verified, approval_status)
     VALUES ($1, $2, 'C4 Gadgets', 'Electronics', '4 Tech Lane', 'POINT(73.87 18.53)', 18.53, 73.87, '1', '1', '1', 'approved')`,
    [GADGETS, OWNER_B]
  );
  await query(
    `INSERT INTO shop_products (id, shop_id, name, price, mrp, inventory_count, stock_quantity, track_inventory, is_available, is_active,
                                image_url, gallery_urls, net_quantity, manufacturer_details, country_of_origin, best_before, generic_name, max_order_quantity)
     VALUES ($1, $2, 'C4 Chakki Atta', 230, 260, 40, 40, 1, '1', 1,
             'https://img.example/atta-1.jpg', '["https://img.example/atta-2.jpg","javascript:alert(1)","https://img.example/atta-1.jpg"]',
             '5 kg', 'Shree Mills, Plot 4, MIDC Bhosari, Pune 411026', 'India', '6 months from packing', 'Whole wheat flour', 3)`,
    [ATTA, GROCER]
  );
  await query(
    `INSERT INTO shop_products (id, shop_id, name, price, mrp, inventory_count, stock_quantity, track_inventory, is_available, is_active)
     VALUES ($1, $2, 'C4 Cotton T-shirt', 400, 500, 100, 100, 1, '1', 1)`,
    [TSHIRT, GADGETS]
  );
  await query(
    `INSERT INTO shop_products (id, shop_id, name, price, inventory_count, track_inventory, is_available, is_active)
     VALUES ($1, $2, 'C4 Withdrawn', 10, 5, 1, '0', 0)`,
    [HIDDEN, GROCER]
  );
  for (const [id, value, modifier, stock] of [[SMALL, 'S', 0, 0], [LARGE, 'L', 50, 2]]) {
    await query(
      `INSERT INTO product_variants (id, product_id, variant_name, variant_value, price_modifier, inventory_count)
       VALUES ($1, $2, 'Size', $3, $4, $5)`,
      [id, TSHIRT, value, modifier, stock]
    );
  }
  // One review from a customer with a delivered order, one from someone without.
  await query(
    `INSERT INTO orders (id, user_id, shop_id, subtotal, total_amount, delivery_fee, payment_method, payment_status, order_status, status, fulfillment_method)
     VALUES ($1, $2, $3, 230, 230, 0, 'cod', 'paid', 'delivered', 'delivered', 'pickup')`,
    [fx('c4x-delivered'), REVIEWER, GROCER]
  );
  await query('INSERT INTO shop_reviews (id, shop_id, user_id, rating, review_text) VALUES ($1, $2, $3, 5, $4)', [fx('c4x-r1'), GROCER, REVIEWER, 'Fresh atta, well packed']);
  await query('INSERT INTO shop_reviews (id, shop_id, user_id, rating, review_text) VALUES ($1, $2, $3, 1, $4)', [fx('c4x-r2'), GROCER, BUYER, 'Never ordered']);

  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/cart', require('../../modules/ecommerce/routes/cart.routes'));
  app.use('/checkout', require('../../modules/ecommerce/routes/checkout.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

const page = (shopId, productId) => request(app).get(`/shops/${shopId}/products/${productId}`);

test('[C4.1] the product page states price, MRP and discount, the seller with FSSAI, the return window and the declarations', async () => {
  const res = await page(GROCER, ATTA);
  expect(res.status).toBe(200);
  const p = res.body.product;
  expect(p).toMatchObject({ name: 'C4 Chakki Atta', price: 230, mrp: 260, discountPercent: 12, inStock: true, maxQuantity: 3, quantityLimit: 3 });
  // Only real web links, each once.
  expect(p.images).toEqual(['https://img.example/atta-1.jpg', 'https://img.example/atta-2.jpg']);
  expect(p.seller).toMatchObject({ name: 'C4 Grocer', address: '12 Market Road, Dhanori', foodBusiness: true, fssaiLicence: '11521999000123' });
  expect(p.returns.windowHours).toBe(48);
  expect(p.legal).toMatchObject({ netQuantity: '5 kg', countryOfOrigin: 'India', bestBefore: '6 months from packing', genericName: 'Whole wheat flour' });
  expect(p.legal.manufacturer).toMatch(/Shree Mills/);
  expect(p.legalMissing).toEqual(['Consumer care']);

  const shirt = (await page(GADGETS, TSHIRT)).body.product;
  expect(shirt.returns.windowHours).toBe(168);
  expect(shirt.seller.foodBusiness).toBe(false);
  expect(shirt.seller.fssaiLicence).toBeUndefined();
  expect(shirt.legalMissing).toHaveLength(6);
  expect(shirt.legal.netQuantity).toBeNull();

  // Another shop's product, an unlisted product, an unknown id.
  expect((await page(GADGETS, ATTA)).status).toBe(404);
  expect((await page(GROCER, HIDDEN)).status).toBe(404);
  expect((await page(GROCER, fx('c4x-nothing'))).status).toBe(404);
});

test('[C4.2] a variant is priced and stocked as itself, in the cart and at checkout', async () => {
  const shirt = (await page(GADGETS, TSHIRT)).body.product;
  expect(shirt.variants.map((v) => [v.value, v.price, v.inStock, v.maxQuantity])).toEqual([['S', 400, false, 0], ['L', 450, true, 2]]);

  // The cart refuses what the variant cannot supply, and prices the line as the variant.
  const tooMany = await request(app).post('/cart').set(as(BUYER)).send({ productId: TSHIRT, quantity: 3, customOptions: { variantId: LARGE } });
  expect(tooMany.status).toBe(400);
  expect(tooMany.body.available).toBe(2);
  await request(app).post('/cart').set(as(BUYER)).send({ productId: TSHIRT, quantity: 2, customOptions: { variantId: LARGE } });
  const cart = await request(app).get('/cart').set(as(BUYER));
  expect(cart.body.cartItems[0]).toMatchObject({ price: 450, availableStock: 2, isOutOfStock: false });
  expect(cart.body.cartItems[0].product.name).toBe('C4 Cotton T-shirt (L)');

  // Checkout charges the variant's price and takes the variant's stock.
  const placed = await request(app).post('/checkout').set(as(BUYER))
    .send({ shopId: GADGETS, items: [{ productId: TSHIRT, quantity: 2, variantId: LARGE }], paymentMethod: 'cod', deliveryMode: 'pickup' });
  expect(placed.status).toBe(201);
  expect(Number(placed.body.order.subtotal)).toBe(900);
  expect(placed.body.order.items.map((i) => i.name)).toEqual(['C4 Cotton T-shirt (L)']);
  expect(Number((await queryOne('SELECT inventory_count FROM product_variants WHERE id = $1', [LARGE])).inventory_count)).toBe(0);
  expect(Number((await queryOne('SELECT inventory_count FROM shop_products WHERE id = $1', [TSHIRT])).inventory_count)).toBe(100);

  const soldOut = await request(app).post('/checkout').set(as(BUYER))
    .send({ shopId: GADGETS, items: [{ productId: TSHIRT, quantity: 1, variantId: SMALL }], paymentMethod: 'cod', deliveryMode: 'pickup' });
  expect(soldOut.status).toBe(400);
  expect(soldOut.body.code).toBe('OUT_OF_STOCK');
  const foreign = await request(app).post('/checkout').set(as(BUYER))
    .send({ shopId: GADGETS, items: [{ productId: TSHIRT, quantity: 1, variantId: fx('c4x-not-a-variant') }], paymentMethod: 'cod', deliveryMode: 'pickup' });
  expect(foreign.status).toBe(400);
});

test('[C4.3] the seller\'s per-order limit is enforced when the cart is filled and at checkout', async () => {
  const over = await request(app).post('/cart').set(as(BUYER)).send({ productId: ATTA, quantity: 4 });
  expect(over.status).toBe(400);
  expect(over.body).toMatchObject({ code: 'QUANTITY_LIMIT', limit: 3 });
  expect((await request(app).post('/cart').set(as(BUYER)).send({ productId: ATTA, quantity: 3 })).status).toBe(200);

  const checkout = await request(app).post('/checkout').set(as(BUYER))
    .send({ shopId: GROCER, items: [{ productId: ATTA, quantity: 4 }], paymentMethod: 'cod', deliveryMode: 'pickup' });
  expect(checkout.status).toBe(400);
  expect(checkout.body.code).toBe('QUANTITY_LIMIT');
});

test('[C4.4] only reviews from customers with a delivered order are marked verified, and only they count', async () => {
  const { reviews } = (await page(GROCER, ATTA)).body.product;
  const byText = Object.fromEntries(reviews.items.map((r) => [r.text, r]));
  expect(byText['Fresh atta, well packed']).toMatchObject({ verifiedPurchase: true, rating: 5, author: 'Ravi' });
  expect(byText['Never ordered'].verifiedPurchase).toBe(false);
  expect(reviews).toMatchObject({ verifiedCount: 1, averageRating: 5 });
});

test('[C4.5] the seller declares the details, photos and limit, and cannot price above MRP', async () => {
  const put = (body) => request(app).put(`/shops/my-shop/products/${TSHIRT}`).set(as(OWNER_B)).send(body);
  const saved = await put({
    netQuantity: '1 piece', manufacturer: 'Knit Co., Tiruppur 641604', countryOfOrigin: 'India', genericName: 'T-shirt',
    consumerCare: 'care@knit.example, 1800 000 000', galleryUrls: ['https://img.example/t1.jpg', 'ftp://nope'], maxOrderQuantity: 5,
  });
  expect(saved.status).toBeLessThan(300);
  const shirt = (await page(GADGETS, TSHIRT)).body.product;
  expect(shirt.legal).toMatchObject({ netQuantity: '1 piece', countryOfOrigin: 'India', consumerCare: 'care@knit.example, 1800 000 000' });
  expect(shirt.legalMissing).toEqual(['Best before']);
  expect(shirt.images).toEqual(['https://img.example/t1.jpg']);
  expect(shirt.quantityLimit).toBe(5);

  const aboveMrp = await put({ price: 520 });
  expect(aboveMrp.status).toBe(400);
  expect(aboveMrp.body.code).toBe('PRICE_ABOVE_MRP');
  expect(Number((await queryOne('SELECT price FROM shop_products WHERE id = $1', [TSHIRT])).price)).toBe(400);
  expect((await put({ maxOrderQuantity: 0 })).status).toBe(400);
  // Another seller cannot touch it.
  expect((await request(app).put(`/shops/my-shop/products/${TSHIRT}`).set(as(OWNER)).send({ netQuantity: 'x' })).status).toBeGreaterThanOrEqual(400);
});

test('[C4.6] the return window the page states is the one returns apply', () => {
  expect(rules.returnWindowHours('Grocery')).toBe(48);
  expect(rules.returnWindowHours('bakery')).toBe(48);
  expect(rules.returnWindowHours('Electronics')).toBe(168);
  const src = require('fs').readFileSync(require.resolve('../../modules/ecommerce/services/return.service'), 'utf8');
  expect(src).toMatch(/catalogRules'\)\.returnWindowHours\(shop\?\.category\)/);
  expect(rules.discountPercent(230, 260)).toBe(12);
  expect(rules.discountPercent(300, 260)).toBe(0);
  expect(rules.quantityLimit({ max_order_quantity: null })).toBeNull();
});

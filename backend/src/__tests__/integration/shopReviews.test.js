/**
 * Shop reviews: "Verified" means the reviewer was actually served by the
 * shop. Every review used to be stored as verified.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM shop_reviews WHERE shop_id = '${fx('rev-shop')}'`);
  await query(`DELETE FROM orders WHERE CAST(id AS TEXT) LIKE '${fxLike('rev')}'`);
  await query(`DELETE FROM local_shops WHERE id = '${fx('rev-shop')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('rev')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone] of [[fx('rev-owner'), '9899100001'], [fx('rev-customer'), '9899100002'], [fx('rev-passerby'), '9899100003']]) {
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $3, $2, 'user')", [id, phone, id]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude)
     VALUES ('${fx('rev-shop')}', '${fx('rev-owner')}', 'Rev Shop', 'Grocery', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87)`
  );
  await query(
    `INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method, order_status) VALUES ('${fx('rev-order')}', '${fx('rev-customer')}', '${fx('rev-shop')}', 100, '0', 'cod', 'delivered')`
  );

  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
});

afterAll(cleanup);

const review = (who, body) => request(app).post(`/shops/${fx('rev-shop')}/reviews`).set(as(who)).send(body);

test('a customer the shop has served gets a verified review', async () => {
  const res = await review(fx('rev-customer'), { rating: 5, review_text: 'Quick and fresh' });
  expect(res.status).toBe(201);
  expect(res.body.is_society_verified).toBe(1);
});

// C11 (F-156): reviews are restricted to verified purchasers. This used to
// accept the review and only mark it unverified.
test('anyone the shop has not served cannot review it, and nothing is stored', async () => {
  const res = await review(fx('rev-passerby'), { rating: 2 });
  expect(res.status).toBe(403);
  expect(res.body.code).toBe('NOT_VERIFIED_PURCHASE');
  expect(await queryOne(`SELECT id FROM shop_reviews WHERE user_id = '${fx('rev-passerby')}'`)).toBeFalsy();
});

test('one review per customer, none from the owner, and a rating from 1 to 5', async () => {
  expect((await review(fx('rev-customer'), { rating: 4 })).status).toBe(409);
  expect((await review(fx('rev-owner'), { rating: 5 })).status).toBe(403);
  for (const rating of [0, 6, 4.5, 'great', undefined]) {
    expect((await request(app).post(`/shops/${fx('rev-shop')}/reviews`).set(as(fx('rev-passerby'))).send({ rating })).status).toBe(400);
  }
  expect((await request(app).post('/shops/no-such-shop/reviews').set(as(fx('rev-passerby'))).send({ rating: 3 })).status).toBe(404);
});

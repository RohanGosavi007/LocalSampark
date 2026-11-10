/**
 * Joining a group-buying deal counts each account once.
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
  await query(`DELETE FROM group_buying_participants WHERE CAST(user_id AS TEXT) LIKE '${fxLike('gbj')}'`);
  await query(`DELETE FROM group_buying_deals WHERE CAST(id AS TEXT) LIKE '${fxLike('gbj')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('gbj')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone] of [[fx('gbj-a'), '9830400001'], [fx('gbj-b'), '9830400002']]) {
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $3, $2, 'user')", [id, phone, id]);
  }
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const past = new Date(Date.now() - 60 * 1000).toISOString();
  await query(`INSERT INTO group_buying_deals (id, title, min_buyers, current_buyers, wholesale_price, end_datetime, scope, status) VALUES ('${fx('gbj-deal')}', 'Rice', 3, '0', 50, $1, 'zone', 'active')`, [future]);
  await query(`INSERT INTO group_buying_deals (id, title, min_buyers, current_buyers, wholesale_price, end_datetime, scope, status) VALUES ('${fx('gbj-old')}', 'Oil', 3, '0', 50, $1, 'zone', 'active')`, [past]);

  app = express();
  app.use(express.json());
  app.use('/group-buy', require('../../modules/ecommerce/routes/group-buying.routes'));
});

afterAll(cleanup);

test('each account counts once, however often it joins', async () => {
  const join = (who) => request(app).post(`/group-buy/${fx('gbj-deal')}/join`).set(as(who));
  const burst = await Promise.all([join(fx('gbj-a')), join(fx('gbj-a')), join(fx('gbj-a'))]);
  expect(burst.map((r) => r.status).sort()).toEqual([200, 409, 409]);
  expect((await join(fx('gbj-b'))).status).toBe(200);
  expect((await queryOne(`SELECT current_buyers FROM group_buying_deals WHERE id = '${fx('gbj-deal')}'`)).current_buyers).toBe(2);
});

test('an expired deal cannot be joined', async () => {
  expect((await request(app).post(`/group-buy/${fx('gbj-old')}/join`).set(as(fx('gbj-a')))).status).toBe(404);
});

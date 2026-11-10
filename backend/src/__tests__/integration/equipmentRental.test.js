/**
 * Equipment rental: the owner is paid the rent, and the deposit comes back
 * when the owner confirms the item is back — not when the renter says so.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const OWNER = fx('eqp-owner');
const RENTER = fx('eqp-renter');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
const wallet = async (userId) => Number((await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [userId]))?.balance || 0);

let app;
let listingId;

async function cleanup() {
  await query(`DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('eqp')}')`);
  await query(`DELETE FROM wallets WHERE CAST(user_id AS TEXT) LIKE '${fxLike('eqp')}'`);
  await query(`DELETE FROM equipment_rentals WHERE CAST(renter_id AS TEXT) LIKE '${fxLike('eqp')}'`);
  await query("DELETE FROM equipment_listings WHERE CAST(owner_id AS TEXT) LIKE 'eqp-%'");
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('eqp')}'`);
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Owner', '9820300001', 'user')", [OWNER]);
  await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, 'Renter', '9820300002', 'user')", [RENTER]);
  await query(`INSERT INTO wallets (id, user_id, balance) VALUES ('${fx('eqp-w-renter')}', $1, 1000)`, [RENTER]);
  const listing = await queryOne(
    `INSERT INTO equipment_listings (owner_id, item_name, category, description, daily_price, security_deposit, status)
     VALUES ($1, 'Drill', 'Tools', 'Cordless', 100, 500, 'available') RETURNING id`,
    [OWNER]
  );
  listingId = listing.id;

  app = express();
  app.use(express.json());
  app.use('/equipment', require('../../modules/services/routes/equipment.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

test('renting takes rent and deposit; a silly rental period is refused', async () => {
  expect((await request(app).post(`/equipment/rent/${listingId}`).set(as(RENTER)).send({ days: 1000000 })).status).toBe(400);
  expect((await request(app).post(`/equipment/rent/${listingId}`).set(as(RENTER)).send({ days: 1.5 })).status).toBe(400);

  const res = await request(app).post(`/equipment/rent/${listingId}`).set(as(RENTER)).send({ days: 2 });
  expect(res.status).toBe(201);
  expect(await wallet(RENTER)).toBe(1000 - 200 - 500);
});

test('the renter asking to return does not refund the deposit', async () => {
  const rental = await queryOne('SELECT id FROM equipment_rentals WHERE renter_id = $1', [RENTER]);
  expect((await request(app).post(`/equipment/rentals/${rental.id}/return`).set(as(RENTER))).status).toBe(200);
  expect(await wallet(RENTER)).toBe(300);
  expect((await queryOne('SELECT status FROM equipment_rentals WHERE id = $1', [rental.id])).status).toBe('return_requested');

  // Nor can the renter confirm it themselves.
  expect((await request(app).post(`/equipment/rentals/${rental.id}/confirm-return`).set(as(RENTER))).status).toBe(404);
});

test('the owner confirms: paid the rent and any damage deduction, the rest of the deposit refunded, once', async () => {
  const rental = await queryOne('SELECT id FROM equipment_rentals WHERE renter_id = $1', [RENTER]);
  expect((await request(app).post(`/equipment/rentals/${rental.id}/confirm-return`).set(as(OWNER)).send({ damageDeduction: 900 })).status).toBe(400);

  const res = await request(app).post(`/equipment/rentals/${rental.id}/confirm-return`).set(as(OWNER)).send({ damageDeduction: 50 });
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ ownerPaid: 250, depositRefunded: 450 });
  expect(await wallet(OWNER)).toBe(250);
  expect(await wallet(RENTER)).toBe(300 + 450);
  expect((await queryOne('SELECT status FROM equipment_listings WHERE id = $1', [listingId])).status).toBe('available');

  expect((await request(app).post(`/equipment/rentals/${rental.id}/confirm-return`).set(as(OWNER))).status).toBe(409);
  expect(await wallet(OWNER)).toBe(250);
});

/**
 * Marketplace escrow holds money.
 *
 * It used to hold a status. "Create" answered "Payment held safely" with no
 * payment made; "release" answered "Payment released to seller!" and paid
 * nobody; an administrator resolving a dispute changed one word in one column.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const BUYER = 'esc-buyer';
const SELLER = 'esc-seller';
const STRANGER = 'esc-stranger';
const ADMIN = 'esc-admin';

const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
const balance = async (userId) => {
  const wallet = await queryOne('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
  return wallet ? Number(wallet.balance) : null;
};
const setBalance = (userId, rupees) => query('UPDATE wallets SET balance = $1 WHERE user_id = $2', [rupees, userId]);

let app;

async function cleanup() {
  await query("DELETE FROM marketplace_escrow WHERE buyer_id LIKE 'esc-%'");
  await query("DELETE FROM marketplace_listings WHERE id LIKE 'esc-%'");
  await query("DELETE FROM wallet_transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id LIKE 'esc-%')");
  await query("DELETE FROM wallets WHERE user_id LIKE 'esc-%'");
  await query("DELETE FROM users WHERE id LIKE 'esc-%'");
}

async function listing(id, price, negotiable = 0) {
  await query(
    `INSERT INTO marketplace_listings (id, seller_id, title, category, price, is_negotiable, coordinate, status)
     VALUES ($1, $2, 'Bicycle', 'sports', $3, $4, 'POINT(73.87 18.53)', 'active')`,
    [id, SELLER, price, negotiable]
  );
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role] of [[BUYER, '9811200001', 'user'], [SELLER, '9811200002', 'user'], [STRANGER, '9811200003', 'user'], [ADMIN, '9811200004', 'super_admin']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `ESC ${id}`, phone, role]);
  }
  // The buyer has a wallet; the seller has never opened theirs.
  await query("INSERT INTO wallets (id, user_id, balance) VALUES ('esc-wallet-buyer', $1, 5000)", [BUYER]);

  app = express();
  app.use(express.json());
  app.use('/advanced', require('../../modules/services/routes/advanced.routes'));
  app.use('/admin/tri-category', require('../../modules/crm/routes/admin-tri-category.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(cleanup);

const hold = (userId, body) => request(app).post('/advanced/marketplace/escrow/create').set(as(userId)).send(body);
const release = (userId, id) => request(app).post(`/advanced/marketplace/escrow/${id}/release`).set(as(userId));
const dispute = (userId, id, reason) => request(app).post(`/advanced/marketplace/escrow/${id}/dispute`).set(as(userId)).send({ reason });
const resolve = (id, resolution) => request(app).put(`/admin/tri-category/marketplace/escrows/${id}/resolve`).set(as(ADMIN)).send({ resolution });

test('holding takes the listing price from the buyer; releasing pays the seller, once', async () => {
  await listing('esc-bike-1', 1000);
  await setBalance(BUYER, 5000);

  // A fixed-price listing is paid for at its price, whatever the request offers.
  expect((await hold(BUYER, { listing_id: 'esc-bike-1', amount: 1 })).status).toBe(400);

  const held = await hold(BUYER, { listing_id: 'esc-bike-1' });
  expect(held.status).toBe(200);
  expect(held.body.escrow).toEqual(expect.objectContaining({ amount: 1000, platform_fee: 20, net_to_seller: 980, status: 'held' }));
  expect(await balance(BUYER)).toBe(4000);
  expect(await balance(SELLER)).toBeNull();

  // Nobody else can release it, and a second hold on the same item is refused.
  expect((await release(STRANGER, held.body.escrow.id)).status).toBe(404);
  expect((await release(SELLER, held.body.escrow.id)).status).toBe(404);
  expect((await hold(STRANGER, { listing_id: 'esc-bike-1' })).status).toBe(409);

  const results = await Promise.all([release(BUYER, held.body.escrow.id), release(BUYER, held.body.escrow.id)]);
  expect(results.filter((r) => r.status === 200)).toHaveLength(1);

  // The seller had no wallet row; the money still arrives.
  expect(await balance(SELLER)).toBe(980);
  expect(await balance(BUYER)).toBe(4000);
  expect((await queryOne("SELECT status FROM marketplace_listings WHERE id = 'esc-bike-1'")).status).toBe('sold');
});

test('without the balance there is no escrow', async () => {
  await listing('esc-bike-2', 1000);
  await setBalance(BUYER, 300);

  const res = await hold(BUYER, { listing_id: 'esc-bike-2' });

  expect(res.status).toBe(402);
  expect(await balance(BUYER)).toBe(300);
  expect(await queryMany("SELECT id FROM marketplace_escrow WHERE listing_id = 'esc-bike-2'")).toEqual([]);
});

test('a dispute keeps the money held until an administrator refunds it', async () => {
  await listing('esc-bike-3', 800);
  await setBalance(BUYER, 2000);
  const sellerBefore = await balance(SELLER);

  const held = await hold(BUYER, { listing_id: 'esc-bike-3' });
  const id = held.body.escrow.id;
  expect(await balance(BUYER)).toBe(1200);

  expect((await dispute(BUYER, id, '')).status).toBe(400);
  expect((await dispute(STRANGER, id, 'mine')).status).toBe(404);
  expect((await dispute(BUYER, id, 'Item never handed over')).status).toBe(200);

  // Disputed: the buyer can no longer release it, and the money has not moved.
  expect((await release(BUYER, id)).status).toBe(400);
  expect(await balance(BUYER)).toBe(1200);
  expect(await balance(SELLER)).toBe(sellerBefore);

  expect((await resolve(id, 'split_it')).status).toBe(400);
  const refunded = await resolve(id, 'refund_to_buyer');
  expect(refunded.status).toBe(200);
  expect(refunded.body.status).toBe('refunded');
  expect(await balance(BUYER)).toBe(2000);
  expect(await balance(SELLER)).toBe(sellerBefore);

  // Settled is settled: it cannot now also be released to the seller.
  expect((await resolve(id, 'release_to_seller')).status).toBe(409);
  expect(await balance(SELLER)).toBe(sellerBefore);
});

test('an administrator can release a disputed payment to the seller', async () => {
  await listing('esc-bike-4', 500, 1);
  await setBalance(BUYER, 1000);
  const sellerBefore = await balance(SELLER);

  // Negotiable: the agreed amount may differ from the listed price.
  const held = await hold(BUYER, { listing_id: 'esc-bike-4', amount: 450 });
  expect(held.status).toBe(200);
  expect(await balance(BUYER)).toBe(550);
  await dispute(BUYER, held.body.escrow.id, 'Scratched frame');

  const res = await resolve(held.body.escrow.id, 'release_to_seller');
  expect(res.status).toBe(200);
  expect(await balance(SELLER)).toBe(sellerBefore + 441);
  expect(await balance(BUYER)).toBe(550);
});

test('a seller cannot escrow their own listing, and resolution is for administrators', async () => {
  await listing('esc-bike-5', 100);
  expect((await hold(SELLER, { listing_id: 'esc-bike-5' })).status).toBe(400);
  expect((await hold(BUYER, { listing_id: 'esc-no-such-listing' })).status).toBe(404);

  const asBuyer = await request(app).put('/admin/tri-category/marketplace/escrows/anything/resolve').set(as(BUYER)).send({ resolution: 'refund_to_buyer' });
  expect(asBuyer.status).toBe(403);
});

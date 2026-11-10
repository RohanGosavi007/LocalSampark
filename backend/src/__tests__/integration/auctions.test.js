/**
 * Marketplace auctions: terms are validated, bids are numbers from someone
 * other than the seller, and of two bids at the same price only one wins.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const SELLER = fx('auc-seller');
const ALICE = fx('auc-alice');
const BOB = fx('auc-bob');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });

let app;
let auctionId;

async function cleanup() {
  await query(`DELETE FROM marketplace_auction_bids WHERE CAST(bidder_id AS TEXT) LIKE '${fxLike('auc')}'`);
  await query(`DELETE FROM marketplace_auctions WHERE CAST(listing_id AS TEXT) LIKE '${fxLike('auc')}'`);
  await query(`DELETE FROM marketplace_listings WHERE CAST(id AS TEXT) LIKE '${fxLike('auc')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('auc')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone] of [[SELLER, '9877100001'], [ALICE, '9877100002'], [BOB, '9877100003']]) {
    await query("INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $3, $2, 'user')", [id, phone, id]);
  }
  await query(`INSERT INTO marketplace_listings (id, seller_id, title, category, price) VALUES ('${fx('auc-cycle')}', $1, 'Bicycle', 'Sports', 2000)`, [SELLER]);

  app = express();
  app.use(express.json());
  app.use('/', require('../../modules/services/routes/advanced-b.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

const bid = (who, amount) => request(app).post(`/marketplace/auctions/${auctionId}/bid`).set(as(who)).send({ bid_amount: amount });

test('only the seller starts an auction, on sensible terms, one at a time', async () => {
  const create = (who, body) => request(app).post('/marketplace/auctions').set(as(who)).send({ listing_id: fx('auc-cycle'), ...body });

  expect((await create(ALICE, {})).status).toBe(404);
  expect((await create(SELLER, { bid_increment: 0 })).status).toBe(400);
  expect((await create(SELLER, { duration_hours: 10000 })).status).toBe(400);
  expect((await create(SELLER, { starting_price: 'free' })).status).toBe(400);

  const res = await create(SELLER, { starting_price: 1000, bid_increment: 100, duration_hours: 2 });
  expect(res.status).toBe(200);
  auctionId = res.body.auction.id;
  expect(res.body.auction).toMatchObject({ starting_price: 1000, bid_increment: 100, duration_hours: 2 });

  expect((await create(SELLER, {})).status).toBe(409);
});

test('a bid must be a number at least one increment above the current one', async () => {
  expect((await bid(ALICE, 'lots')).status).toBe(400);
  expect((await bid(ALICE, 1050)).status).toBe(400);
  expect((await bid(ALICE, 1100)).status).toBe(200);
  expect((await queryOne('SELECT current_bid, highest_bidder_id FROM marketplace_auctions WHERE id = $1', [auctionId])))
    .toEqual({ current_bid: 1100, highest_bidder_id: ALICE });
});

test('the seller cannot bid on their own item', async () => {
  expect((await bid(SELLER, 5000)).status).toBe(403);
});

test('of two bids at the same price placed together, one wins and one is told it was outbid', async () => {
  const [a, b] = await Promise.all([bid(ALICE, 1200), bid(BOB, 1200)]);
  // Exactly one wins. The loser is refused either by the guarded UPDATE (409,
  // when both read the old price) or, if it reads after the winner committed,
  // by the minimum check (400, "Minimum bid") -- which on PostgreSQL happens.
  const [winner, loser] = [a, b].sort((x, y) => x.status - y.status);
  expect(winner.status).toBe(200);
  expect([400, 409]).toContain(loser.status);
  expect(loser.body.error).toMatch(/bid/i);

  const auction = await queryOne('SELECT current_bid, total_bids FROM marketplace_auctions WHERE id = $1', [auctionId]);
  expect(auction).toEqual({ current_bid: 1200, total_bids: 2 });
  expect(await queryMany('SELECT bid_amount FROM marketplace_auction_bids WHERE auction_id = $1 ORDER BY bid_amount', [auctionId]))
    .toEqual([{ bid_amount: 1100 }, { bid_amount: 1200 }]);
});

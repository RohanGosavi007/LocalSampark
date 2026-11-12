/**
 * C11: verified reviews only, one rating, abuse reports and moderation.
 * Every way of writing a review goes through services/reviews.service.js.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne, queryMany } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');

const BUYER = fx('c11x-buyer');
const BUYER2 = fx('c11x-buyer2');
const STRANGER = fx('c11x-stranger');
const OWNER = fx('c11x-owner');
const ADMIN = fx('c11x-admin');
const SHOP = fx('c11x-shop');
const ORDER = fx('c11x-order');
const ORDER2 = fx('c11x-order2');
const PENDING = fx('c11x-pending');
const as = (userId) => ({ Authorization: `Bearer ${jwt.sign({ userId }, getJwtSecret(), { expiresIn: '5m' })}` });
let app;

async function cleanup() {
  await query(`DELETE FROM review_reports WHERE review_id IN (SELECT CAST(id AS TEXT) FROM shop_reviews WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c11x')}')`);
  await query(`DELETE FROM shop_reviews WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c11x')}'`);
  await query(`DELETE FROM trust_reviews WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c11x')}'`);
  await query(`DELETE FROM reviews WHERE CAST(target_id AS TEXT) LIKE '${fxLike('c11x')}'`);
  await query(`DELETE FROM orders WHERE CAST(shop_id AS TEXT) LIKE '${fxLike('c11x')}'`);
  await query(`DELETE FROM local_shops WHERE CAST(id AS TEXT) LIKE '${fxLike('c11x')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c11x')}'`);
}

beforeAll(async () => {
  await cleanup();
  for (const [id, phone, role, name] of [
    [BUYER, '9833111001', 'user', 'Meera Buyer'], [BUYER2, '9833111002', 'user', 'Kiran Buyer'],
    [STRANGER, '9833111003', 'user', 'Stranger'], [OWNER, '9833111004', 'shop_owner', 'Owner'],
    [ADMIN, '9833111005', 'super_admin', 'Admin'],
  ]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, name, phone, role]);
  }
  await query(
    `INSERT INTO local_shops (id, owner_id, name, category, address, coordinate, latitude, longitude, rating, is_verified)
     VALUES ($1, $2, 'C11 Bakery', 'Bakery', 'Road', 'POINT(73.87 18.53)', 18.53, 73.87, 4.9, '1')`,
    [SHOP, OWNER]
  );
  for (const [id, user, status] of [[ORDER, BUYER, 'delivered'], [ORDER2, BUYER2, 'delivered'], [PENDING, STRANGER, 'preparing']]) {
    await query(
      `INSERT INTO orders (id, user_id, shop_id, total_amount, delivery_fee, payment_method, order_status, status)
       VALUES ($1, $2, $3, 100, 0, 'cod', $4, $4)`,
      [id, user, SHOP, status]
    );
  }
  app = express();
  app.use(express.json());
  app.use('/shops', require('../../modules/ecommerce/routes/shop.routes'));
  app.use('/trust-reviews', require('../../modules/ecommerce/routes/trust-reviews.routes'));
  app.use('/engagement', require('../../modules/crm/routes/engagement.routes'));
  app.use('/admin/commerce', require('../../modules/crm/routes/admin-commerce.routes'));
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterAll(cleanup);

const rating = async () => Number((await queryOne('SELECT rating FROM local_shops WHERE id = $1', [SHOP])).rating);

test('[C11.1] no path accepts a review from someone the shop has not served', async () => {
  const sync = require('../../services/offlineSync.service');
  const applier = typeof sync.applyCreateReview === 'function' ? sync : sync.OfflineSyncService;
  const statuses = [];
  statuses.push((await request(app).post(`/shops/${SHOP}/reviews`).set(as(STRANGER)).send({ rating: 5, review_text: 'Great!' })).status);
  statuses.push((await request(app).post(`/shops/${SHOP}/orders/${PENDING}/review`).set(as(STRANGER)).send({ rating: 5 })).status);
  statuses.push((await request(app).post(`/trust-reviews/${SHOP}`).set(as(STRANGER)).send({ rating: 5 })).status);
  statuses.push((await request(app).post('/engagement/reviews/submit').set(as(STRANGER)).send({ targetId: SHOP, targetType: 'shop', rating: 5, comment: 'Best shop' })).status);
  expect(statuses).toEqual([403, 400, 403, 403]);
  await expect(applier.applyCreateReview(STRANGER, { shopId: SHOP, rating: 5, comment: 'queued' })).rejects.toMatchObject({ status: 403 });
  expect(await queryMany('SELECT id FROM shop_reviews WHERE shop_id = $1', [SHOP])).toHaveLength(0);
  expect(await queryMany('SELECT id FROM reviews WHERE target_id = $1', [SHOP])).toHaveLength(0);
  // Nothing has changed the rating.
  expect(await rating()).toBe(4.9);
});

test('[C11.2] a buyer\'s review counts once, whatever path it came by, and the rating is the verified average', async () => {
  const first = await request(app).post(`/shops/${SHOP}/orders/${ORDER}/review`).set(as(BUYER)).send({ rating: 2, review: 'Bread was stale' });
  expect(first.status).toBe(201);
  expect(await rating()).toBe(2);
  // The same customer by another path: their review is replaced, not added.
  const again = await request(app).post('/engagement/reviews/submit').set(as(BUYER)).send({ targetId: SHOP, targetType: 'shop', rating: 4, comment: 'Better this time' });
  expect(again.status).toBe(200);
  expect(await queryMany('SELECT id FROM shop_reviews WHERE shop_id = $1 AND user_id = $2', [SHOP, BUYER])).toHaveLength(1);
  const viaTrust = await request(app).post(`/trust-reviews/${SHOP}`).set(as(BUYER2)).send({ rating: 5, review_text: 'Lovely', orderId: ORDER2 });
  expect(viaTrust.status).toBe(201);
  expect(await rating()).toBe(4.5);
  const listed = await request(app).get(`/shops/${SHOP}/reviews`);
  expect(listed.body.meta).toMatchObject({ averageRating: 4.5, verifiedReviews: 2, totalReviews: 2 });
  expect(listed.body.data.every((r) => r.verified_purchase)).toBe(true);
  // Someone else's order cannot be reviewed.
  expect((await request(app).post(`/shops/${SHOP}/orders/${ORDER}/review`).set(as(BUYER2)).send({ rating: 1 })).status).toBe(403);
});

test('[C11.3] the shop replies to a review, and only the shop can', async () => {
  const review = await queryOne('SELECT id FROM shop_reviews WHERE shop_id = $1 AND user_id = $2', [SHOP, BUYER]);
  const reply = await request(app).post(`/shops/my-shop/reviews/${review.id}/reply`).set(as(OWNER)).send({ reply: 'Sorry about the stale bread; we fixed our oven timer.' });
  expect(reply.status).toBe(200);
  const listed = await request(app).get(`/shops/${SHOP}/reviews`);
  expect(listed.body.data.find((r) => String(r.id) === String(review.id)).reply).toMatch(/oven timer/);
  expect((await request(app).post(`/shops/my-shop/reviews/${review.id}/reply`).set(as(STRANGER)).send({ reply: 'x' })).status).toBe(403);
});

test('[C11.4] a reported review joins the moderation queue; hiding it removes it from listings and the rating', async () => {
  const review = await queryOne('SELECT id FROM shop_reviews WHERE shop_id = $1 AND user_id = $2', [SHOP, BUYER2]);
  const report = (who, body) => request(app).post(`/shops/${SHOP}/reviews/${review.id}/report`).set(as(who)).send(body);
  expect((await report(BUYER, { reason: 'nonsense' })).status).toBe(400);
  expect((await report(BUYER, { reason: 'fake', details: 'Posted by a relative' })).status).toBe(201);
  expect((await report(BUYER, { reason: 'fake' })).body.alreadyReported).toBe(true);
  expect((await report(STRANGER, { reason: 'spam' })).status).toBe(201);

  expect((await request(app).get('/admin/commerce/review-reports').set(as(BUYER))).status).toBe(403);
  const queue = await request(app).get('/admin/commerce/review-reports').set(as(ADMIN));
  expect(queue.status).toBe(200);
  const item = queue.body.data.find((r) => String(r.review_id) === String(review.id));
  expect(item).toMatchObject({ reports: 2, shop_name: 'C11 Bakery' });
  expect(Number(item.rating)).toBe(5);

  const hidden = await request(app).post(`/admin/commerce/review-reports/${review.id}/moderate`).set(as(ADMIN))
    .send({ action: 'hide', note: 'Reviewer is a relative of the owner' });
  expect(hidden.status).toBe(200);
  expect(hidden.body).toMatchObject({ status: 'Hidden', shopRating: 4 });
  expect(await rating()).toBe(4);
  const listed = await request(app).get(`/shops/${SHOP}/reviews`);
  expect(listed.body.data.map((r) => String(r.id))).not.toContain(String(review.id));
  const after = await request(app).get('/admin/commerce/review-reports').set(as(ADMIN));
  expect(after.body.data.find((r) => String(r.review_id) === String(review.id))).toBeUndefined();
  const closed = await queryMany('SELECT status, resolution, resolved_by FROM review_reports WHERE review_id = $1', [String(review.id)]);
  expect(closed).toHaveLength(2);
  expect(closed.every((r) => r.status === 'resolved' && r.resolution === 'hide' && String(r.resolved_by) === String(ADMIN))).toBe(true);

  // Keeping it publishes it again, and it counts again.
  const kept = await request(app).post(`/admin/commerce/review-reports/${review.id}/moderate`).set(as(ADMIN)).send({ action: 'keep' });
  expect(kept.body).toMatchObject({ status: 'Published', shopRating: 4.5 });
  expect((await request(app).post(`/admin/commerce/review-reports/${review.id}/moderate`).set(as(ADMIN)).send({ action: 'delete' })).status).toBe(400);
});

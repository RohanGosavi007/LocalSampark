/**
 * Provider side of home-service bookings: what /service-dashboard reads and
 * writes. Engine-agnostic (no SQLite pin).
 */
const crypto = require('crypto');
const express = require('express');
const request = require('supertest');

let mockCurrentUser = null;
jest.mock('../../middleware/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    if (!mockCurrentUser) return res.status(401).json({ error: 'unauthenticated' });
    req.user = mockCurrentUser;
    next();
  },
  requireAdmin: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));
// The GTM rollout gate is not what is under test here.
jest.mock('../../middleware/feature.middleware', () => ({ requireFeature: () => (req, res, next) => next() }));

const { query, queryOne } = require('../../config/database');

const u = () => crypto.randomUUID();
const providerUser = u();
const otherUser = u();
const customer = u();
const providerId = `hsp-${u()}`;
const categoryId = `hsc-${u()}`;
const bookingId = u();
const tail = String(Date.now()).slice(-6);

let app;
beforeAll(async () => {
  for (const [id, phone, role] of [[providerUser, `+919101${tail}`, 'service_provider'], [otherUser, `+919102${tail}`, 'service_provider'], [customer, `+919103${tail}`, 'user']]) {
    await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [id, `User ${role}`, phone, role]);
  }
  await query('INSERT INTO home_service_categories (id, name) VALUES ($1, $2)', [categoryId, 'Plumbing']);
  await query(
    `INSERT INTO home_service_providers (id, user_id, name, phone, category_id, hourly_rate, rating, is_available)
     VALUES ($1, $2, 'Ravi Plumbing', '9101000000', $3, 300, 4.5, '1')`,
    [providerId, providerUser, categoryId]
  );
  await query(
    `INSERT INTO home_service_bookings (id, booking_ref, user_id, customer_id, provider_id, category_id, booking_date, time_slot, service_address, pincode, inspection_fee, status, created_at)
     VALUES ($1, $2, $3, $3, $4, $5, '2026-11-10', '10:00-12:00', 'Dhanori', '411015', 199, 'pending', CURRENT_TIMESTAMP)`,
    [bookingId, `HS-T${tail}`, customer, providerId, categoryId]
  );

  app = express();
  app.use(express.json());
  app.use('/home-services', require('../../modules/services/routes/home-services.routes'));
  app.use('/', require('../../modules/core/routes/dashboards.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterAll(async () => {
  await query('DELETE FROM home_service_bookings WHERE id = $1', [bookingId]);
  await query('DELETE FROM home_service_providers WHERE id = $1', [providerId]);
  await query('DELETE FROM home_service_categories WHERE id = $1', [categoryId]);
  for (const id of [providerUser, otherUser, customer]) await query('DELETE FROM users WHERE id = $1', [id]);
});

const as = (id) => { mockCurrentUser = { id, role: 'service_provider' }; };

test('a provider sees the bookings made with their profile, with the customer name', async () => {
  as(providerUser);
  const res = await request(app).get('/home-services/provider/bookings');
  expect(res.status).toBe(200);
  expect(res.body.bookings).toHaveLength(1);
  expect(res.body.bookings[0]).toMatchObject({ id: bookingId, status: 'pending', category_name: 'Plumbing', customer_name: 'User user' });

  as(otherUser);
  expect((await request(app).get('/home-services/provider/bookings')).body.bookings).toEqual([]);
});

test('the service dashboard counts bookings by provider profile, not by user id', async () => {
  as(providerUser);
  const res = await request(app).get('/services/dashboard');
  expect(res.status).toBe(200);
  expect(res.body.stats).toMatchObject({ activeServices: 1, upcomingBookings: 1, avgRating: 4.5 });
});

test('another provider cannot change the booking', async () => {
  as(otherUser);
  const res = await request(app).put(`/home-services/provider/bookings/${bookingId}/status`).send({ status: 'confirmed' });
  expect(res.status).toBe(403);
});

test('status moves only along the allowed path, and completion needs the final bill', async () => {
  as(providerUser);
  const go = (body) => request(app).put(`/home-services/provider/bookings/${bookingId}/status`).send(body);

  expect((await go({ status: 'completed', totalAmount: 500 })).status).toBe(409);
  expect((await go({ status: 'confirmed' })).status).toBe(200);
  expect((await go({ status: 'in_progress' })).status).toBe(200);
  expect((await go({ status: 'completed' })).status).toBe(400);
  expect((await go({ status: 'completed', totalAmount: 650 })).status).toBe(200);

  const row = await queryOne('SELECT status, total_amount FROM home_service_bookings WHERE id = $1', [bookingId]);
  expect(row.status).toBe('completed');
  expect(Number(row.total_amount)).toBe(650);
  const prov = await queryOne('SELECT total_jobs FROM home_service_providers WHERE id = $1', [providerId]);
  expect(Number(prov.total_jobs)).toBe(1);

  const dash = await request(app).get('/services/dashboard');
  expect(dash.body.stats.totalEarnings).toBe(650);
});

test('availability toggles the provider profile and needs a boolean', async () => {
  as(providerUser);
  expect((await request(app).put('/home-services/provider/availability').send({ available: 'no' })).status).toBe(400);
  expect((await request(app).put('/home-services/provider/availability').send({ available: false })).status).toBe(200);
  const me = await request(app).get('/home-services/provider/me');
  expect(me.body.providers[0]).toMatchObject({ id: providerId, available: false, categoryName: 'Plumbing' });

  mockCurrentUser = { id: customer, role: 'user' };
  expect((await request(app).put('/home-services/provider/availability').send({ available: true })).status).toBe(404);
});

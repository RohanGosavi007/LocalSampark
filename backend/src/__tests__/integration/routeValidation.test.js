/**
 * Input that is wrong is refused at the door, and input that is right still works.
 *
 * Until the shared validator (middleware/validate.js) these routes checked their
 * body by hand, if at all: a rating of 99, a latitude of 9999, a 4 MB name or an
 * array where a string belonged reached the database. Each case below sends a
 * bad value to the real route through the whole API. Each route also gets one
 * GOOD request, so a schema that is stricter than the clients cannot ship quietly.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const apiRouter = require('../../routes');
const { errorHandler } = require('../../middleware/error.middleware');

const USER = fx('rv-user');
let app;

const token = async () => {
  const row = await queryOne('SELECT token_version FROM users WHERE id = $1', [USER]);
  return `Bearer ${jwt.sign({ userId: USER, tokenVersion: Number(row && row.token_version) || 0 }, getJwtSecret(), { expiresIn: '10m' })}`;
};
const call = async (method, url, body, signedIn = true) => {
  let req = request(app)[method](`/api/v1${url}`);
  if (signedIn) req = req.set('Authorization', await token());
  return req.send(body);
};
const refused = (res, field) => {
  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
  expect(typeof res.body.error).toBe('string');
  if (field) expect(res.body.errors.map((e) => e.field)).toContain(field);
};
/** Not stopped by the validator (it may still fail later, for its own reasons). */
const passedValidation = (res) => !(res.status === 400 && Array.isArray(res.body && res.body.errors));

beforeAll(async () => {
  await query('DELETE FROM users WHERE id = $1', [USER]);
  await query("INSERT INTO users (id, full_name, phone_number, role, token_version) VALUES ($1, 'RV', '9867000001', 'user', '0')", [USER]);
  app = express();
  app.use(express.json());
  app.use(require('cookie-parser')());
  app.use('/api/v1', apiRouter);
  app.use(errorHandler);
});
afterAll(async () => {
  await query('DELETE FROM sos_alerts WHERE user_id = $1', [USER]);
  await query('DELETE FROM posts WHERE user_id = $1', [USER]);
  await query('DELETE FROM users WHERE id = $1', [USER]);
});

describe('payments', () => {
  test('a payment order needs a purpose and a sane amount', async () => {
    refused(await call('post', '/payments/razorpay/order', {}), 'purpose');
    refused(await call('post', '/payments/razorpay/order', { purpose: 'x'.repeat(50) }), 'purpose');
    refused(await call('post', '/payments/razorpay/order', { purpose: 'wallet_topup', amount: -5 }), 'amount');
    refused(await call('post', '/payments/razorpay/order', { purpose: 'wallet_topup', amount: 'lots' }), 'amount');
    refused(await call('post', '/payments/razorpay/order', { purpose: 'wallet_topup', amount: 1e9 }), 'amount');
  });
  test('a well-formed one reaches the payment service', async () => {
    expect(passedValidation(await call('post', '/payments/razorpay/order', { purpose: 'wallet_topup', amount: 100 }))).toBe(true);
  });
  test('verification fields are bounded', async () => {
    refused(await call('post', '/payments/razorpay/verify', { razorpay_order_id: 'o'.repeat(500) }), 'razorpay_order_id');
  });
});

describe('sign-in', () => {
  test('send-otp needs a phone number of a believable length', async () => {
    refused(await call('post', '/auth/send-otp', {}, false), 'phoneNumber');
    refused(await call('post', '/auth/send-otp', { phoneNumber: '9'.repeat(40) }, false), 'phoneNumber');
    expect(passedValidation(await call('post', '/auth/send-otp', { phoneNumber: '+919876543210' }, false))).toBe(true);
  });
  test('verify-otp wants a 4–8 digit code', async () => {
    refused(await call('post', '/auth/verify-otp', { phoneNumber: '+919876543210' }, false), 'otp');
    refused(await call('post', '/auth/verify-otp', { phoneNumber: '+919876543210', otp: 'abcdef' }, false), 'otp');
    refused(await call('post', '/auth/verify-otp', { phoneNumber: '+919876543210', otp: '12' }, false), 'otp');
    expect(passedValidation(await call('post', '/auth/verify-otp', { phoneNumber: '+919876543210', otp: '123456' }, false))).toBe(true);
    expect(passedValidation(await call('post', '/auth/verify-otp', { phoneNumber: '+919876543210', otp: 123456 }, false))).toBe(true); // a number is fine
  });
});

describe('profile', () => {
  test('email must be an email, names must be bounded', async () => {
    refused(await call('put', '/users/me', { email: 'not-an-email' }), 'email');
    refused(await call('put', '/users/me', { fullName: 'n'.repeat(101) }), 'fullName');
    expect(passedValidation(await call('put', '/users/me', { fullName: 'Asha K', email: 'asha@example.com' }))).toBe(true);
  });
});

describe('SOS', () => {
  test('a position must be on Earth', async () => {
    refused(await call('post', '/sos/trigger', { type: 'medical', latitude: 9999, longitude: 10 }), 'latitude');
    refused(await call('post', '/sos/trigger', { type: 'medical', latitude: 10, longitude: -500 }), 'longitude');
  });
  test('a real alert, with or without a position, still goes out', async () => {
    expect(passedValidation(await call('post', '/sos/trigger', { type: 'medical', latitude: 18.59, longitude: 73.89 }))).toBe(true);
    expect(passedValidation(await call('post', '/sos/trigger', { type: 'medical', latitude: null, longitude: null }))).toBe(true);
    expect(passedValidation(await call('post', '/sos/trigger', { type: 'medical' }))).toBe(true);
  });
});

describe('community feed', () => {
  test('post length and media count are bounded', async () => {
    refused(await call('post', '/feed/posts', { content: 'x'.repeat(5001) }), 'content');
    refused(await call('post', '/feed/posts', { content: 'hi', mediaUrls: Array.from({ length: 11 }, (_, i) => `/uploads/${i}.jpg`) }), 'mediaUrls');
    refused(await call('post', '/feed/posts', { content: 'hi', mediaUrls: 'not-a-list' }), 'mediaUrls');
  });
  test('a post with relative upload paths (what the apps send) passes', async () => {
    expect(passedValidation(await call('post', '/feed/posts', { content: 'hello', mediaUrls: ['/uploads/a.jpg'] }))).toBe(true);
  });
});

describe('jobs', () => {
  test('applying needs a job', async () => {
    refused(await call('post', '/jobs/apply', {}), 'jobId');
    refused(await call('post', '/jobs/apply', { jobId: 'j', experienceSummary: 'x'.repeat(2001) }), 'experienceSummary');
    expect(passedValidation(await call('post', '/jobs/apply', { jobId: 'no-such-job' }))).toBe(true); // 404 from the handler, not the validator
  });
});

describe('carpool', () => {
  test('seats are 1–8; a ride is bounded', async () => {
    refused(await call('post', '/carpool/rides/r1/book', { seats_booked: 0 }), 'seats_booked');
    refused(await call('post', '/carpool/rides/r1/book', { seats_booked: 9 }), 'seats_booked');
    refused(await call('post', '/carpool/rides/r1/book', { seats_booked: 1.5 }), 'seats_booked');
    refused(await call('post', '/carpool/rides', { from_location: 'A', to_location: 'B', seats_available: 40 }), 'seats_available');
    refused(await call('post', '/carpool/rides', { from_location: 'A', to_location: 'B', from_lat: 500 }), 'from_lat');
    expect(passedValidation(await call('post', '/carpool/rides/r1/book', { seats_booked: 2 }))).toBe(true);
    expect(passedValidation(await call('post', '/carpool/rides/r1/book', {}))).toBe(true); // seats default to 1
  });
});

describe('marketplace', () => {
  test('a listing needs a believable price and title', async () => {
    refused(await call('post', '/marketplace', { title: 'Bike', price: -1 }), 'price');
    refused(await call('post', '/marketplace', { title: 't'.repeat(201), price: 10 }), 'title');
    refused(await call('post', '/marketplace', { title: 'Bike', price: 10, photo_urls: 'x' }), 'photo_urls');
    expect(passedValidation(await call('post', '/marketplace', { title: 'Bike', price: 1500 }))).toBe(true);
  });
});

describe('bills', () => {
  test('provider and amount are checked before anything is charged', async () => {
    refused(await call('post', '/bills/pay', { provider: 'tata', amount: 'abc' }), 'amount');
    refused(await call('post', '/bills/pay', { amount: 100 }), 'provider');
    refused(await call('post', '/bills/pay', { provider: 'tata', amount: 1e7 }), 'amount');
  });
});

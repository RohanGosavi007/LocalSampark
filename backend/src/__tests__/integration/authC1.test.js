/**
 * C1: signing out of one device or all of them, and the launch sign-in methods
 * of Decision D3 (email OTP; phone OTP behind ENABLE_PHONE_OTP).
 */
const express = require('express');
const request = require('supertest');
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query, queryOne } = require('../../config/database');
const { authenticate, generateTokens, phoneOtpEnabled } = require('../../middleware/auth.middleware');

const USER = fx('c1x-user');
let app;
const saved = {};

async function cleanup() {
  await query(`DELETE FROM revoked_sessions WHERE CAST(user_id AS TEXT) LIKE '${fxLike('c1x')}'`);
  await query("DELETE FROM revoked_sessions WHERE user_id IN (SELECT CAST(id AS TEXT) FROM users WHERE email LIKE 'c1x-%@example.com')");
  await query("DELETE FROM users WHERE email LIKE 'c1x-%@example.com'");
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('c1x')}'`);
}

beforeAll(async () => {
  saved.free = process.env.ALLOW_FREE_OTP_MODE;
  saved.phone = process.env.ENABLE_PHONE_OTP;
  process.env.ALLOW_FREE_OTP_MODE = 'true';
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role, email) VALUES ($1, 'C1 User', '9833020101', 'user', 'c1x-existing@example.com')", [USER]);
  app = express();
  app.use(express.json());
  app.use('/auth', require('../../modules/core/routes/auth.routes'));
  app.get('/whoami', authenticate, (req, res) => res.json({ id: req.user.id }));
});

afterAll(async () => {
  await cleanup();
  for (const [k, v] of [['ALLOW_FREE_OTP_MODE', saved.free], ['ENABLE_PHONE_OTP', saved.phone]]) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

const signIn = () => generateTokens(USER, 'user', 0);
const whoami = (t) => request(app).get('/whoami').set('Authorization', `Bearer ${t}`);
const refresh = (t) => request(app).post('/auth/refresh-token').send({ refreshToken: t });

test('[C1.10] signing out of this device leaves the others signed in; signing out everywhere ends them all', async () => {
  const phone = signIn();
  const laptop = signIn();
  expect(phone.sid).not.toBe(laptop.sid);

  const out = await request(app).post('/auth/logout').set('Authorization', `Bearer ${phone.accessToken}`).send({});
  expect(out.body).toMatchObject({ success: true, allDevices: false });
  expect((await whoami(phone.accessToken)).status).toBe(401);
  expect((await refresh(phone.refreshToken)).status).toBe(401);
  expect((await whoami(laptop.accessToken)).status).toBe(200);

  const all = await request(app).post('/auth/logout').set('Authorization', `Bearer ${laptop.accessToken}`).send({ allDevices: true });
  expect(all.body).toMatchObject({ success: true, allDevices: true });
  expect((await whoami(laptop.accessToken)).status).toBe(401);
  await query('UPDATE users SET token_version = 0 WHERE id = $1', [USER]);
});

test('[C1.11] a refreshed session is the same session: signing it out ends the new tokens too', async () => {
  const first = signIn();
  const renewed = await refresh(first.refreshToken);
  expect(renewed.status).toBe(200);
  expect((await whoami(renewed.body.accessToken)).status).toBe(200);
  await request(app).post('/auth/logout').set('Authorization', `Bearer ${renewed.body.accessToken}`).send({});
  expect((await whoami(renewed.body.accessToken)).status).toBe(401);
  expect((await refresh(renewed.body.refreshToken)).status).toBe(401);
});

test('[C1.12] phone OTP is closed unless switched on, and off by default in production (Decision D3)', async () => {
  expect(phoneOtpEnabled({ NODE_ENV: 'production' })).toBe(false);
  expect(phoneOtpEnabled({ NODE_ENV: 'production', ENABLE_PHONE_OTP: 'true' })).toBe(true);
  expect(phoneOtpEnabled({ NODE_ENV: 'development' })).toBe(true);

  process.env.ENABLE_PHONE_OTP = 'false';
  try {
    for (const [path, body] of [['/auth/send-otp', { phoneNumber: '+919812300001' }], ['/auth/verify-otp', { phoneNumber: '+919812300001', otp: '123456' }], ['/auth/send-whatsapp-otp', { phoneNumber: '+919812300001' }]]) {
      const res = await request(app).post(path).send(body);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PHONE_OTP_DISABLED');
    }
    const methods = await request(app).get('/auth/methods');
    expect(methods.body.methods).toMatchObject({ emailOtp: true, phoneOtp: false });
  } finally {
    process.env.ENABLE_PHONE_OTP = saved.phone === undefined ? '' : saved.phone;
    if (saved.phone === undefined) delete process.env.ENABLE_PHONE_OTP;
  }
});

test('[C1.13] email OTP signs a new customer up and an existing one in; the code works once', async () => {
  const email = `c1x-new-${Date.now()}@example.com`;
  expect((await request(app).post('/auth/email/send-otp').send({ email: 'not-an-email' })).status).toBe(400);
  const sent = await request(app).post('/auth/email/send-otp').send({ email: email.toUpperCase() });
  expect(sent.status).toBe(200);
  const code = sent.body.otp;
  expect(code).toMatch(/^\d{4,8}$/);

  expect((await request(app).post('/auth/email/verify-otp').send({ email, otp: '000000' === code ? '111111' : '000000' })).status).toBe(400);
  const needsName = await request(app).post('/auth/email/verify-otp').send({ email, otp: code });
  expect(needsName.body).toMatchObject({ registered: false });

  const created = await request(app).post('/auth/email/verify-otp').send({ email, otp: code, fullName: 'New Customer' });
  expect(created.status).toBe(200);
  expect(created.body).toMatchObject({ registered: true, user: { email, fullName: 'New Customer', phone: null } });
  expect((await whoami(created.body.accessToken)).status).toBe(200);
  const row = await queryOne('SELECT phone_number FROM users WHERE email = $1', [email]);
  expect(row.phone_number.length).toBeLessThanOrEqual(15);
  // The code is spent.
  expect((await request(app).post('/auth/email/verify-otp').send({ email, otp: code, fullName: 'Again' })).status).toBe(400);

  // An existing account signs in with its email.
  const again = await request(app).post('/auth/email/send-otp').send({ email: 'c1x-existing@example.com' });
  const signedIn = await request(app).post('/auth/email/verify-otp').send({ email: 'c1x-existing@example.com', otp: again.body.otp });
  expect(signedIn.body).toMatchObject({ registered: true, user: { id: USER } });
});

test('[C1.14] in production, with no mail server, email sign-in says so rather than claiming a code was sent', async () => {
  const env = { NODE_ENV: process.env.NODE_ENV, SMTP_USER: process.env.SMTP_USER };
  process.env.NODE_ENV = 'production';
  delete process.env.SMTP_USER;
  try {
    const res = await request(app).post('/auth/email/send-otp').send({ email: 'c1x-prod@example.com' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('EMAIL_NOT_CONFIGURED');
    expect(res.body.otp).toBeUndefined();
  } finally {
    process.env.NODE_ENV = env.NODE_ENV;
    if (env.SMTP_USER !== undefined) process.env.SMTP_USER = env.SMTP_USER;
  }
});

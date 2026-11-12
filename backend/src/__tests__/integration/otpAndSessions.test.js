/**
 * Login codes and sessions.
 *
 *   - a code could be guessed at without limit for its whole life;
 *   - any number of codes could be sent to one phone;
 *   - outside "production" exactly, the code came back in the response and
 *     twelve demo numbers logged in with 123456 — one of them a super admin;
 *   - with no SMS provider the code was printed to the server log and the user
 *     told it had been sent;
 *   - a refresh token ignored every form of sign-out, and logout did nothing.
 */


const { fx, fxLike } = require('../helpers/fixtureIds');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../../config/database');
const { getJwtSecret } = require('../../config/secrets');
const otpStore = require('../../modules/core/services/otpStore.service');
const { sendOTP } = require('../../modules/core/services/sms.service');

const PHONE = '+919812345001';
const USER = fx('otp-user-1');

let app;

async function cleanup() {
  await query('DELETE FROM users WHERE id = $1 OR phone_number = $2', [USER, PHONE]);
}

function withEnv(value, fn) {
  const saved = process.env.NODE_ENV;
  if (value === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = value;
  return Promise.resolve().then(fn).finally(() => { process.env.NODE_ENV = saved; });
}

beforeAll(async () => {
  await cleanup();
  await query("INSERT INTO users (id, full_name, phone_number, role, is_active) VALUES ($1, 'OTP User', $2, 'user', '1')", [USER, PHONE]);

  app = express();
  app.use(express.json());
  app.use('/auth', require('../../modules/core/routes/auth.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

beforeEach(() => otpStore.__memoryStore.clear());
afterAll(cleanup);

describe('a login code', () => {
  test('is thrown away after five wrong guesses', async () => {
    await otpStore.setOtp('otp:+919800000111', '424242');

    for (let i = 0; i < otpStore.MAX_WRONG_GUESSES; i += 1) {
      expect(await otpStore.verifyAndConsume('otp:+919800000111', '000000')).toBe(false);
    }
    // The right code no longer works: it has been discarded.
    expect(await otpStore.verifyAndConsume('otp:+919800000111', '424242')).toBe(false);
  });

  test('a new code starts with a clean count, and works once', async () => {
    await otpStore.setOtp('otp:+919800000112', '111111');
    for (let i = 0; i < 3; i += 1) await otpStore.verifyAndConsume('otp:+919800000112', '000000');

    await otpStore.setOtp('otp:+919800000112', '222222');
    for (let i = 0; i < 4; i += 1) await otpStore.verifyAndConsume('otp:+919800000112', '000000');
    expect(await otpStore.verifyAndConsume('otp:+919800000112', '222222')).toBe(true);
    expect(await otpStore.verifyAndConsume('otp:+919800000112', '222222')).toBe(false);
  });

  test('is sent to one number only so many times', async () => {
    const send = () => request(app).post('/auth/send-otp').send({ phoneNumber: '+91 98123 45002' });
    for (let i = 0; i < otpStore.MAX_SENDS_PER_WINDOW; i += 1) {
      expect((await send()).status).toBe(200);
    }
    // The same number written differently is the same number.
    const blocked = await request(app).post('/auth/send-otp').send({ phoneNumber: '+919812345002' });
    expect(blocked.status).toBe(429);
  });

  test('is only requested for something that is a phone number', async () => {
    for (const phoneNumber of ['', 'abc', '12345', "+91'; DROP TABLE users;--", { $ne: null }]) {
      const res = await request(app).post('/auth/send-otp').send({ phoneNumber });
      expect(res.status).toBe(400);
    }
  });

  test('outside development and test: not echoed back, not printed, and reported as failed when nothing sent it', async () => {
    for (const env of ['production', 'staging', undefined]) {
      // eslint-disable-next-line no-await-in-loop
      await withEnv(env, async () => {
        const log = jest.spyOn(console, 'log').mockImplementation(() => {});
        const error = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
          const result = await sendOTP('+919812345003', '987654');
          expect(result.success).toBe(false);
          expect(log.mock.calls.flat().join(' ')).not.toContain('987654');
        } finally {
          log.mockRestore();
          error.mockRestore();
        }
      });
    }
  });

  test('demo numbers get no fixed code on a staging server', async () => {
    await withEnv('staging', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      // Phone sign-in is off outside development unless switched on (Decision
      // D3, C1); this is about a server where it has been switched on.
      const phoneFlag = process.env.ENABLE_PHONE_OTP;
      process.env.ENABLE_PHONE_OTP = 'true';
      try {
        const res = await request(app).post('/auth/send-otp').send({ phoneNumber: '+919000000012' });
        // No SMS provider here, so the honest answer is that it was not sent…
        expect(res.status).toBe(503);
        expect(res.body.otp).toBeUndefined();
        // …and the well-known code does not log a super administrator in.
        const login = await request(app).post('/auth/verify-otp').send({ phoneNumber: '+919000000012', otp: '123456' });
        expect(login.status).toBe(400);
        expect(login.body.accessToken).toBeUndefined();
      } finally {
        if (phoneFlag === undefined) delete process.env.ENABLE_PHONE_OTP; else process.env.ENABLE_PHONE_OTP = phoneFlag;
        error.mockRestore();
      }
    });
  });
});

describe('a session', () => {
  async function login() {
    const sent = await request(app).post('/auth/send-otp').send({ phoneNumber: PHONE });
    const res = await request(app).post('/auth/verify-otp').send({ phoneNumber: PHONE, otp: sent.body.otp });
    expect(res.status).toBe(200);
    return res.body;
  }
  const refresh = (refreshToken) => request(app).post('/auth/refresh-token').send({ refreshToken });

  test('refresh returns a new pair', async () => {
    const session = await login();
    const res = await refresh(session.refreshToken);
    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.accessToken, getJwtSecret()).userId).toBe(session.user.id);
    expect(typeof res.body.refreshToken).toBe('string');
  });

  test('logging out ends it: the refresh token stops working', async () => {
    const session = await login();

    const out = await request(app).post('/auth/logout').set('Authorization', `Bearer ${session.accessToken}`);
    expect(out.status).toBe(200);

    expect((await refresh(session.refreshToken)).status).toBe(401);
    // The access token is refused too: every authenticated request compares versions.
    const again = await request(app).post('/auth/logout').set('Authorization', `Bearer ${session.accessToken}`);
    expect(again.status).toBe(401);
  });

  test('a deactivated account cannot refresh', async () => {
    const session = await login();
    await query("UPDATE users SET is_active = '0' WHERE id = $1", [session.user.id]);
    try {
      expect((await refresh(session.refreshToken)).status).toBe(403);
    } finally {
      await query("UPDATE users SET is_active = '1' WHERE id = $1", [session.user.id]);
    }
  });

  test('a made-up refresh token is refused', async () => {
    expect((await refresh('not-a-token')).status).toBe(401);
    expect((await refresh(jwt.sign({ userId: USER, tokenVersion: 0 }, 'the-wrong-secret'))).status).toBe(401);
    expect((await request(app).post('/auth/refresh-token').send({})).status).toBe(400);
    expect((await queryOne('SELECT id FROM users WHERE id = $1', [USER]))).not.toBeNull();
  });
});

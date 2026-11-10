/**
 * The development admin login must not exist outside development.
 *
 * POST /admin-auth/login has a shortcut for local work: a fixed phone number
 * and PIN that skip the OTP, create the account as super_admin if it is
 * missing, waive the IP allowlist and accept the PIN with no stored hash. The
 * condition that enabled it was
 *
 *     (phoneNumber === '+919999999991' && pin === '123456') || (NODE_ENV !== 'production' && …)
 *
 * and the first half had no environment check. Both values are in the source,
 * and in the admin app's login page, so on the live system one unauthenticated
 * request returned a super-admin session.
 *
 * These run the real router with NODE_ENV set to what each deployment would
 * have. The route reads it per request, so it can be changed between cases.
 */


const express = require('express');
const request = require('supertest');
const { query, queryOne } = require('../../config/database');

const DEV_PHONE = '+919999999991';
const DEV_PIN = '123456';

let app;
const originalEnv = process.env.NODE_ENV;

async function removeDevAdmin() {
  const user = await queryOne('SELECT id FROM users WHERE phone_number = $1', [DEV_PHONE]);
  if (!user) return;
  await query('DELETE FROM admin_pins WHERE user_id = $1', [user.id]);
  await query('DELETE FROM admin_audit_log WHERE admin_id = $1', [user.id]);
  await query('DELETE FROM users WHERE id = $1', [user.id]);
}

beforeAll(async () => {
  await removeDevAdmin();
  app = express();
  app.use(express.json());
  app.use('/admin-auth', require('../../modules/crm/routes/admin-auth.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use(require('../../middleware/error.middleware').errorHandler);
});

afterEach(() => {
  process.env.NODE_ENV = originalEnv;
});

afterAll(async () => {
  process.env.NODE_ENV = originalEnv;
  await removeDevAdmin();
});

const login = (body) => request(app).post('/admin-auth/login').send(body);

describe.each([
  ['production', 'production'],
  ['staging', 'staging'],
  ['an unset NODE_ENV', undefined],
])('with %s', (_name, env) => {
  test('the development credentials do not sign anyone in or create an account', async () => {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;

    for (const otp of ['123456', '000000']) {
      const res = await login({ phoneNumber: DEV_PHONE, pin: DEV_PIN, otp });

      expect(res.status).not.toBe(200);
      expect(res.body.accessToken).toBeUndefined();
      expect(res.headers['set-cookie']).toBeUndefined();
    }

    // The shortcut also used to create the super_admin account on the way.
    process.env.NODE_ENV = originalEnv;
    const created = await queryOne('SELECT id, role FROM users WHERE phone_number = $1', [DEV_PHONE]);
    expect(created).toBeFalsy();
  });

  test('the demo number range is not a way in either', async () => {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;

    const res = await login({ phoneNumber: '+919000000012', pin: DEV_PIN, otp: '123456' });

    expect(res.status).not.toBe(200);
    expect(res.body.accessToken).toBeUndefined();
  });
});

test('in a test or development process the shortcut still works, which is what it is for', async () => {
  process.env.NODE_ENV = 'test';

  const res = await login({ phoneNumber: DEV_PHONE, pin: DEV_PIN, otp: '123456' });

  expect(res.status).toBe(200);
  expect(res.body.accessToken).toBeTruthy();
  expect(res.body.user.role).toBe('SUPER_ADMIN');
});

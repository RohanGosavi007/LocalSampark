/**
 * Provisioning an administrator, and signing in as one in production.
 *
 * The admin login needs a row in admin_pins. Nothing wrote one except the
 * development shortcut, so in production no administrator could ever sign in.
 * scripts/provision-admin.js closes that gap; these check the account it
 * produces against the real login route, in production mode, where none of the
 * development shortcuts apply.
 */

process.env.USE_SQLITE = 'true';

const express = require('express');
const request = require('supertest');
const { query, queryOne } = require('../../config/database');
const otpStore = require('../../modules/core/services/otpStore.service');
const { provisionAdmin, pinProblem, generatePin } = require('../../../scripts/provision-admin');

const PHONE = '+919811100777';
const PIN = '482915';

const originalEnv = process.env.NODE_ENV;
let app;

async function cleanup() {
  const user = await queryOne('SELECT id FROM users WHERE phone_number = $1', [PHONE]);
  if (!user) return;
  await query('DELETE FROM admin_pins WHERE user_id = $1', [user.id]);
  await query('DELETE FROM admin_roles WHERE user_id = $1', [user.id]);
  await query('DELETE FROM admin_audit_log WHERE admin_id = $1', [user.id]);
  await query('DELETE FROM users WHERE id = $1', [user.id]);
}

beforeAll(async () => {
  await cleanup();
  app = express();
  app.use(express.json());
  app.use('/admin-auth', require('../../modules/crm/routes/admin-auth.routes'));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
});

afterEach(() => { process.env.NODE_ENV = originalEnv; });
afterAll(async () => {
  process.env.NODE_ENV = originalEnv;
  await cleanup();
});

describe('PIN rules', () => {
  test.each(['123456', '654321', '000000', '111111', '121212', '123123', '12345', 'abcdef', '1234567'])(
    '%s is refused',
    (pin) => { expect(pinProblem(pin)).toBeTruthy(); }
  );

  test('an ordinary PIN is accepted, and a generated one always passes its own rules', () => {
    expect(pinProblem(PIN)).toBeNull();
    for (let i = 0; i < 200; i += 1) expect(pinProblem(generatePin())).toBeNull();
  });
});

test('creates the account, the admin role and a hashed PIN', async () => {
  const out = await provisionAdmin({ phone: PHONE, name: 'Provisioned Admin', pin: PIN });
  expect(out.created).toBe(true);

  const user = await queryOne('SELECT id, role, is_active FROM users WHERE phone_number = $1', [PHONE]);
  expect(user.role).toBe('super_admin');

  const role = await queryOne('SELECT role, is_active FROM admin_roles WHERE user_id = $1', [user.id]);
  expect(role.role).toBe('super_admin');

  const pin = await queryOne('SELECT pin_hash FROM admin_pins WHERE user_id = $1', [user.id]);
  expect(pin.pin_hash).not.toContain(PIN);
  expect(pin.pin_hash.startsWith('$2')).toBe(true);
});

test('refuses a weak PIN before touching the database', async () => {
  await expect(provisionAdmin({ phone: '+919811100778', name: 'Nobody', pin: '123456' }))
    .rejects.toThrow(/PIN/);
  expect(await queryOne('SELECT id FROM users WHERE phone_number = $1', ['+919811100778'])).toBeFalsy();
});

test('running it again replaces the PIN and clears a lock, without a second account', async () => {
  const user = await queryOne('SELECT id FROM users WHERE phone_number = $1', [PHONE]);
  await query(
    'UPDATE admin_pins SET failed_attempts = 5, locked_until = $1 WHERE user_id = $2',
    [new Date(Date.now() + 600000).toISOString(), user.id]
  );

  const out = await provisionAdmin({ phone: PHONE, pin: PIN });
  expect(out.created).toBe(false);
  expect(out.pinReset).toBe(true);

  const pin = await queryOne('SELECT failed_attempts, locked_until FROM admin_pins WHERE user_id = $1', [user.id]);
  expect(Number(pin.failed_attempts)).toBe(0);
  expect(pin.locked_until).toBeNull();

  const count = await queryOne('SELECT COUNT(*) AS n FROM users WHERE phone_number = $1', [PHONE]);
  expect(Number(count.n)).toBe(1);
});

describe('signing in as the provisioned admin, in production mode', () => {
  const login = (body) => request(app).post('/admin-auth/login').send(body);

  test('the right PIN and a real OTP return a session', async () => {
    // The OTP is issued before NODE_ENV changes: in production the store
    // requires Redis, which is the deployment's concern and not this test's.
    await otpStore.setOtp(`otp:${PHONE}`, '774411');
    const unavailable = jest.spyOn(otpStore, 'unavailableReason').mockReturnValue(null);
    process.env.NODE_ENV = 'production';

    const res = await login({ phoneNumber: PHONE, pin: PIN, otp: '774411' });
    unavailable.mockRestore();

    expect(res.body.error).toBeUndefined();
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe('SUPER_ADMIN');
  });

  test('the wrong PIN is refused even with a valid OTP', async () => {
    await otpStore.setOtp(`otp:${PHONE}`, '774412');
    const unavailable = jest.spyOn(otpStore, 'unavailableReason').mockReturnValue(null);
    process.env.NODE_ENV = 'production';

    const res = await login({ phoneNumber: PHONE, pin: '482916', otp: '774412' });
    unavailable.mockRestore();

    expect(res.status).toBe(401);
    expect(res.body.accessToken).toBeUndefined();
  });

  test('the right PIN with a wrong OTP is refused', async () => {
    const unavailable = jest.spyOn(otpStore, 'unavailableReason').mockReturnValue(null);
    process.env.NODE_ENV = 'production';

    const res = await login({ phoneNumber: PHONE, pin: PIN, otp: '000001' });
    unavailable.mockRestore();

    expect(res.status).toBe(401);
    expect(res.body.accessToken).toBeUndefined();
  });
});

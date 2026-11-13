/**
 * An Expo push endpoint that never answers must not hold the request that
 * sent the notification. push.service bounds the wait (PUSH_TIMEOUT_MS) and
 * counts the batch as failed; sendToUser never throws.
 */
const { fx, fxLike } = require('../helpers/fixtureIds');
const { query } = require('../../config/database');

const USER = fx('pto-user');
const TOKEN = 'ExponentPushToken[timeouttimeouttimeout]';

let push;
let realFetch;

beforeAll(async () => {
  await query(`DELETE FROM user_fcm_tokens WHERE CAST(user_id AS TEXT) LIKE '${fxLike('pto')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('pto')}'`);
  await query('INSERT INTO users (id, full_name, phone_number, role) VALUES ($1, $2, $3, $4)', [USER, 'Push Timeout', '9833909090', 'user']);
  await query('INSERT INTO user_fcm_tokens (id, user_id, fcm_token) VALUES ($1, $2, $3)', [fx('pto-token'), USER, TOKEN]);

  process.env.PUSH_TIMEOUT_MS = '300';
  jest.isolateModules(() => { push = require('../../services/push.service'); });
  push._setTransportForTests(null); // the real fetch path
  realFetch = global.fetch;
});

afterAll(async () => {
  global.fetch = realFetch;
  delete process.env.PUSH_TIMEOUT_MS;
  await query(`DELETE FROM user_fcm_tokens WHERE CAST(user_id AS TEXT) LIKE '${fxLike('pto')}'`);
  await query(`DELETE FROM users WHERE CAST(id AS TEXT) LIKE '${fxLike('pto')}'`);
});

test('a push endpoint that never answers is abandoned after the timeout; the send reports a failure, not a hang', async () => {
  let sawSignal = false;
  // Never resolves on its own: only the abort signal ends it.
  global.fetch = jest.fn((url, init) => new Promise((resolve, reject) => {
    sawSignal = Boolean(init && init.signal);
    if (init && init.signal) init.signal.addEventListener('abort', () => reject(init.signal.reason || new Error('aborted')));
  }));

  const started = Date.now();
  const result = await push.sendToUser(USER, { title: 'Order update', body: 'Your order is ready' });
  const elapsed = Date.now() - started;

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(sawSignal).toBe(true);
  expect(result).toEqual({ sent: 0, failed: 1 });
  expect(elapsed).toBeLessThan(5000); // 300 ms timeout; generous for a loaded machine
}, 15000);

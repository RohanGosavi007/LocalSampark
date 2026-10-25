/**
 * The response cache must never serve one user's answer to another.
 *
 * Its key is pincode + zone + URL. Nothing in it says who is asking, so the
 * first signed-in response to a URL (a saved list, an admin's region list, a
 * personalised feed) used to be stored and replayed to everyone for the whole
 * TTL. It also stored every status, so one 500 was replayed too.
 */

const mockStore = new Map();
jest.mock('../../config/redis', () => ({
  cacheGet: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
  cacheSet: jest.fn(async (k, v) => { mockStore.set(k, v); }),
}));

const apiCache = require('../../middleware/cache.middleware');

/** Runs the middleware once and returns what it did. */
function run(req, { status = 200, body = { ok: true } } = {}) {
  return new Promise((resolve) => {
    const headers = {};
    const res = {
      statusCode: status,
      setHeader: (k, v) => { headers[k] = v; },
      json(data) { resolve({ served: headers['X-Cache'] === 'HIT' ? 'cache' : 'handler', data, headers }); return this; },
    };
    const request = { method: 'GET', originalUrl: '/x', url: '/x', query: {}, headers: {}, cookies: {}, ...req };
    apiCache(60)(request, res, () => {
      // The handler runs only on a miss or a bypass.
      res.json(body);
    });
  });
}

const settle = () => new Promise((r) => setImmediate(r));

beforeEach(() => mockStore.clear());

test('an anonymous GET is cached and then served from the cache', async () => {
  expect((await run({})).served).toBe('handler');
  await settle();
  expect([...mockStore.keys()]).toHaveLength(1);
  expect((await run({})).served).toBe('cache');
});

test.each([
  ['an Authorization header', { headers: { authorization: 'Bearer abc' } }],
  ['a session cookie', { cookies: { auth_token: 'abc' } }],
  ['a raw Cookie header', { headers: { cookie: 'admin_session=abc; theme=dark' } }],
  ['req.user', { user: { id: 'u1' } }],
])('a request with %s bypasses the cache entirely', async (_label, req) => {
  expect((await run(req, { body: { mine: 'u1' } })).served).toBe('handler');
  await settle();
  expect(mockStore.size).toBe(0);
});

test('a signed-in answer is never replayed to an anonymous caller', async () => {
  await run({ headers: { authorization: 'Bearer user-a' } }, { body: { saved: ['a-private-listing'] } });
  await settle();
  const anon = await run({}, { body: { saved: [] } });
  expect(anon.served).toBe('handler');
  expect(anon.data).toEqual({ saved: [] });
});

test.each([404, 500, 401])('a %i answer is not cached', async (status) => {
  await run({}, { status, body: { error: 'nope' } });
  await settle();
  expect(mockStore.size).toBe(0);
});

test('other methods are never cached', async () => {
  expect((await run({ method: 'POST' })).served).toBe('handler');
  await settle();
  expect(mockStore.size).toBe(0);
});

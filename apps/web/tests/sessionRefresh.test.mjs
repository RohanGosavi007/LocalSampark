/**
 * The web session survives a one-hour access token.
 *
 * 110 files call fetch() directly with the token they read from storage; only 11
 * use apiFetch. Without the interceptor each would begin failing an hour after
 * sign-in. Run with: npm test --workspace=apps/web
 */
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_API_URL = 'http://api.test';

// ─── a tiny browser ─────────────────────────────────────────
const store = new Map();
const events = [];
const calls = [];
let script = () => ({ status: 200, body: {} });

globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  dispatchEvent: (e) => { events.push(e.type); },
  fetch: async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const r = await script(String(url), init);
    if (r instanceof Error) throw r;
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body };
  },
};
window.bind = undefined;
const nativeFetch = window.fetch;
window.fetch = nativeFetch; // installAuthFetch binds and replaces this
globalThis.fetch = (...a) => window.fetch(...a);
globalThis.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };

const api = await import('../src/lib/api.js');
const { SESSION_KEYS, installAuthFetch, refreshSession, tokenExpiryMs, startSessionKeepAlive } = api;
installAuthFetch();
const patched = window.fetch;

const jwtWithExp = (expSeconds) => `h.${Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url')}.s`;
const reset = (access = 'old-access', refresh = 'old-refresh') => {
  store.clear(); events.length = 0; calls.length = 0;
  store.set(SESSION_KEYS.token, access);
  store.set(SESSION_KEYS.refreshToken, refresh);
};
const isRefresh = (url) => url.endsWith('/auth/refresh-token');

test('a 401 on a page\'s own fetch renews the session and repeats the request with the new token', async () => {
  reset();
  script = (url, init) => {
    if (isRefresh(url)) return { status: 200, body: { accessToken: 'new-access', refreshToken: 'new-refresh' } };
    return init.headers.Authorization === 'Bearer new-access' ? { status: 200, body: { ok: 1 } } : { status: 401, body: {} };
  };
  const res = await patched('http://api.test/api/v1/orders/my-orders', { headers: { Authorization: 'Bearer old-access' } });
  assert.equal(res.status, 200);
  assert.equal(store.get(SESSION_KEYS.token), 'new-access');
  assert.equal(store.get(SESSION_KEYS.refreshToken), 'new-refresh');
  assert.ok(events.includes('auth:refreshed'));
  assert.equal(calls.filter((c) => !isRefresh(c.url)).length, 2); // original + one retry
});

test('a POST is repeated with its body intact', async () => {
  reset();
  script = (url, init) => {
    if (isRefresh(url)) return { status: 200, body: { accessToken: 'new-access', refreshToken: 'r2' } };
    return init.headers.Authorization === 'Bearer new-access' ? { status: 201, body: {} } : { status: 401, body: {} };
  };
  const res = await patched('http://api.test/api/v1/orders', { method: 'POST', body: '{"a":1}', headers: { authorization: 'Bearer old-access' } });
  assert.equal(res.status, 201);
  const retry = calls.filter((c) => !isRefresh(c.url)).pop();
  assert.equal(retry.init.method, 'POST');
  assert.equal(retry.init.body, '{"a":1}');
  assert.equal(Object.keys(retry.init.headers).filter((k) => k.toLowerCase() === 'authorization').length, 1);
});

test('five requests failing at once cause ONE refresh', async () => {
  reset();
  script = async (url, init) => {
    if (isRefresh(url)) { await new Promise((r) => setTimeout(r, 30)); return { status: 200, body: { accessToken: 'new-access', refreshToken: 'r2' } }; }
    return init.headers.Authorization === 'Bearer new-access' ? { status: 200, body: {} } : { status: 401, body: {} };
  };
  const results = await Promise.all(Array.from({ length: 5 }, (_, i) =>
    patched(`http://api.test/api/v1/thing/${i}`, { headers: { Authorization: 'Bearer old-access' } })));
  assert.deepEqual(results.map((r) => r.status), [200, 200, 200, 200, 200]);
  assert.equal(calls.filter((c) => isRefresh(c.url)).length, 1);
});

test('a refresh the server REFUSES ends the session', async () => {
  reset();
  script = (url) => (isRefresh(url) ? { status: 401, body: { code: 'REFRESH_REUSED' } } : { status: 401, body: {} });
  const res = await patched('http://api.test/api/v1/orders/my-orders', { headers: { Authorization: 'Bearer old-access' } });
  assert.equal(res.status, 401);
  assert.equal(store.get(SESSION_KEYS.token) ?? null, null);
  assert.ok(events.includes('auth:expired'));
});

test('a refresh that merely cannot be completed (offline, server down) keeps the session', async () => {
  for (const failure of [new Error('offline'), { status: 503, body: {} }]) {
    reset();
    script = (url) => (isRefresh(url) ? failure : { status: 401, body: {} });
    const res = await patched('http://api.test/api/v1/orders/my-orders', { headers: { Authorization: 'Bearer old-access' } });
    assert.equal(res.status, 401);
    assert.equal(store.get(SESSION_KEYS.refreshToken), 'old-refresh', 'refresh token must survive');
    assert.ok(!events.includes('auth:expired'));
  }
});

test('two tabs refreshing together: this tab adopts the pair the other one stored', async () => {
  reset();
  script = (url, init) => {
    if (isRefresh(url)) {
      // The other tab won; by the time we look, it has stored its new pair.
      setTimeout(() => { store.set(SESSION_KEYS.token, 'tab2-access'); store.set(SESSION_KEYS.refreshToken, 'tab2-refresh'); }, 100);
      return { status: 401, body: { code: 'REFRESH_RACE' } };
    }
    return init.headers.Authorization === 'Bearer tab2-access' ? { status: 200, body: {} } : { status: 401, body: {} };
  };
  const res = await patched('http://api.test/api/v1/orders/my-orders', { headers: { Authorization: 'Bearer old-access' } });
  assert.equal(res.status, 200);
  assert.equal(store.get(SESSION_KEYS.refreshToken), 'tab2-refresh');
  assert.ok(!events.includes('auth:expired'));
});

test('a request that did not carry the user\'s token is left alone', async () => {
  reset();
  script = () => ({ status: 401, body: {} });
  const noAuth = await patched('http://api.test/api/v1/orders/my-orders', {});
  const otherSite = await patched('http://elsewhere.test/x', { headers: { Authorization: 'Bearer old-access' } });
  const admin = await patched('http://api.test/api/v1/admin/users', { headers: { Authorization: 'Bearer some-admin-token' } });
  const signIn = await patched('http://api.test/api/v1/auth/verify-otp', { method: 'POST', headers: { Authorization: 'Bearer old-access' } });
  assert.deepEqual([noAuth, otherSite, admin, signIn].map((r) => r.status), [401, 401, 401, 401]);
  assert.equal(calls.filter((c) => isRefresh(c.url)).length, 0);
  assert.equal(store.get(SESSION_KEYS.token), 'old-access');
});

test('a request already superseded by a rotation is repeated with the current token, without another refresh', async () => {
  reset('current-access', 'r');
  script = (url, init) => (init.headers.Authorization === 'Bearer current-access' ? { status: 200, body: {} } : { status: 401, body: {} });
  const res = await patched('http://api.test/api/v1/thing', { headers: { Authorization: 'Bearer stale-access' } });
  assert.equal(res.status, 200);
  assert.equal(calls.filter((c) => isRefresh(c.url)).length, 0);
});

test('tokenExpiryMs reads a JWT and shrugs off garbage', () => {
  assert.equal(tokenExpiryMs(jwtWithExp(2000000000)), 2000000000 * 1000);
  assert.equal(tokenExpiryMs('not-a-jwt'), null);
  assert.equal(tokenExpiryMs(''), null);
});

test('keep-alive renews a token about to expire, and leaves a fresh one alone', async () => {
  reset(jwtWithExp(Math.floor(Date.now() / 1000) + 120)); // 2 minutes left
  script = (url) => (isRefresh(url) ? { status: 200, body: { accessToken: jwtWithExp(Math.floor(Date.now() / 1000) + 3600), refreshToken: 'r2' } } : { status: 200, body: {} });
  const stop = startSessionKeepAlive();
  await new Promise((r) => setTimeout(r, 50));
  stop();
  assert.equal(calls.filter((c) => isRefresh(c.url)).length, 1);

  reset(jwtWithExp(Math.floor(Date.now() / 1000) + 3000)); // 50 minutes left
  const stop2 = startSessionKeepAlive();
  await new Promise((r) => setTimeout(r, 50));
  stop2();
  assert.equal(calls.filter((c) => isRefresh(c.url)).length, 0);
});

test('refreshSession with no refresh token says the session is over', async () => {
  reset(); store.delete(SESSION_KEYS.refreshToken);
  assert.equal(await refreshSession(), null);
});

/**
 * Silent token refresh on 401.
 *
 * This is the highest-risk unverified change in the app: the backend access
 * token was shortened from 7d to 1h on the strength of this flow existing, so a
 * bug here logs every user out hourly instead of weekly. No device is attached
 * to the build environment, so these tests stand in for the device session that
 * would otherwise be the only check on it.
 *
 * They cover the failure modes that actually produce that symptom: refresh not
 * being attempted, refresh looping, concurrent requests racing each other, and
 * a rotated refresh token being dropped.
 */
const asyncStorage = require('./__mocks__/asyncStorage');
const { SecureTokenStorage, __tokens } = require('./__mocks__/secureStorage');

const API = require('../src/lib/api');

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => 'application/json' },
  json: async () => body,
  text: async () => JSON.stringify(body),
});

beforeEach(() => {
  jest.clearAllMocks();
  __tokens.clear();
  asyncStorage.__store.clear();
  __tokens.set('authToken', 'expired-access-token');
  __tokens.set('refreshToken', 'valid-refresh-token');
});

afterEach(() => {
  delete global.fetch;
});

describe('401 handling', () => {
  it('refreshes and retries once, returning the retried result', async () => {
    const calls = [];
    global.fetch = jest.fn(async (url, opts) => {
      calls.push(url);
      if (String(url).includes('/auth/refresh-token')) {
        return jsonResponse(200, { accessToken: 'fresh-access-token' });
      }
      // First protected call 401s; after refresh it succeeds.
      const auth = opts?.headers?.Authorization || '';
      if (auth.includes('fresh-access-token')) return jsonResponse(200, { ok: true, data: 'payload' });
      return jsonResponse(401, { error: 'Unauthorized' });
    });

    const result = await API.apiGet('/protected');

    expect(result).toEqual({ ok: true, data: 'payload' });
    expect(calls.some((u) => String(u).includes('/auth/refresh-token'))).toBe(true);
    // The new access token must be persisted for subsequent requests.
    expect(__tokens.get('authToken')).toBe('fresh-access-token');
  });

  it('persists a rotated refresh token', async () => {
    global.fetch = jest.fn(async (url, opts) => {
      if (String(url).includes('/auth/refresh-token')) {
        return jsonResponse(200, { accessToken: 'a2', refreshToken: 'rotated-refresh' });
      }
      const auth = opts?.headers?.Authorization || '';
      return auth.includes('a2') ? jsonResponse(200, { ok: true }) : jsonResponse(401, {});
    });

    await API.apiGet('/protected');
    // Dropping a rotated token would make the *next* refresh fail — a bug that
    // only surfaces one token-lifetime later.
    expect(__tokens.get('refreshToken')).toBe('rotated-refresh');
  });

  it('clears the session when no refresh token is stored', async () => {
    __tokens.delete('refreshToken');
    global.fetch = jest.fn(async () => jsonResponse(401, { error: 'Unauthorized' }));

    await expect(API.apiGet('/protected')).rejects.toThrow();
    expect(__tokens.has('authToken')).toBe(false);
    expect(SecureTokenStorage.deleteToken).toHaveBeenCalledWith('refreshToken');
  });

  it('clears the session when the refresh endpoint rejects', async () => {
    global.fetch = jest.fn(async (url) =>
      String(url).includes('/auth/refresh-token')
        ? jsonResponse(401, { error: 'Invalid or expired refresh token' })
        : jsonResponse(401, { error: 'Unauthorized' })
    );

    await expect(API.apiGet('/protected')).rejects.toThrow();
    expect(__tokens.has('authToken')).toBe(false);
  });

  it('does not loop when the retried request also 401s', async () => {
    let protectedCalls = 0;
    let refreshCalls = 0;
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/auth/refresh-token')) {
        refreshCalls++;
        return jsonResponse(200, { accessToken: 'still-rejected' });
      }
      protectedCalls++;
      return jsonResponse(401, { error: 'Unauthorized' });
    });

    await expect(API.apiGet('/protected')).rejects.toThrow();
    // Exactly one retry: original + retry. An unbounded loop here would hammer
    // the auth endpoint from every client at once.
    expect(protectedCalls).toBe(2);
    expect(refreshCalls).toBe(1);
  });
});

describe('single-flight behaviour', () => {
  it('issues one refresh for a burst of concurrent 401s', async () => {
    let refreshCalls = 0;
    global.fetch = jest.fn(async (url, opts) => {
      if (String(url).includes('/auth/refresh-token')) {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 20)); // overlap the window
        return jsonResponse(200, { accessToken: 'shared-fresh-token' });
      }
      const auth = opts?.headers?.Authorization || '';
      return auth.includes('shared-fresh-token') ? jsonResponse(200, { ok: true }) : jsonResponse(401, {});
    });

    const results = await Promise.all([
      API.apiGet('/a'), API.apiGet('/b'), API.apiGet('/c'),
      API.apiGet('/d'), API.apiGet('/e'),
    ]);

    expect(results.every((r) => r.ok)).toBe(true);
    // Without single-flight this would be 5, and four of the five resulting
    // tokens would be discarded — on a rotating-refresh backend that
    // invalidates the session outright.
    expect(refreshCalls).toBe(1);
  });

  it('allows a fresh refresh after an earlier one settled', async () => {
    let refreshCalls = 0;
    global.fetch = jest.fn(async (url, opts) => {
      if (String(url).includes('/auth/refresh-token')) {
        refreshCalls++;
        return jsonResponse(200, { accessToken: `token-${refreshCalls}` });
      }
      const auth = opts?.headers?.Authorization || '';
      return auth.includes(`token-${refreshCalls}`) ? jsonResponse(200, { ok: true }) : jsonResponse(401, {});
    });

    await API.apiGet('/first');
    __tokens.set('authToken', 'expired-again');
    await API.apiGet('/second');

    // The in-flight promise must be released once settled, or the session can
    // never be refreshed a second time.
    expect(refreshCalls).toBe(2);
  });
});

describe('non-401 paths are untouched', () => {
  it('does not attempt refresh on a 500', async () => {
    let refreshCalls = 0;
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/auth/refresh-token')) { refreshCalls++; return jsonResponse(200, {}); }
      return jsonResponse(500, { error: 'Server error' });
    });

    await expect(API.apiGet('/boom')).rejects.toThrow();
    expect(refreshCalls).toBe(0);
    // A server error must not destroy the user's session.
    expect(__tokens.get('authToken')).toBe('expired-access-token');
  });

  it('does not attempt refresh on a successful request', async () => {
    let refreshCalls = 0;
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/auth/refresh-token')) { refreshCalls++; return jsonResponse(200, {}); }
      return jsonResponse(200, { ok: true });
    });

    await API.apiGet('/fine');
    expect(refreshCalls).toBe(0);
  });
});

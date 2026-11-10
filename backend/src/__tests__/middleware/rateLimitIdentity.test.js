/**
 * The global API limiter runs before any route authenticates. It used to read
 * req.user, which is never set at that point, so every caller got the
 * anonymous budget keyed by IP (60/min in production): a signed-in admin
 * using the console hit 429 within a few page loads (seen in the admin E2E
 * run, F-141). It now verifies the session token itself.
 */
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../../config/secrets');
const { rateLimitIdentity, getLimitForRole, zoneKeyGenerator } = require('../../middleware/rateLimit.middleware');

const sign = (claims, secret = getJwtSecret()) => jwt.sign({ tokenVersion: 0, ...claims }, secret, { expiresIn: '1h' });
const req = (extra = {}) => ({ headers: {}, cookies: {}, ip: '203.0.113.7', ...extra });

describe('rate limit identity', () => {
  test('[P9.3] an admin bearer token gets the admin budget, keyed by user', () => {
    const r = req({ headers: { authorization: `Bearer ${sign({ userId: 'admin-1', role: 'SUPER_ADMIN' })}` } });
    expect(rateLimitIdentity(r)).toEqual({ id: 'admin-1', role: 'SUPER_ADMIN' });
    expect(getLimitForRole(r)).toBe(1000);
    expect(zoneKeyGenerator(r, {})).toBe('global:admin-1');
  });

  test('[P9.4] the admin session cookie is honoured the same way', () => {
    const r = req({ cookies: { admin_token: sign({ id: 'admin-2', role: 'ADMIN' }) } });
    expect(getLimitForRole(r)).toBe(1000);
    expect(zoneKeyGenerator(r, {})).toBe('global:admin-2');
  });

  test('[P9.5] a token signed with another secret is anonymous', () => {
    const forged = sign({ userId: 'admin-1', role: 'SUPER_ADMIN' }, 'not-the-server-secret-at-all-0123456789');
    const r = req({ headers: { authorization: `Bearer ${forged}` } });
    expect(rateLimitIdentity(r)).toBeNull();
    expect(getLimitForRole(r)).toBe(process.env.NODE_ENV === 'production' ? 60 : 300);
    expect(zoneKeyGenerator(r, {})).not.toContain('admin-1');
  });

  test('[P9.6] an expired token is anonymous', () => {
    const expired = jwt.sign({ userId: 'u-9', role: 'USER', exp: Math.floor(Date.now() / 1000) - 60 }, getJwtSecret());
    const r = req({ headers: { authorization: `Bearer ${expired}` } });
    expect(rateLimitIdentity(r)).toBeNull();
  });

  test('[P9.7] a customer gets the customer budget, not the anonymous one', () => {
    const r = req({ headers: { authorization: `Bearer ${sign({ userId: 'cust-1', role: 'user' })}` } });
    expect(getLimitForRole(r)).toBe(process.env.NODE_ENV === 'production' ? 120 : 500);
  });
});

/**
 * JWT signing-secret resolution.
 *
 * Regression guard for the most severe finding in the pre-launch audit: the
 * access-token secret resolved as
 *
 *     process.env.JWT_SECRET || 'fallback_localsampark_secret_key_2026'
 *
 * at four call sites, and the refresh secret as `|| 'dev_refresh_key'`. Both
 * literals live in the repository. A production deploy missing the environment
 * variable would have verified tokens against a publicly known key, letting
 * anyone mint a valid token for any user id and any role — super_admin
 * included. These tests exist so that can never silently return.
 */
const jwt = require('jsonwebtoken');

const LEAKED_ACCESS = 'fallback_localsampark_secret_key_2026';
const LEAKED_REFRESH = 'dev_refresh_key';

function freshSecrets() {
  // The module memoises its warning set, so reload per scenario.
  jest.resetModules();
  return require('../src/config/secrets');
}

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('production: fails closed', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  it('throws rather than returning a fallback access secret', () => {
    const { getJwtSecret } = freshSecrets();
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET is not set/);
  });

  it('throws from the boot-time assertion', () => {
    const { assertSecretsConfigured } = freshSecrets();
    expect(() => assertSecretsConfigured()).toThrow(/not set/);
  });

  it('never returns the leaked literal', () => {
    const { getJwtSecret } = freshSecrets();
    let value = null;
    try { value = getJwtSecret(); } catch (_e) { /* expected */ }
    expect(value).not.toBe(LEAKED_ACCESS);
  });

  it('uses the configured secret when present', () => {
    process.env.JWT_SECRET = 'a-real-production-secret';
    const { getJwtSecret } = freshSecrets();
    expect(getJwtSecret()).toBe('a-real-production-secret');
  });

  it('falls back to the access secret for refresh only when explicitly unset', () => {
    process.env.JWT_SECRET = 'a-real-production-secret';
    const { getJwtRefreshSecret } = freshSecrets();
    expect(getJwtRefreshSecret()).toBe('a-real-production-secret');
    expect(getJwtRefreshSecret()).not.toBe(LEAKED_REFRESH);
  });

  it('prefers a distinct refresh secret when configured', () => {
    process.env.JWT_SECRET = 'access-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
    const { getJwtRefreshSecret } = freshSecrets();
    expect(getJwtRefreshSecret()).toBe('refresh-secret');
  });
});

describe('development: usable but never the leaked literal', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  it('returns a dev key without throwing', () => {
    const { getJwtSecret } = freshSecrets();
    expect(typeof getJwtSecret()).toBe('string');
  });

  it('does not reuse either published literal', () => {
    const { getJwtSecret, getJwtRefreshSecret } = freshSecrets();
    expect(getJwtSecret()).not.toBe(LEAKED_ACCESS);
    expect(getJwtRefreshSecret()).not.toBe(LEAKED_REFRESH);
  });
});

describe('forged-token rejection', () => {
  it('a token signed with the old leaked secret does not verify', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'the-real-secret';
    const { getJwtSecret } = freshSecrets();

    // Exactly the escalation the fallback enabled.
    const forged = jwt.sign({ userId: 1, role: 'super_admin' }, LEAKED_ACCESS);
    expect(() => jwt.verify(forged, getJwtSecret())).toThrow();
  });

  it('a token signed with the configured secret verifies', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'the-real-secret';
    const { getJwtSecret } = freshSecrets();

    const genuine = jwt.sign({ userId: 1, role: 'user' }, getJwtSecret());
    expect(jwt.verify(genuine, getJwtSecret()).role).toBe('user');
  });
});

/**
 * Test Auth Helper Verification Tests
 */
const { TEST_USERS, getTokenForRole, getRefreshTokenForRole, getExpiredToken, getTamperedToken, authHeader } = require('./testAuth');
const jwt = require('jsonwebtoken');

describe('Test Auth Helper', () => {
  it('should generate valid JWT access token for resident role', () => {
    const token = getTokenForRole('resident');
    expect(token).toBeDefined();
    const decoded = jwt.verify(token, 'test-jwt-secret-key-localsampark-2026');
    expect(decoded.userId).toBe(TEST_USERS.resident.id);
  });

  it('should generate valid Bearer auth header', () => {
    const header = authHeader('admin');
    expect(header).toMatch(/^Bearer /);
  });

  it('should generate tampered token', () => {
    const token = getTamperedToken('resident');
    expect(() => jwt.verify(token, 'test-jwt-secret-key-localsampark-2026')).toThrow();
  });
});

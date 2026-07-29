/**
 * Test Authentication Helper
 * Generates valid JWT tokens for any role for use in integration tests.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-jwt-secret-key-localsampark-2026';
const JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-localsampark-2026';

// Pre-defined test user IDs (must match seeded data in testDb.js)
const TEST_USERS = {
  resident:         { id: 1,  phone: '9999900001', role: 'user',             name: 'Test Resident' },
  shop_owner:       { id: 2,  phone: '9999900002', role: 'shop_owner',       name: 'Test Shop Owner' },
  delivery_agent:   { id: 3,  phone: '9999900003', role: 'delivery_agent',   name: 'Test Delivery Agent' },
  service_provider: { id: 4,  phone: '9999900004', role: 'service_provider', name: 'Test Service Provider' },
  admin:            { id: 5,  phone: '9999900005', role: 'admin',            name: 'Test Admin' },
  super_admin:      { id: 6,  phone: '9999900006', role: 'super_admin',      name: 'Test Super Admin' },
  territory_admin:  { id: 7,  phone: '9999900007', role: 'territory_admin',  name: 'Test Territory Admin' },
  area_agent:       { id: 8,  phone: '9999900008', role: 'area_agent',       name: 'Test Area Agent' },
  franchise_owner:  { id: 9,  phone: '9999900009', role: 'franchise_owner',  name: 'Test Franchise Owner' },
  field_agent:      { id: 10, phone: '9999900010', role: 'field_agent',      name: 'Test Field Agent' },
  society_admin:    { id: 11, phone: '9999900011', role: 'society_admin',    name: 'Test Society Admin' },
  moderator:        { id: 12, phone: '9999900012', role: 'moderator',        name: 'Test Moderator' },
};

/**
 * Generate a valid access token for a given role
 * @param {string} role - One of the keys in TEST_USERS
 * @param {object} overrides - Optional overrides for the token payload
 * @returns {string} JWT access token
 */
function getTokenForRole(role, overrides = {}) {
  const user = TEST_USERS[role];
  if (!user) throw new Error(`Unknown test role: ${role}. Available: ${Object.keys(TEST_USERS).join(', ')}`);
  
  return jwt.sign(
    { userId: user.id, ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Generate a refresh token for a given role
 */
function getRefreshTokenForRole(role) {
  const user = TEST_USERS[role];
  if (!user) throw new Error(`Unknown test role: ${role}`);
  
  return jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Generate an expired token (for testing token expiry)
 */
function getExpiredToken(role) {
  const user = TEST_USERS[role] || TEST_USERS.resident;
  return jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: '0s' }
  );
}

/**
 * Generate a token with tampered/invalid secret
 */
function getTamperedToken(role) {
  const user = TEST_USERS[role] || TEST_USERS.resident;
  return jwt.sign(
    { userId: user.id },
    'wrong-secret-key',
    { expiresIn: '1h' }
  );
}

/**
 * Get authorization header for a role
 * @param {string} role
 * @returns {string} 'Bearer <token>'
 */
function authHeader(role) {
  return `Bearer ${getTokenForRole(role)}`;
}

module.exports = {
  TEST_USERS,
  getTokenForRole,
  getRefreshTokenForRole,
  getExpiredToken,
  getTamperedToken,
  authHeader,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
};

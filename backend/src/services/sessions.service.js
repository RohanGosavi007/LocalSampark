/**
 * Sessions you can sign out of one at a time (C1).
 *
 * Every pair of tokens carries a session id (sid): the access token, the
 * refresh token, and every pair the refresh token is exchanged for. Signing
 * out of this device records the sid as revoked; authenticate() and the
 * refresh route refuse a revoked sid. Signing out of every device is the
 * account's token_version, as before.
 */
const { query, queryOne } = require('../config/database');

const REFRESH_DAYS = 30;

async function revoke(sid, userId) {
  if (!sid) return false;
  const expires = new Date(Date.now() + REFRESH_DAYS * 86400000).toISOString();
  try {
    await query(
      'INSERT INTO revoked_sessions (sid, user_id, revoked_at, expires_at) VALUES ($1, $2, $3, $4)',
      [String(sid), String(userId), new Date().toISOString(), expires]
    );
  } catch (error) {
    // Already revoked: signing out twice is still signed out.
    if (!/unique|duplicate|23505|constraint/i.test(`${error.code} ${error.message}`)) throw error;
  }
  return true;
}

async function isRevoked(sid) {
  if (!sid) return false;
  const row = await queryOne('SELECT sid FROM revoked_sessions WHERE sid = $1', [String(sid)]);
  return Boolean(row);
}

/** Signs the account out everywhere: every token issued so far stops working. */
async function revokeAll(userId) {
  await query('UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1', [userId]);
}

module.exports = { revoke, isRevoked, revokeAll };

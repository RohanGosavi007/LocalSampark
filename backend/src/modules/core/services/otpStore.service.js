const { cacheSet, cacheGet, cacheDel, redisClient } = require('../../../config/redis');

/**
 * Shared OTP store.
 *
 * This exists because /auth/send-otp kept its codes in a Map that was private to
 * auth.routes.js, so no other route could read them. /admin-auth/login needed to
 * and could not — which is why it ended up requiring an `otp` field in the body
 * and never checking its value.
 *
 * Redis is the real store. The in-memory Map is a development convenience only:
 * the API runs behind a load balancer in production, so a code written to one
 * instance's memory is invisible to the instance that handles the verify, and
 * login fails for a random fraction of users with no pattern to it.
 */

const TTL_SECONDS = 5 * 60;

// Dev-only. Keyed the same way as the Redis keys so the two are interchangeable.
const memoryStore = new Map();

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/** True when a code can be stored/read at all. */
function isAvailable() {
  return Boolean(redisClient) || !isProduction();
}

/**
 * Why the caller cannot proceed, or null if it can. Lets routes return a
 * specific 503 rather than failing in a way that looks like a bad code.
 */
function unavailableReason() {
  if (redisClient) return null;
  if (isProduction()) {
    return 'REDIS_URL unavailable and the in-memory OTP store is not safe across instances.';
  }
  return null;
}

function sweepExpired() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) memoryStore.delete(key);
  }
}

async function setOtp(key, otp, ttlSeconds = TTL_SECONDS) {
  if (redisClient) {
    await cacheSet(key, otp, ttlSeconds);
    return;
  }
  // Swept on write so the Map cannot grow without bound the way the original did.
  sweepExpired();
  memoryStore.set(key, { otp, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function getOtp(key) {
  if (redisClient) {
    return (await cacheGet(key)) || null;
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.otp;
}

async function deleteOtp(key) {
  if (redisClient) {
    await cacheDel(key);
    return;
  }
  memoryStore.delete(key);
}

/**
 * Compare a submitted code against the stored one and consume it on success.
 *
 * Single-use is enforced here rather than at each call site: a code that
 * survives a successful verification can be replayed, and /admin-auth/login is
 * exactly the endpoint where that matters.
 */
async function verifyAndConsume(key, submitted) {
  if (!submitted) return false;
  const stored = await getOtp(key);
  if (!stored) return false;
  if (String(stored) !== String(submitted)) return false;
  await deleteOtp(key);
  return true;
}

module.exports = {
  TTL_SECONDS,
  isAvailable,
  unavailableReason,
  setOtp,
  getOtp,
  deleteOtp,
  verifyAndConsume,
  // Exposed for tests only.
  __memoryStore: memoryStore,
};

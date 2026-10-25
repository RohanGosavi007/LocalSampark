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
  if (isProduction() && !redisClient) return false;
  return true;
}

/**
 * Why the caller cannot proceed, or null if it can.
 */
function unavailableReason() {
  if (isProduction() && !redisClient) {
    return 'OTP store unavailable in production without REDIS_URL';
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
    await cacheDel(`otp_wrong:${key}`);
    return;
  }
    // Swept on write so the Map cannot grow without bound the way the original did.
  sweepExpired();
  memoryStore.set(key, { otp, expiresAt: Date.now() + ttlSeconds * 1000 });
  memoryStore.delete(`otp_wrong:${key}`);
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

const MAX_WRONG_GUESSES = 5;
const SEND_WINDOW_SECONDS = 15 * 60;
const MAX_SENDS_PER_WINDOW = 5;

/** A small counter with an expiry, in Redis or (development) in the Map. */
async function bump(counterKey, ttlSeconds) {
  if (redisClient) {
    const current = Number(await cacheGet(counterKey)) || 0;
    await cacheSet(counterKey, String(current + 1), ttlSeconds);
    return current + 1;
  }
  sweepExpired();
  const entry = memoryStore.get(counterKey);
  const count = entry && entry.expiresAt > Date.now() ? Number(entry.otp) + 1 : 1;
  // The window starts at the first event and is not extended by later ones.
  memoryStore.set(counterKey, { otp: String(count), expiresAt: entry && entry.expiresAt > Date.now() ? entry.expiresAt : Date.now() + ttlSeconds * 1000 });
  return count;
}

/**
 * Whether another code may be sent to this destination right now.
 *
 * Sending was limited per caller address only. One address could have codes
 * sent to any number of phones, and — more to the point — any number of
 * addresses could have codes sent to one phone: each is an SMS the platform
 * pays for and the owner of the number did not ask for.
 */
async function allowSend(destination) {
  const sends = await bump(`otp_sends:${destination}`, SEND_WINDOW_SECONDS);
  return sends <= MAX_SENDS_PER_WINDOW;
}

/** Constant-time comparison of two codes. */
function sameCode(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && require('crypto').timingSafeEqual(x, y);
}

/**
 * Compare a submitted code against the stored one and consume it on success.
 *
 * Single-use is enforced here rather than at each call site: a code that
 * survives a successful verification can be replayed, and /admin-auth/login is
 * exactly the endpoint where that matters.
 *
 * Wrong guesses are counted against the code. After MAX_WRONG_GUESSES the code
 * is thrown away and a new one has to be requested: a six-digit code that can
 * be guessed at without limit for its five-minute life is not a second factor,
 * and the per-address limiter in front of this does nothing against guesses
 * spread across addresses.
 */
async function verifyAndConsume(key, submitted) {
  if (!submitted) return false;
  const stored = await getOtp(key);
  if (!stored) return false;
  if (!sameCode(stored, submitted)) {
    const wrong = await bump(`otp_wrong:${key}`, TTL_SECONDS);
    if (wrong >= MAX_WRONG_GUESSES) {
      await deleteOtp(key);
      await deleteOtp(`otp_wrong:${key}`);
    }
    return false;
  }
  await deleteOtp(key);
  await deleteOtp(`otp_wrong:${key}`);
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
  allowSend,
  MAX_WRONG_GUESSES,
  MAX_SENDS_PER_WINDOW,
  // Exposed for tests only.
  __memoryStore: memoryStore,
};

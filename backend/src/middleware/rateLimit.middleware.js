const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { redisClient } = require('../config/redis');
const logger = require('../config/logger');

// Helper to determine limits based on role
const getLimitForRole = (req) => {
  if (!req.user || !req.user.role) return process.env.NODE_ENV === 'production' ? 60 : 300; 
  const role = req.user.role.toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return 1000;
  if (role.startsWith('VENDOR') || role === 'DELIVERY') return 300;
  return process.env.NODE_ENV === 'production' ? 120 : 500;
};

/**
 * 10x FIX: getStore() now correctly returns a RedisStore when Redis is connected.
 * Previously this function always returned `undefined`, causing all rate limiting
 * to be in-memory only (resets on server restart, no cross-instance sharing).
 * 
 * Now: Redis connected → RedisStore (persistent, shared across instances)
 *      Redis disconnected → undefined (falls back to express-rate-limit's built-in MemoryStore)
 */
const getStore = (prefix) => {
  try {
    if (redisClient && redisClient.isReady) {
      return new RedisStore({
        sendCommand: async (...args) => {
          try {
            return await redisClient.sendCommand(args);
          } catch (error) {
            logger.warn(`[Redis Rate Limiter] Command failed, falling back to memory: ${error.message}`);
            return null;
          }
        },
        prefix: prefix || 'rl:',
      });
    }
  } catch (error) {
    logger.warn(`[Redis Rate Limiter] Store creation failed: ${error.message}`);
  }
  // Fallback: return undefined → express-rate-limit uses built-in MemoryStore
  return undefined;
};

/**
 * 10x ENHANCEMENT: Zone-scoped key generator.
 * Combines territoryId + userId/IP to prevent per-zone abuse.
 * A single user cannot flood a specific territory with requests.
 */
const zoneKeyGenerator = (req, res) => {
  const identity = req.user ? (req.user.id || req.user.userId) : ipKeyGenerator(req, res);
  const zone = req.territoryId || req.activeZoneId || 'global';
  return `${zone}:${identity}`;
};

// General API rate limiter (zone-scoped)
const roleBasedRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req, res) => getLimitForRole(req),
  message: { error: 'Too many requests. Please try again later.' },
  keyGenerator: zoneKeyGenerator,
  skip: (req) => process.env.NODE_ENV === 'test' || req.path === '/health' || req.path === '/metrics' || req.path === '/ready',
  store: getStore('rl:api:'),
  handler: (req, res, next, options) => {
    logger.warn(`[RATE LIMIT] API limit hit: ${req.ip} | Zone: ${req.territoryId || 'none'} | Path: ${req.path}`);
    res.status(options.statusCode).send(options.message);
  }
});

const rateLimiter = roleBasedRateLimiter;

// Strict limiter for auth endpoints (OTP, login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
  store: getStore('rl:auth:'),
  handler: (req, res, next, options) => {
    logger.warn(`[RATE LIMIT] Auth limit hit: ${req.ip} | Path: ${req.path}`);
    res.status(options.statusCode).send(options.message);
  }
});

// Outside production the payment limits are raised out of the way, as the auth
// limit above is: a test run or a developer clicking through checkout makes
// more payment calls in a minute than a customer does in a day.
const paymentMax = (productionMax) => (process.env.NODE_ENV === 'production' ? productionMax : 1000);

const isWebhookPath = (req) => /\/webhooks?(\/|$)/.test(req.originalUrl || req.url || '');

// Per-address limiter for the payment mounts (/payments, /wallet, /checkout).
//
// It counts attempts to move money, not everything under those mounts:
//   - reads are skipped. /wallet/history is mounted here, and counting it
//     meant opening the wallet screen twenty times stopped a customer paying;
//   - gateway webhooks are skipped. Razorpay delivers from a handful of
//     addresses, so a per-address limit of 20 would have dropped the
//     twenty-first confirmation in a quarter of an hour — a paid order left
//     unpaid here. Webhooks are authenticated by signature instead.
// The ceiling is per address, and many customers share one (a housing
// society's Wi-Fi, a mobile carrier's NAT), so it is a coarse flood guard; the
// per-account limit below is the one that bounds a single customer.
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: paymentMax(100),
  message: { error: 'Too many payment requests. Please try again later.' },
    // …and nor is a price quote, which a cart asks for every time it changes.
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) || isWebhookPath(req) || /\/quote\/?$/.test(req.path),
  store: getStore('rl:pay:'),
  handler: (req, res, next, options) => {
    logger.warn(`[RATE LIMIT] Payment limit hit: ${req.ip} | Path: ${req.path}`);
    res.status(options.statusCode).send(options.message);
  }
});

// Per-account limiter for starting and confirming a payment. Goes after
// authenticate(), which is what makes req.user available to key on.
const paymentAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: paymentMax(20),
  message: { success: false, error: 'Too many payment attempts. Please try again later.' },
  keyGenerator: (req, res) => (req.user && req.user.id ? `user:${req.user.id}` : ipKeyGenerator(req, res)),
  store: getStore('rl:payuser:'),
  handler: (req, res, next, options) => {
    logger.warn(`[RATE LIMIT] Payment attempt limit hit: user ${req.user && req.user.id} | Path: ${req.path}`);
    res.status(options.statusCode).send(options.message);
  }
});

// Per-account limiter for placing an order. After authenticate().
//
// checkout.routes.js had its own: ten per address per quarter of an hour,
// applied before authentication. Ten is a fair ceiling for one customer and far
// too low for one address — a housing society behind a single router is one
// address — so it is keyed by account here.
const orderPlacementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: paymentMax(10),
  message: { success: false, error: 'Too many checkout attempts. Please try again later.' },
  keyGenerator: (req, res) => (req.user && req.user.id ? `user:${req.user.id}` : ipKeyGenerator(req, res)),
  store: getStore('rl:order:'),
});

// Attempts at a delivery handover code, per rider and job. After
// authenticate(). Five wrong guesses at a four-digit code is 0.05% of the
// space; without a limit the general API limit allowed all ten thousand in
// under ninety minutes.
const handoverCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: { success: false, error: 'Too many attempts at the handover code. Please wait and try again.' },
  keyGenerator: (req, res) => `${req.user && req.user.id ? req.user.id : ipKeyGenerator(req, res)}:${req.params.jobId || ''}`,
  // A correct code is not an attempt to guess one.
  skipSuccessfulRequests: true,
  store: getStore('rl:handover:'),
});

// Anonymous form endpoints that create a record for staff to act on (the
// public account-deletion request). Per IP, an hour window: legitimate users
// submit once, and a flood would fill the DSR queue with junk.
const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  keyGenerator: (req, res) => ipKeyGenerator(req, res),
  store: getStore('rl:pubform:'),
});

// Strict limiter for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many uploads. Please try again later.' },
  store: getStore('rl:up:'),
});

// Admin-specific rate limiter
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many admin requests. Please try again later.' },
  store: getStore('rl:admin:'),
});

// High-threshold IP Banning (DDOS Protection)
const ddosProtector = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Very high threshold
  skip: (req) => process.env.NODE_ENV === 'test',
  message: { error: 'IP Temporarily Banned due to suspicious activity.' },
  keyGenerator: (req, res) => ipKeyGenerator(req, res),
  store: getStore('rl:ddos:'),
  handler: (req, res, next, options) => {
    logger.error(`[DDOS WARNING] IP Banned: ${req.ip} | User-Agent: ${req.headers['user-agent']}`);
    res.status(options.statusCode).send(options.message);
  }
});

module.exports = {
  rateLimiter,
  roleBasedRateLimiter,
  authLimiter,
    paymentLimiter,
    paymentAttemptLimiter,
    orderPlacementLimiter,
  handoverCodeLimiter,
  uploadLimiter,
  publicFormLimiter,
  adminLimiter,
  ddosProtector
};

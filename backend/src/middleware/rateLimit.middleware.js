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
  skip: (req) => req.path === '/health' || req.path === '/metrics',
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

// Strict limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many payment requests. Please try again later.' },
  store: getStore('rl:pay:'),
  handler: (req, res, next, options) => {
    logger.warn(`[RATE LIMIT] Payment limit hit: ${req.ip} | Path: ${req.path}`);
    res.status(options.statusCode).send(options.message);
  }
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
  uploadLimiter,
  adminLimiter,
  ddosProtector
};

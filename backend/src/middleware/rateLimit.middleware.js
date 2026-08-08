const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { redisClient } = require('../config/redis');

// Helper to determine limits based on role
const getLimitForRole = (req) => {
  if (!req.user || !req.user.role) return 30; // 30 req/min
  const role = req.user.role;
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return 500;
  if (role.startsWith('VENDOR') || role === 'DELIVERY') return 120;
  return 60;
};

// Define standard store options using the global Redis client
const storeOptions = {
  sendCommand: async (...args) => {
    try {
      if (redisClient && redisClient.isReady) {
        return await redisClient.sendCommand(args);
      }
      return null;
    } catch (error) {
      console.warn(`[Redis Rate Limiter] Bypassed due to error: ${error.message}`);
      return null;
    }
  },
};

const getStore = (prefix) => {
  return undefined; 
};

// General API rate limiter
const roleBasedRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req, res) => getLimitForRole(req),
  message: { error: 'Too many requests. Please try again later.' },
  keyGenerator: (req) => req.user ? req.user.userId : req.ip.replace(/:/g, '_'),
  skip: (req) => req.path === '/health',
  store: getStore('rl:api:'),
});

const rateLimiter = roleBasedRateLimiter;

// Strict limiter for auth endpoints (OTP, login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 1000,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
  store: getStore('rl:auth:'),
});

// Strict limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many payment requests. Please try again later.' },
  store: getStore('rl:pay:'),
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
  keyGenerator: (req) => req.ip.replace(/:/g, '_'),
  store: getStore('rl:ddos:'),
  handler: (req, res, next, options) => {
    console.warn(`[DDOS WARNING] IP Banned: ${req.ip}`);
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

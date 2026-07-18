const rateLimit = require('express-rate-limit');

// General API rate limiter
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => req.path === '/health'
});

// Strict limiter for auth endpoints (OTP, login, register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' }
});

// Strict limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many payment requests. Please try again later.' }
});

// Strict limiter for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many uploads. Please try again later.' }
});

// Admin-specific rate limiter (more generous but still bounded)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many admin requests. Please try again later.' }
});

module.exports = {
  rateLimiter,
  authLimiter,
  paymentLimiter,
  uploadLimiter,
  adminLimiter
};

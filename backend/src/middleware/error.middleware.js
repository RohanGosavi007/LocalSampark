const logger = require('../config/logger');

// Error handler middleware — production-safe with structured logging
function errorHandler(err, req, res, next) {
  // Log full error details using winston
  logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, {
    statusCode: err.statusCode || 500,
    stack: err.stack,
    userId: req.user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: isProduction && statusCode === 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error',
    ...(err.errors && { errors: err.errors }),
    ...(!isProduction && { stack: err.stack })
  });
}

// 404 Not Found
function notFound(req, res, next) {
  logger.warn(`404 — Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

// Custom error class with operational flag
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class for express-validator errors
class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed');
    this.statusCode = 422;
    this.errors = errors;
  }
}

module.exports = { errorHandler, notFound, AppError, ValidationError };

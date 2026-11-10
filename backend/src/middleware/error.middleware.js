const logger = require('../config/logger');

// Error handler middleware — production-safe with structured logging
/**
 * Errors that are the request's fault but arrive looking like the server's.
 *
 * PostgreSQL rejects a value that is not the column's type before it looks for
 * a row: `WHERE id = 'abc'` against a UUID key is error 22P02, not "no rows".
 * Every route that puts a path parameter into such a query — nearly all of
 * them — therefore answered a mistyped or probing id with 500. SQLite compares
 * anything with anything, so no test ever saw it. The answer the caller needs
 * is 400.
 */
const CLIENT_FAULTS = {
  '22P02': 'Invalid identifier or value in the request.',   // invalid_text_representation
  '22003': 'A number in the request is out of range.',      // numeric_value_out_of_range
  '22007': 'Invalid date or time in the request.',          // invalid_datetime_format
  '22008': 'Invalid date or time in the request.',          // datetime_field_overflow
};

/**
 * Integrity-constraint violations, which are almost always the request's fault.
 *
 * A POST that omits a required field reaches the INSERT, and the database
 * refuses it: NOT NULL, 23502. Seventeen write routes answered that with a 500
 * when sent an empty body, because they check little before they write. The
 * caller needs to hear "you left something out" (400) or "that already exists /
 * is still in use" (409), not "the server broke".
 *
 * The trade-off, stated: a constraint failure caused by a bug in OUR code — an
 * INSERT that forgets a column — now also reads as 4xx, so it no longer shows up
 * in a 5xx-rate alert. It is still logged, with the constraint's own message.
 *
 * PostgreSQL reports a SQLSTATE; SQLite only a message, so both are matched.
 */
const CONSTRAINT_FAULTS = [
  { pg: '23502', sqlite: /NOT NULL constraint failed/i, statusCode: 400, message: 'A required field is missing from the request.' },
  { pg: '23514', sqlite: /CHECK constraint failed/i, statusCode: 400, message: 'A value in the request is not allowed.' },
  { pg: '23505', sqlite: /UNIQUE constraint failed/i, statusCode: 409, message: 'That already exists.' },
  { pg: '23503', sqlite: /FOREIGN KEY constraint failed/i, statusCode: 409, message: 'This refers to something that does not exist, or that is still in use.' },
];

function constraintFault(err) {
  if (!err) return null;
  return CONSTRAINT_FAULTS.find((c) => err.code === c.pg || (typeof err.message === 'string' && c.sqlite.test(err.message))) || null;
}

/**
 * An id PostgreSQL could not even parse as a UUID names no row, so the answer
 * is 404, the one SQLite gives when the same lookup simply finds nothing. The
 * rejected value is quoted in the error message; when it is one the caller sent
 * (a path parameter, or a top-level query or body field) they referred to
 * something that does not exist. Other unparseable values (numbers, dates) and
 * values the request did not supply stay 400.
 */
function isUnknownUuidReference(err, req) {
  if (!err || err.code !== '22P02' || !req) return false;
  const m = /invalid input syntax for type uuid: "(.*)"$/.exec(String(err.message || ''));
  if (!m) return false;
  const sent = [req.params, req.query, req.body]
    .filter((o) => o && typeof o === 'object' && !Array.isArray(o))
    .flatMap((o) => Object.values(o));
  return sent.some((v) => (typeof v === 'string' || typeof v === 'number') && String(v) === m[1]);
}

function statusOf(err, req) {
  if (isUnknownUuidReference(err, req)) return { statusCode: 404, message: 'Not found.' };
  if (err && CLIENT_FAULTS[err.code]) return { statusCode: 400, message: CLIENT_FAULTS[err.code] };
  const constraint = constraintFault(err);
  // An explicit status set by the route wins over the inferred one.
  if (constraint && !(Number(err.statusCode || err.status) >= 400)) return { statusCode: constraint.statusCode, message: constraint.message };
  if (err && err.message === 'Not allowed by CORS') return { statusCode: 403, message: 'Origin not allowed.' };
  const statusCode = Number(err && (err.statusCode || err.status));
  return { statusCode: statusCode >= 400 && statusCode < 600 ? statusCode : 500, message: null };
}

// Error handler middleware — production-safe with structured logging
function errorHandler(err, req, res, next) {
  const { statusCode, message } = statusOf(err, req);

  // Log full error details using winston
  logger[statusCode >= 500 ? 'error' : 'warn'](`[${req.method}] ${req.originalUrl} — ${err.message}`, {
    statusCode,
    stack: err.stack,
    userId: req.user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // A response already under way cannot be replaced; let Express close it.
  if (res.headersSent) return next(err);

  // Stack traces and raw error text go to a developer, and to nobody else.
  // This was "anything but production", which included staging and preview
  // deploys — public URLs answering with file paths and SQL.
  const developer = ['development', 'test'].includes(process.env.NODE_ENV);

  res.status(statusCode).json({
    success: false,
    error: message || (!developer && statusCode === 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error'),
    ...(err.errors && { errors: err.errors }),
    ...(developer && { stack: err.stack })
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

module.exports = { errorHandler, notFound, AppError, ValidationError, statusOf };

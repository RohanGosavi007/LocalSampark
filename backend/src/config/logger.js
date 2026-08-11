const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDirectory = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

/**
 * 10x ENHANCEMENT: Structured JSON logging for production.
 * 
 * - Production: JSON format (machine-parseable for log aggregation tools)
 * - Development: Colorized simple format (human-readable)
 * - Error logs include stack traces + request context
 * - All logs include service name, timestamp, environment
 */
const isProduction = process.env.NODE_ENV === 'production';

const consoleFormat = isProduction
  ? winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length && meta.service !== 'localsampark-api'
          ? ` ${JSON.stringify(meta)}`
          : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
      })
    );

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'localsampark-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  },
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'error.log'), 
      level: 'error',
      maxsize: 20 * 1024 * 1024, // 20MB per file
      maxFiles: 14, // Keep 14 rotated files
      tailable: true
    }),
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'app.log'),
      maxsize: 20 * 1024 * 1024, // 20MB per file
      maxFiles: 14, // Keep 14 rotated files
      tailable: true
    }),
    // 10x NEW: Separate file for slow queries and performance warnings
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'performance.log'),
      level: 'warn',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 7,
      tailable: true
    }),
  ],
  // 10x NEW: Don't crash the process on logging errors
  exitOnError: false,
  // 10x NEW: Handle uncaught exception logging
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'exceptions.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logDirectory, 'rejections.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

module.exports = logger;

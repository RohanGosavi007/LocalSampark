const winston = require('winston');
const path = require('path');
const fs = require('fs');

const logDirectory = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'localsampark-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
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
    })
  ]
});

module.exports = logger;

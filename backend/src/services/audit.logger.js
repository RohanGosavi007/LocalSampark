const { Queue, Worker } = require('bullmq');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

let auditQueue = null;

try {
  auditQueue = new Queue('audit-logs', {
    connection: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined,
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 50,
      attempts: 2
    }
  });
} catch (err) {
  console.warn('⚠️ BullMQ audit queue initialization deferred (Redis offline fallback)');
}

/**
 * Non-blocking Audit & Telemetry Logger
 */
class AuditLogger {
  /**
   * Log an audit event asynchronously without awaiting or blocking the HTTP response thread
   * @param {string} event - Name of the event (e.g. 'api_access', 'order_created', 'security_alert')
   * @param {Object} details - Context payload
   */
  static log(event, details = {}) {
    setImmediate(async () => {
      const payload = {
        event,
        details,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      };

      if (auditQueue) {
        try {
          await auditQueue.add(event, payload);
          return;
        } catch (e) {
          // Fall through to fallback
        }
      }

      // Fallback: Asynchronous console logging
      console.log(`[AUDIT:${event.toUpperCase()}]`, JSON.stringify(payload));
    });
  }
}

module.exports = AuditLogger;

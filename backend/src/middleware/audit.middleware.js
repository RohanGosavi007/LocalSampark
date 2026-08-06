// ═══════════════════════════════════════════════════════════════════════
// Audit Logging Middleware — Comprehensive request/response tracking
// ═══════════════════════════════════════════════════════════════════════
// Features:
// 1. Logs every request with method, path, user role, response time
// 2. Flags SLOW queries (>500ms) with warning level
// 3. Logs unauthorized role access attempts for security monitoring
// 4. Structured JSON output for log aggregation (ELK, CloudWatch, etc.)
// ═══════════════════════════════════════════════════════════════════════

const SLOW_THRESHOLD_MS = 500;

/**
 * Global audit logger — mount BEFORE routes in Express app
 */
const auditLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Attach request ID for downstream correlation
  req.requestId = requestId;

  // Capture original end to intercept response
  const originalEnd = res.end;
  res.end = function (...args) {
    const responseTimeMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const userRole = req.user?.role || 'ANONYMOUS';
    const userId = req.user?.userId || req.user?.id || 'N/A';

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      responseTimeMs,
      userRole,
      userId,
      ip: req.ip || req.connection?.remoteAddress,
    };

    // Flag slow queries
    if (responseTimeMs > SLOW_THRESHOLD_MS) {
      logEntry.alert = 'SLOW_REQUEST';
      console.warn(`⚠️ [SLOW REQUEST AUDIT] ${req.method} ${req.originalUrl} — ${responseTimeMs}ms (Role: ${userRole})`, JSON.stringify(logEntry));
    }

    // Flag unauthorized access attempts (403)
    if (statusCode === 403) {
      logEntry.alert = 'UNAUTHORIZED_ACCESS_ATTEMPT';
      console.error(`🔒 [SECURITY AUDIT] Forbidden access attempt: ${req.method} ${req.originalUrl} by ${userRole} (${userId})`, JSON.stringify(logEntry));
    }

    // Flag authentication failures (401)
    if (statusCode === 401) {
      logEntry.alert = 'AUTH_FAILURE';
      console.warn(`🔑 [AUTH AUDIT] Authentication failure: ${req.method} ${req.originalUrl} from ${req.ip}`, JSON.stringify(logEntry));
    }

    // Standard request log (debug level)
    if (process.env.NODE_ENV === 'development' && !logEntry.alert) {
      console.log(`📡 [API] ${req.method} ${req.originalUrl} → ${statusCode} (${responseTimeMs}ms) [${userRole}]`);
    }

    // Set response headers for client-side debugging
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Response-Time', `${responseTimeMs}ms`);

    originalEnd.apply(res, args);
  };

  next();
};

module.exports = { auditLogger };

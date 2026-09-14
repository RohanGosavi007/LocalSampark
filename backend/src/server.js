require('dotenv').config();
const validateEnv = require('./config/envValidator');
validateEnv();

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const http = require('http');

// Import Sentry for Error Tracking
const Sentry = require('@sentry/node');
let nodeProfilingIntegration = null;
try {
  nodeProfilingIntegration = require('@sentry/profiling-node').nodeProfilingIntegration;
} catch (e) {
  console.warn('Sentry profiling-node module not found. Profiling will be disabled.');
}

// Initialize Sentry before everything else
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  const integrations = [];
  if (nodeProfilingIntegration) {
    integrations.push(nodeProfilingIntegration());
  }
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations,
    tracesSampleRate: 1.0, 
    profilesSampleRate: 1.0,
  });
}

const { connectDB, pool, query } = require('./config/database');
const { connectRedis, redisClient, cacheGet, cacheSet } = require('./config/redis');


// Import aggregated api router
const apiRouter = require('./routes');

// Import middleware
const { errorHandler, notFound } = require('./middleware/error.middleware');


// Initialize Express
const app = express();
const server = http.createServer(app);

// ── Socket.io Real-Time Engine ──
const { initSocketIO } = require('./sockets');
const io = initSocketIO(server);
app.set('io', io); // Make io accessible in route handlers via req.app.get('io')

// Import Supabase Realtime Service
const supabaseRealtime = require('./modules/core/services/supabaseRealtime.service');

// ─── TELEMETRY & LOGGING ────────────────────────────────────
const logger = require('./config/logger');
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  logger.info('✅ Sentry Error-Tracking SDK initialized successfully (Production)');
} else {
  logger.info('Sentry Error-Tracking SDK initialized successfully (Staging)');
}

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:", "http://localhost:5000", "ws://localhost:5000"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// ─── Enable Brotli/Gzip Compression & ETag Caching ────────
app.use(compression());
app.set('etag', 'strong'); // Enable strong ETags for HTTP validation caching

// ─── CORS: Whitelist-based origin validation ────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5000',
  process.env.CLIENT_URL,
  process.env.ADMIN_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    // Allow requests with no origin for mobile apps, rely on JWT for security
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn(`CORS: Request with missing origin blocked/allowed depending on policy (Likely Mobile Client)`);
      }
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Render preview/staging deploys get a generated *.onrender.com hostname,
    // so a wildcard was allowed here. But `credentials: true` is set above,
    // which means ANY other tenant on onrender.com could make authenticated
    // cross-origin calls with the browser attaching our cookies. Keep the
    // convenience for non-production deploys only; production must name its
    // origins in CLIENT_URL / ADMIN_URL.
    if (process.env.NODE_ENV !== 'production' && origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    // Echoed back from the csrf_token cookie by cookie-authenticated clients;
    // omitting it here makes the browser's preflight reject every admin
    // mutation before it is even sent. See middleware/csrf.middleware.js.
    'X-CSRF-Token',
    'X-Territory-ID',
    'X-Society-ID',
    'ngrok-skip-browser-warning',
    'x-razorpay-signature',
    'x-webhook-signature',
    'Cache-Control',
    'Pragma'
  ]
}));

// ─── HTTPS Redirect (Production Only) ───────────────────────
if (process.env.NODE_ENV === 'production') {
  // Platform load balancers (Render, and the deploy workflow's own poll) probe
  // over plain HTTP from inside the network. Redirecting those made every
  // probe a 301 that curl -f treats as success without ever reaching the app,
  // so an unhealthy instance still looked healthy. Exempt the probe paths.
  const HTTPS_EXEMPT = new Set(['/health', '/metrics']);
  app.use((req, res, next) => {
    if (HTTPS_EXEMPT.has(req.path)) return next();
    if (req.headers['x-forwarded-proto'] !== 'https') {
      // 308, not 301: a 301 lets the client downgrade a POST to GET, which
      // silently drops the body of any mutation that arrived over HTTP.
      return res.redirect(308, `https://${req.hostname}${req.originalUrl}`);
    }
    next();
  });
}

// app.use(xss()); // Removed due to IncomingMessage crash
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
// Populates req.cookies, which authenticate() reads the admin session from and
// csrf.middleware.js reads the CSRF value from. Without it req.cookies is
// undefined and cookie auth silently falls through to "no token provided".
app.use(require('cookie-parser')());
const { rateLimiter, ddosProtector } = require('./middleware/rateLimit.middleware');
app.use(ddosProtector);
app.use(rateLimiter);
const { auditLogger } = require('./middleware/audit.middleware');
app.use(auditLogger);

// ─── SAFE XSS SANITIZATION (Express 5 Compatible) ─────────────
// Removed destructive global regex middleware. Validation and sanitization
// should be handled strictly at the route level via express-validator.

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── HEALTH CHECK & METRICS ─────────────────────────────────
// Flipped by the shutdown handler below. While draining, /health must report
// unhealthy so the load balancer stops routing new requests to this instance
// BEFORE it stops accepting connections — that gap is what makes a rolling
// deploy zero-downtime rather than merely fast.
let isShuttingDown = false;

app.get('/health', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  let dbStatus = 'unknown';
  let isHealthy = true;
  try {
    await query('SELECT 1');
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'disconnected';
    isHealthy = false;
  }

  let firebaseStatus = 'not configured';
  try {
    const { isFirebaseInitialized } = require('./config/firebase');
    firebaseStatus = isFirebaseInitialized() ? 'connected' : 'not configured';
  } catch (e) {}

  if (isShuttingDown) isHealthy = false;

  const payload = {
    status: isShuttingDown ? 'draining' : (isHealthy ? 'ok' : 'error'),
    app: 'LocalSampark API',
    version: '1.0.0',
    // The deploy workflow polls this to confirm the NEW build is serving.
    // Without it the health check passes instantly against the OLD instance
    // that is still up, and the pipeline reports a green deploy before the new
    // code has even finished building. Render exposes the commit as
    // RENDER_GIT_COMMIT; GIT_COMMIT is the generic override.
    commit: process.env.GIT_COMMIT || process.env.RENDER_GIT_COMMIT || 'unknown',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()) + 's',
    database: dbStatus,
    redis: redisClient ? 'connected' : 'fallback (in-memory)',
    firebase: firebaseStatus,
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB'
    }
  };

  if (!isHealthy) {
    return res.status(503).json(payload);
  }
  return res.status(200).json(payload);
});

app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  res.set('Content-Type', 'text/plain');
  res.send(
    `# HELP node_memory_usage_bytes Node process memory usage\n` +
    `# TYPE node_memory_usage_bytes gauge\n` +
    `node_memory_usage_bytes{type="rss"} ${memoryUsage.rss}\n` +
    `node_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}\n` +
    `node_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}\n` +
    `node_memory_usage_bytes{type="external"} ${memoryUsage.external}\n` +
    `# HELP node_uptime_seconds Process uptime\n` +
    `# TYPE node_uptime_seconds gauge\n` +
    `node_uptime_seconds ${Math.floor(uptime)}\n`
  );
});

// ─── API ROUTES ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "LocalSampark API Backend is live and running perfectly! 🚀",
    health_check: "/health",
    api_endpoint: "/api/v1"
  });
});

const API_PREFIX = '/api/v1';

app.use(API_PREFIX, apiRouter);
app.use('/api', apiRouter); // Backward compatibility fallback mount

// ─── ERROR HANDLING ─────────────────────────────────────────
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(notFound);
app.use(errorHandler);

// ─── START SERVER ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to PostgreSQL / SQLite
    if (process.env.NODE_ENV === 'production' && process.env.USE_SQLITE === 'true') {
      logger.error('❌ CRITICAL SECURITY ERROR: SQLite is forbidden in production! Set USE_SQLITE="false" and provide PostgreSQL credentials.');
      process.exit(1);
    }
    
    await connectDB();
    if (process.env.USE_SQLITE === 'true' || process.env.NODE_ENV === 'test') {
      logger.info('✅ SQLite connected for testing/development');
      // Auto-heal schema gaps
      const { fixSchemaGaps } = require('./scripts/fix_schema_gaps');
      await fixSchemaGaps();
    } else {
      logger.info('✅ PostgreSQL connected');
    }

    // Connect to Redis
    await connectRedis();
    if (redisClient) {
      logger.info('✅ Redis connected');
    }

    // Initialize notification service with Supabase Realtime
    const notificationService = require('./modules/core/services/notification.service');
    notificationService.init(supabaseRealtime);
    logger.info('✅ Notification service initialized with Supabase');

    // Make supabase accessible to routes
    app.set('supabaseRealtime', supabaseRealtime);
    app.set('redisClient', redisClient);


    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🏘️  LocalSampark API Server                     ║
║   ─────────────────────────────────────────────   ║
║   Status:      Running                            ║
║   Port:        ${PORT}                              ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}    ║
║   API:         http://localhost:${PORT}/api/v1       ║
║   Health:      http://localhost:${PORT}/health        ║
║   Realtime:    Supabase Channels                      ║
║   ║                                                   ║
╚═══════════════════════════════════════════════════╝
      `);
    });

    // Initialize Queue Engine (BullMQ if Redis connected, Synchronous Fallback otherwise)
    const { startQueueEngine } = require('./jobs/worker');
    startQueueEngine(redisClient);
    
    // 10x Scale: Initialize Async Notification Queue
    notificationService.initQueue(redisClient);

    // ML config invalidation. Without this, a change to a ranking weight — or
    // the kill switch — reaches other instances only when their 30s cache
    // expires, so the fleet spends that window split between the old and new
    // behaviour. Degrades to TTL-only when Redis is absent.
    const mlConfig = require('./modules/ml/services/mlconfig.service');
    await mlConfig.initInvalidationListener();

  } catch (error) {
    logger.error('❌ Failed to start server: ' + error.message);
    process.exit(1);
  }
}

// ─── GRACEFUL SHUTDOWN ──────────────────────────────────────
//
// The previous handler called server.close() and waited for its callback. That
// callback never fires while a single Socket.io client is still connected —
// and this app keeps long-lived websockets open by design — so the process sat
// there until the platform's grace period expired and SIGKILLed it mid-request.
// Four un-unref'd setInterval timers held the event loop open on top of that.
//
// The sequence below is the one a rolling deploy actually needs:
//   1. Flip /health to "draining" so the load balancer drains this instance.
//   2. Wait DRAIN_DELAY_MS for in-flight routing to notice before closing.
//   3. Stop the polling timers, close Socket.io, then stop accepting HTTP.
//   4. Release the DB pool and Redis.
//   5. Hard-exit on a deadline no matter what, so a stuck socket cannot turn a
//      deploy into a SIGKILL.
const { clearAllIntervals } = require('./utils/intervals');

// Must stay below the platform's kill grace period (Render's default is 30s).
const DRAIN_DELAY_MS = parseInt(process.env.SHUTDOWN_DRAIN_MS || '5000', 10);
const SHUTDOWN_DEADLINE_MS = parseInt(process.env.SHUTDOWN_DEADLINE_MS || '25000', 10);

let shutdownStarted = false;

async function gracefulShutdown(signal, exitCode = 0) {
  if (shutdownStarted) return; // a second SIGTERM must not restart the sequence
  shutdownStarted = true;
  isShuttingDown = true;
  logger.info(`🛑 ${signal} received. Draining for ${DRAIN_DELAY_MS}ms before shutdown...`);

  // Unconditional backstop. unref'd so it never by itself keeps us alive.
  const deadline = setTimeout(() => {
    logger.error('⏱️ Shutdown deadline exceeded — forcing exit.');
    process.exit(exitCode || 1);
  }, SHUTDOWN_DEADLINE_MS);
  deadline.unref();

  await new Promise((resolve) => setTimeout(resolve, DRAIN_DELAY_MS));

  try {
    const cleared = clearAllIntervals();
    logger.info(`   Stopped ${cleared} background polling timer(s).`);

    if (io && typeof io.close === 'function') {
      await new Promise((resolve) => io.close(resolve));
      logger.info('   Socket.io closed.');
    }

    await new Promise((resolve) => server.close(resolve));
    logger.info('   HTTP server closed.');

    if (pool && typeof pool.end === 'function') await pool.end();
    else if (pool && typeof pool.close === 'function') await pool.close();
    logger.info('   Database pool released.');

    try {
      await require('./modules/ml/services/mlconfig.service').close();
    } catch (e) {
      logger.warn('ML config subscriber close failed: ' + e.message);
    }

    if (redisClient && typeof redisClient.quit === 'function') await redisClient.quit();
    logger.info('✅ Shutdown complete.');
  } catch (err) {
    logger.error('Error during shutdown: ' + (err && err.message));
    exitCode = exitCode || 1;
  }

  clearTimeout(deadline);
  process.exit(exitCode);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
// Without SIGINT the local dev server needed two Ctrl+C presses and left the
// pool open on the first.
process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at: ' + promise + ' reason: ' + reason);
  if (process.env.NODE_ENV === 'production') {
    logger.error('Initiating graceful shutdown due to unhandled promise rejection');
    gracefulShutdown('unhandledRejection', 1);
  } else {
    logger.error('Unhandled Rejection swallowed (Development mode)');
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception: ' + error.message);
  process.exit(1);
});

const { initPaymentWorker } = require('./workers/paymentWorker');
const { initEventWorker } = require('./workers/eventWorker');

if (process.env.NODE_ENV !== 'test') {
  startServer().then(() => {
    initPaymentWorker();
    initEventWorker();
    // Initialize node-cron jobs
    require('./jobs/billing-automation.job');
    require('./jobs/overstay-monitor.job');
    require('./jobs/complaint-escalation.job');
    require('./jobs/lease-expiry-reminder.job');
    require('./jobs/amc-expiry-alert.job');
  });
}

module.exports = { app, server };

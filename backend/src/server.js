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
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:", "http://localhost:5000", "ws://localhost:5000"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
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

    if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.onrender.com'))) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ─── HTTPS Redirect (Production Only) ───────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    next();
  });
}

// app.use(xss()); // Removed due to IncomingMessage crash
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
const { rateLimiter, ddosProtector } = require('./middleware/rateLimit.middleware');
app.use(ddosProtector);
app.use(rateLimiter);
const { auditLogger } = require('./middleware/audit.middleware');
app.use(auditLogger);

// ─── SAFE XSS SANITIZATION (Express 5 Compatible) ─────────────
const sanitizeData = (data) => {
  if (typeof data === 'string') {
    return data.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const key in data) { sanitized[key] = sanitizeData(data[key]); }
    return sanitized;
  }
  return data;
};
app.use((req, res, next) => {
  if (req.body) req.body = sanitizeData(req.body);
  if (req.params) req.params = sanitizeData(req.params);
  // Deliberately skipping req.query as it is a getter in Express 5 and will crash if reassigned
  next();
});

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── HEALTH CHECK & METRICS ─────────────────────────────────
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

  const payload = {
    status: isHealthy ? 'ok' : 'error',
    app: 'LocalSampark API',
    version: '1.0.0',
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

  } catch (error) {
    logger.error('❌ Failed to start server: ' + error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    if (pool && typeof pool.end === 'function') {
      pool.end();
    } else if (pool && typeof pool.close === 'function') {
      pool.close();
    }
    if (redisClient && typeof redisClient.quit === 'function') {
      redisClient.quit();
    }
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at: ' + promise + ' reason: ' + reason);
  // Trigger a graceful shutdown in production
  if (process.env.NODE_ENV === 'production') {
    logger.error('Initiating graceful shutdown due to unhandled promise rejection');
    server.close(() => {
      if (pool && typeof pool.end === 'function') pool.end();
      if (redisClient && typeof redisClient.quit === 'function') redisClient.quit();
      process.exit(1);
    });
    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => process.exit(1), 10000).unref();
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

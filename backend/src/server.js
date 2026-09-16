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

    // Nightly rebuild of the item-to-item affinity matrix from the interaction
    // log. Runs at 03:15 local, when the rebuild's table swap is least likely
    // to collide with traffic. Produces nothing until the log has real volume,
    // which is the intended state — see modules/ml/jobs/matrix-builder.job.js.
    const matrixBuilder = require('./modules/ml/jobs/matrix-builder.job');
    const cron = require('node-cron');
    cron.schedule('15 3 * * *', () => {
      matrixBuilder.rebuild().catch((e) =>
        logger.error('Scheduled affinity rebuild failed: ' + e.message)
      );
    });
    logger.info('✅ ML affinity matrix rebuild scheduled (03:15 daily).');

    // Demand aggregation, hourly. Rolls the interaction log into
    // (region, category, hour) buckets that the detectors and the console read
    // instead of scanning raw events. Hourly rather than nightly because the
    // buckets ARE hourly — aggregating once a day would leave the current day
    // invisible until the next morning.
    const anomalyDetector = require('./modules/ml/safety/anomalyDetector');
    cron.schedule('5 * * * *', () => {
      anomalyDetector.aggregateDemand({ windowHours: 3 }).catch((e) =>
        logger.error('Scheduled demand aggregation failed: ' + e.message)
      );
    });

    // Anomaly detectors, every six hours. These compare a listing against the
    // population, so running them more often mostly re-derives the same answer
    // — and each pass writes to a queue a human has to read.
    cron.schedule('40 */6 * * *', async () => {
      try {
        const detectorCfg = await mlConfig.get(null);
        const summary = await anomalyDetector.runAll({ cfg: detectorCfg });
        if (summary.total_flags > 0) {
          logger.warn(`🔍 Anomaly scan flagged ${summary.total_flags} listing(s) for moderation.`);
        }
      } catch (e) {
        logger.error('Scheduled anomaly scan failed: ' + e.message);
      }
    });

    // Feature distribution snapshot, daily. PSI compares one day's binned
    // distribution against another's, so a missed snapshot is a hole in the
    // series that cannot be backfilled — the raw values have aged out of the
    // window by the time anyone notices.
    const driftMonitor = require('./modules/ml/governance/driftMonitor');
    cron.schedule('50 2 * * *', () => {
      driftMonitor.captureSnapshots().catch((e) =>
        logger.error('Scheduled drift snapshot failed: ' + e.message)
      );
    });

    logger.info('✅ ML demand aggregation, anomaly scan and drift snapshot scheduled.');

    // ─── Phase-2 subsystems ──────────────────────────────────────────────
    //
    // All of these produce artefacts that the ranking path reads but never
    // writes, so they are scheduled rather than computed on demand, and each is
    // staggered away from the others. Running the graph propagation and the
    // vector index build in the same minute would put two multi-minute CPU
    // loops on one instance while it is also serving.
    //
    // Every one of them is inert until its config flag is switched on. The
    // schedule exists so that when an operator does switch a flag on, there is
    // already an artefact to read rather than an empty table and a feature that
    // appears not to work.

    // Graph embeddings, nightly at 03:45 — after the affinity matrix rebuild at
    // 03:15, since both read the same event log and the graph is the heavier of
    // the two.
    cron.schedule('45 3 * * *', async () => {
      try {
        const cfg = await mlConfig.get(null);
        const lightgcn = require('./modules/ml/graph/lightgcn');
        const result = await lightgcn.build({
          dim: Number(cfg.ml_graph_dim) || 32,
          layers: Number(cfg.ml_graph_layers) || 3,
        });
        lightgcn.invalidate();
        if (!result.built) {
          logger.info(`Graph rebuild produced nothing (${result.reason}); this is expected before the event log has volume.`);
        }
      } catch (e) {
        logger.error('Scheduled graph rebuild failed: ' + e.message);
      }
    });

    // Vector index, nightly at 04:10. Rebuilt from the catalogue rather than
    // the event log, so it is the one job that is useful from day one.
    cron.schedule('10 4 * * *', async () => {
      try {
        const cfg = await mlConfig.get(null);
        await require('./modules/ml/vector/vectorIndex.service').build({
          M: Number(cfg.ml_ann_m) || 16,
          efConstruction: Number(cfg.ml_ann_ef_construction) || 200,
        });
      } catch (e) {
        logger.error('Scheduled vector index rebuild failed: ' + e.message);
      }
    });

    // Cold-start priors, nightly at 04:30. The donor search is quadratic in the
    // number of pincodes, and the answer moves on the order of days.
    cron.schedule('30 4 * * *', () => {
      require('./modules/ml/coldstart/coldStart').rebuildPriors().catch((e) =>
        logger.error('Scheduled cold-start prior rebuild failed: ' + e.message)
      );
    });

    // Sequence model, weekly on Sunday at 05:00. Weekly rather than nightly
    // because it needs a week of new sessions to learn anything new from, and
    // because it refuses to activate a model that does not beat the popularity
    // baseline — nightly runs would mostly log that refusal.
    cron.schedule('0 5 * * 0', () => {
      require('./modules/ml/sequence/intentModel').train().catch((e) =>
        logger.error('Scheduled sequence model training failed: ' + e.message)
      );
    });

    // Uplift model, weekly on Sunday at 05:30. Same reasoning: the treatment
    // groups need time to accumulate.
    cron.schedule('30 5 * * 0', () => {
      require('./modules/ml/causal/upliftModel').trainFromLog().catch((e) =>
        logger.error('Scheduled uplift model fit failed: ' + e.message)
      );
    });

    // Feature materialisation, every six hours. This does not feed serving —
    // the online path computes and caches — it writes the record the freshness
    // report reads, which is the only way staleness is visible at all.
    cron.schedule('20 */6 * * *', async () => {
      try {
        const store = require('./modules/ml/featurestore');
        const { query } = require('./config/database');
        const shops = await query('SELECT id FROM local_shops WHERE COALESCE(is_active, 1) = 1 LIMIT 2000');
        const ids = (shops.rows || shops || []).map((row) => row.id);
        if (ids.length === 0) return;
        for (const feature of store.registry.forEntity('shop')) {
          await store.materialize(feature, ids);
        }
      } catch (e) {
        logger.error('Scheduled feature materialisation failed: ' + e.message);
      }
    });

    // The vector index is loaded from disk at boot rather than rebuilt. A cold
    // instance that rebuilt on startup would spend its first minutes at full
    // CPU while taking traffic, and the persisted index is at most a day old.
    require('./modules/ml/vector/vectorIndex.service').load()
      .then((loaded) => {
        if (!loaded) logger.info('Vector index: nothing persisted yet; the nightly job will build one.');
      })
      .catch((e) => logger.warn('Vector index load failed: ' + e.message));

    logger.info('✅ ML phase-2 jobs scheduled (graph 03:45, vectors 04:10, cold start 04:30, sequence + uplift Sun 05:00).');

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

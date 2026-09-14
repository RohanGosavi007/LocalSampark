/**
 * ML telemetry and control plane.
 *
 * Two groups of endpoints with deliberately different postures:
 *
 *   POST /ml/events      Public, optionally authenticated, always 202. This is
 *                        the highest-volume endpoint in the platform once the
 *                        clients are instrumented — every card scrolled past is
 *                        an impression — so it does as little as possible and
 *                        never fails a caller.
 *
 *   /ml/admin/*          Admin only, behind requireAdmin, with weight changes
 *                        restricted further to super admins. These control what
 *                        every user of the platform sees.
 */

const express = require('express');
const router = express.Router();

const { optionalAuth, authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const telemetry = require('../services/telemetry.service');
const mlconfig = require('../services/mlconfig.service');
const logger = require('../../../config/logger');

/**
 * Per-IP ingest ceiling.
 *
 * The global rate limiter is tuned for ordinary API traffic and would reject
 * legitimate telemetry from an active user. This is a separate, much higher
 * allowance that exists only to stop one client flooding the table — it is an
 * abuse control, not a fairness control. Deliberately in-memory: Redis is
 * optional here, and a rate limiter that hard-depends on it would take ingest
 * down whenever Redis is absent.
 */
const INGEST_WINDOW_MS = 60000;
const INGEST_MAX_BATCHES = 120;
const ingestCounters = new Map();

function ingestLimiter(req, res, next) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = ingestCounters.get(key);

  if (!entry || now - entry.start > INGEST_WINDOW_MS) {
    ingestCounters.set(key, { start: now, count: 1 });
    return next();
  }

  entry.count += 1;
  if (entry.count > INGEST_MAX_BATCHES) {
    // Still 202. A throttled client must not retry or surface an error; the
    // response says nothing was accepted and that is the end of it.
    return res.status(202).json({ accepted: 0, rejected: 0, throttled: true });
  }
  return next();
}

// Unbounded Maps are a slow leak on a public endpoint: one entry per distinct
// client IP, held forever. Swept on an interval that is unref'd so it cannot
// keep the process alive during a graceful shutdown.
const ingestSweeper = setInterval(() => {
  const cutoff = Date.now() - INGEST_WINDOW_MS * 2;
  for (const [key, entry] of ingestCounters) {
    if (entry.start < cutoff) ingestCounters.delete(key);
  }
}, INGEST_WINDOW_MS);
ingestSweeper.unref();

// ─── INGEST ──────────────────────────────────────────────────────────────────

/**
 * POST /ml/events
 *
 * Body: { events: [...], session_token?: string }
 *
 * Always answers 202 with a count. Clients fire and forget; there is no retry
 * protocol, because a retried impression would corrupt the CTR denominator that
 * every rate metric is built on.
 */
router.post('/events', ingestLimiter, optionalAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const events = Array.isArray(body.events) ? body.events : (Array.isArray(body) ? body : []);

    const context = {
      userId: req.user ? (req.user.id || req.user.userId) : null,
      sessionId: telemetry.deriveSessionId(body.session_token || body.sessionToken || req.headers['x-session-token']),
      regionId: body.region_id || body.regionId || req.headers['x-territory-id'] || null,
      pincode: body.pincode || null,
    };

    const result = await telemetry.recordBatch(events, context);
    return res.status(202).json({ accepted: result.accepted, rejected: result.rejected });
  } catch (err) {
    // Never propagate to the error handler: a 500 here would show up in client
    // error tracking as a user-facing failure when nothing a user did failed.
    logger.error('ML ingest handler error: ' + err.message);
    return res.status(202).json({ accepted: 0, rejected: 0 });
  }
});

/**
 * GET /ml/config/public
 *
 * What the clients need to know before they start tracking: whether ML is on
 * for a surface, and the event vocabulary. Lets a client stop sending events
 * entirely when the engine is switched off, rather than filling the table with
 * rows nothing will read.
 */
router.get('/config/public', async (req, res, next) => {
  try {
    const regionId = req.query.region_id || req.headers['x-territory-id'] || null;
    const cfg = await mlconfig.get(regionId);
    return res.json({
      success: true,
      ml_enabled: cfg.ml_enabled,
      surfaces: {
        shops: cfg.ml_enabled && cfg.ml_enabled_shops,
        services: cfg.ml_enabled && cfg.ml_enabled_services,
        jobs: cfg.ml_enabled && cfg.ml_enabled_jobs,
        marketplace: cfg.ml_enabled && cfg.ml_enabled_marketplace,
      },
      // Telemetry collection is independent of ranking. Events are gathered
      // while the engine is dark, because that is the history phase 4 needs.
      telemetry_enabled: true,
      event_types: telemetry.VALID_EVENTS,
      batch_max: telemetry.MAX_BATCH,
    });
  } catch (err) {
    next(err);
  }
});

// ─── ADMIN CONTROL PLANE ─────────────────────────────────────────────────────

const adminOnly = [authenticate, requireAdmin];

function isSuperAdmin(req) {
  return req.adminRole && String(req.adminRole.role).toUpperCase() === 'SUPER_ADMIN';
}

/**
 * Territory admins may read and curate within their own region; changing
 * weights or the master switch is a platform-wide decision and is restricted to
 * super admins. Enforced here rather than by the console hiding the control,
 * because a hidden button is not an authorisation boundary.
 */
function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({
      success: false,
      error: 'Changing ML configuration requires super admin.',
    });
  }
  return next();
}

/**
 * Restricts a territory admin to their own region.
 *
 * A territory admin who omits region_id gets their own; one who names a
 * different region is refused rather than silently redirected, so a mistaken
 * request fails loudly instead of editing the wrong territory's config.
 */
function resolveRegionScope(req) {
  const requested = req.query.region_id || (req.body && req.body.region_id) || null;
  if (isSuperAdmin(req)) return { regionId: requested || null };

  const own = req.adminRole && req.adminRole.regionId;
  if (!own) {
    const err = new Error('No territory is assigned to this admin account.');
    err.status = 403;
    throw err;
  }
  if (requested && requested !== own) {
    const err = new Error('You may only act on your own territory.');
    err.status = 403;
    throw err;
  }
  return { regionId: own };
}

/** GET /ml/admin/config — current resolved values, defaults and bounds. */
router.get('/admin/config', ...adminOnly, async (req, res, next) => {
  try {
    const { regionId } = resolveRegionScope(req);
    const values = await mlconfig.get(regionId);
    const weights = await mlconfig.getWeights(regionId);
    return res.json({
      success: true,
      region_id: regionId,
      values,
      // Raw weights are what an operator set; normalised is what the ranker
      // actually applies. Showing both prevents the recurring confusion of
      // "I set it to 0.4 but the panel says 0.33".
      normalized_weights: weights,
      defaults: mlconfig.DEFAULTS,
      bounds: mlconfig.BOUNDS,
      boolean_keys: mlconfig.BOOLEAN_KEYS,
    });
  } catch (err) {
    next(err);
  }
});

/** PUT /ml/admin/config — set one key. */
router.put('/admin/config', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ success: false, error: 'key is required' });

    const { regionId } = resolveRegionScope(req);
    const actor = req.user.id || req.user.userId;
    const result = await mlconfig.set(key, value, { regionId, updatedBy: actor });

    // admin_audit_log is the existing governance trail; a weight change alters
    // what every user sees and belongs in it alongside the other admin actions.
    try {
      const { query } = require('../../../config/database');
      await query(
        `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [actor, 'ML_CONFIG_UPDATE', 'ml_config', key,
         JSON.stringify({ key, value: result.value, region_id: regionId })]
      );
    } catch (auditErr) {
      logger.warn('ML config audit write failed: ' + auditErr.message);
    }

    return res.json({ success: true, updated: result });
  } catch (err) {
    next(err);
  }
});

/** POST /ml/admin/config/reset — restore committed defaults. */
router.post('/admin/config/reset', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const { regionId } = resolveRegionScope(req);
    const actor = req.user.id || req.user.userId;
    const changed = await mlconfig.resetToDefaults({ regionId, updatedBy: actor });
    return res.json({ success: true, reset: changed.length, keys: changed });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /ml/admin/kill — the one-click stop.
 *
 * Separate from the generic config endpoint so it is unmissable in the console
 * and in the audit log. Sets ml_enabled false globally and broadcasts the
 * invalidation, so every instance serves the baseline feed on its next request
 * rather than up to 30 seconds later.
 */
router.post('/admin/kill', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const actor = req.user.id || req.user.userId;
    const reason = (req.body && req.body.reason) || 'No reason given';
    await mlconfig.set('ml_enabled', false, { regionId: null, updatedBy: actor });

    try {
      const { query } = require('../../../config/database');
      await query(
        `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [actor, 'ML_KILL_SWITCH', 'ml_config', 'ml_enabled', JSON.stringify({ reason })]
      );
    } catch (auditErr) {
      logger.warn('ML kill-switch audit write failed: ' + auditErr.message);
    }

    logger.warn(`🛑 ML ranking disabled platform-wide by ${actor}. Reason: ${reason}`);
    return res.json({ success: true, ml_enabled: false, message: 'ML ranking disabled. All surfaces now serve the deterministic baseline.' });
  } catch (err) {
    next(err);
  }
});

/** GET /ml/admin/metrics — CTR, coverage and volume for the console. */
router.get('/admin/metrics', ...adminOnly, async (req, res, next) => {
  try {
    const { regionId } = resolveRegionScope(req);
    const metrics = await telemetry.getMetrics({
      surface: req.query.surface || null,
      sinceHours: Number(req.query.hours) || 24,
      regionId,
    });
    return res.json({ success: true, metrics });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /ml/admin/readiness — progress toward collaborative filtering.
 *
 * Exists so the console can state plainly that the engine is running on
 * heuristics and how far off the collaborative stage is, rather than implying a
 * trained model is live when the interaction log is nearly empty.
 */
router.get('/admin/readiness', ...adminOnly, async (req, res, next) => {
  try {
    const readiness = await telemetry.getReadiness();
    return res.json({ success: true, readiness });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

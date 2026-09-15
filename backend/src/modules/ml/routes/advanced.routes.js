/**
 * Endpoints for the bandit, experiments, moderation queue and drift reporting.
 *
 * Split from ml.routes.js because that file is already the telemetry and config
 * surface and these are a different concern; mounting them separately also
 * keeps the public bandit endpoint away from the admin block.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const { optionalAuth, authenticate, requireAdmin } = require('../../../middleware/auth.middleware');
const { query } = require('../../../config/database');
const mlconfig = require('../services/mlconfig.service');
const bandit = require('../bandits/contextualBandit');
const abTesting = require('../experimentation/abTestingManager');
const anomaly = require('../safety/anomalyDetector');
const drift = require('../governance/driftMonitor');
const logger = require('../../../config/logger');

// ─── HOME LAYOUT (public) ────────────────────────────────────────────────────

/**
 * GET /ml/layout/home
 *
 * The module order for this user's home screen. Answers with the default order
 * on any failure, so a client always has something to render.
 */
router.get('/layout/home', optionalAuth, async (req, res) => {
  const started = Date.now();
  try {
    const regionId = req.query.region_id || req.headers['x-territory-id'] || null;
    const cfg = await mlconfig.get(regionId);

    let categoryAffinity = {};
    if (req.query.affinity) {
      try {
        const parsed = JSON.parse(req.query.affinity);
        if (parsed && typeof parsed === 'object') categoryAffinity = parsed;
      } catch {
        // A malformed affinity blob is a client bug, not a reason to refuse a
        // layout. The feature contributes 0 without it.
      }
    }

    const result = await bandit.selectLayout({
      localHour: req.query.local_hour != null ? parseInt(req.query.local_hour, 10) : null,
      dayOfWeek: req.query.day_of_week != null ? parseInt(req.query.day_of_week, 10) : null,
      tenureDays: req.query.tenure_days != null ? parseInt(req.query.tenure_days, 10) : 0,
      pincode: req.query.pincode || null,
      sessionDepth: req.query.session_depth != null ? parseInt(req.query.session_depth, 10) : 0,
      categoryAffinity,
    }, { cfg, regionId });

    return res.json({
      success: true,
      layout: result.layout,
      strategy: result.strategy,
      reason: result.reason || null,
      timings: { total_ms: Date.now() - started },
    });
  } catch (err) {
    logger.error('Home layout selection failed: ' + err.message);
    return res.json({
      success: true,
      layout: [...bandit.ARMS],
      strategy: 'default',
      reason: 'error',
      timings: { total_ms: Date.now() - started },
    });
  }
});

/**
 * POST /ml/layout/reward
 *
 * Reports engagement with a module. Answers 202 immediately and updates the
 * policy afterwards: this is called from a render path, and the brief's
 * constraint against blocking ML work in operational queries applies most
 * directly here.
 */
router.post('/layout/reward', optionalAuth, async (req, res) => {
  const body = req.body || {};
  res.status(202).json({ accepted: true });

  // Deliberately after the response. A failed policy update costs one
  // observation; a slow one would cost a frame.
  setImmediate(async () => {
    try {
      const regionId = body.region_id || req.headers['x-territory-id'] || null;
      const cfg = await mlconfig.get(regionId);
      if (cfg.ml_bandit_enabled !== true) return;

      await bandit.recordReward({
        arm: body.arm,
        reward: body.reward,
        regionId,
        cfg,
        context: {
          localHour: body.local_hour,
          dayOfWeek: body.day_of_week,
          tenureDays: body.tenure_days,
          pincode: body.pincode,
          sessionDepth: body.session_depth,
          categoryAffinity: body.affinity || {},
        },
      });
    } catch (err) {
      logger.warn('Deferred bandit reward failed: ' + err.message);
    }
  });
});

/** GET /ml/experiment/:key — this caller's variant. */
router.get('/experiment/:key', optionalAuth, async (req, res) => {
  try {
    const subjectId = req.user ? (req.user.id || req.user.userId) : (req.query.subject || null);
    const assignment = await abTesting.assign(req.params.key, subjectId);
    return res.json({ success: true, ...assignment });
  } catch (err) {
    logger.warn('Experiment assignment failed: ' + err.message);
    return res.json({ success: true, inExperiment: false, variant: null, config: {}, reason: 'error' });
  }
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────

const adminOnly = [authenticate, requireAdmin];

function isSuperAdmin(req) {
  return req.adminRole && String(req.adminRole.role).toUpperCase() === 'SUPER_ADMIN';
}

function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(req)) {
    return res.status(403).json({ success: false, error: 'This action requires super admin.' });
  }
  return next();
}

/** GET /ml/admin/bandit — arm statistics. */
router.get('/admin/bandit', ...adminOnly, async (req, res, next) => {
  try {
    const regionId = req.query.region_id || null;
    return res.json({ success: true, arms: await bandit.stats(regionId) });
  } catch (err) {
    next(err);
  }
});

/** POST /ml/admin/bandit/reset — discard learned state. */
router.post('/admin/bandit/reset', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const regionId = (req.body && req.body.region_id) || null;
    const result = await bandit.reset(regionId);
    const actor = req.user.id || req.user.userId;
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [actor, 'ML_BANDIT_RESET', 'ml_bandit', bandit.POLICY, JSON.stringify({ region_id: regionId })]
    ).catch(() => {});
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/** GET /ml/admin/experiments — every experiment. */
router.get('/admin/experiments', ...adminOnly, async (req, res, next) => {
  try {
    const res2 = await query('SELECT * FROM ml_experiments ORDER BY created_at DESC');
    const rows = (res2.rows || res2 || []).map((r) => ({
      ...r,
      variants: (() => { try { return JSON.parse(r.variants); } catch { return []; } })(),
    }));
    return res.json({ success: true, experiments: rows });
  } catch (err) {
    next(err);
  }
});

/** PUT /ml/admin/experiments — create or update one. */
router.put('/admin/experiments', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const key = String(body.key || '').trim();
    if (!key) return res.status(400).json({ success: false, error: 'key is required' });

    const variants = Array.isArray(body.variants) ? body.variants : null;
    if (!variants || variants.length < 2) {
      return res.status(400).json({ success: false, error: 'At least two variants are required.' });
    }
    // A variant with no weight can never be assigned, which is a silently
    // broken experiment rather than an obviously broken one.
    if (variants.some((v) => !v.name || !(Number(v.weight) > 0))) {
      return res.status(400).json({ success: false, error: 'Every variant needs a name and a weight above zero.' });
    }

    const traffic = Math.min(Math.max(parseInt(body.traffic_pct, 10) || 100, 0), 100);
    const actor = req.user.id || req.user.userId;

    const existing = await query('SELECT id FROM ml_experiments WHERE key = $1', [key]);
    const found = (existing.rows || existing || [])[0];

    if (found) {
      await query(
        `UPDATE ml_experiments
            SET description = $1, variants = $2, traffic_pct = $3, is_active = $4
          WHERE id = $5`,
        [body.description || null, JSON.stringify(variants), traffic,
          body.is_active ? 1 : 0, found.id]
      );
    } else {
      await query(
        `INSERT INTO ml_experiments (id, key, description, variants, traffic_pct, is_active, started_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)`,
        [crypto.randomUUID(), key, body.description || null, JSON.stringify(variants),
          traffic, body.is_active ? 1 : 0, actor]
      );
    }

    abTesting.invalidate();
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [actor, 'ML_EXPERIMENT_UPDATE', 'ml_experiment', key,
        JSON.stringify({ variants, traffic_pct: traffic, is_active: Boolean(body.is_active) })]
    ).catch(() => {});

    return res.json({ success: true, key });
  } catch (err) {
    next(err);
  }
});

/** GET /ml/admin/experiments/:key/results — per-variant outcomes. */
router.get('/admin/experiments/:key/results', ...adminOnly, async (req, res, next) => {
  try {
    const hours = Math.min(Math.max(parseInt(req.query.hours, 10) || 168, 1), 2160);
    return res.json({ success: true, results: await abTesting.results(req.params.key, { sinceHours: hours }) });
  } catch (err) {
    next(err);
  }
});

/** GET /ml/admin/moderation — the AI risk queue. */
router.get('/admin/moderation', ...adminOnly, async (req, res, next) => {
  try {
    const items = await anomaly.getQueue({
      status: req.query.status || 'pending',
      limit: parseInt(req.query.limit, 10) || 50,
      regionId: req.query.region_id || null,
    });
    return res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
});

/** PUT /ml/admin/moderation/:id — record a decision. */
router.put('/admin/moderation/:id', ...adminOnly, async (req, res, next) => {
  try {
    const body = req.body || {};
    const actor = req.user.id || req.user.userId;
    const result = await anomaly.resolve(req.params.id, {
      status: body.status,
      note: body.note,
      reviewedBy: actor,
    });
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [actor, 'ML_MODERATION_DECISION', 'ml_moderation', req.params.id,
        JSON.stringify({ status: body.status, note: body.note })]
    ).catch(() => {});
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/** POST /ml/admin/moderation/scan — run the detectors now. */
router.post('/admin/moderation/scan', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    const cfg = await mlconfig.get(null);
    return res.json({ success: true, summary: await anomaly.runAll({ cfg }) });
  } catch (err) {
    next(err);
  }
});

/** GET /ml/admin/drift — PSI per ranking feature. */
router.get('/admin/drift', ...adminOnly, async (req, res, next) => {
  try {
    const cfg = await mlconfig.get(null);
    return res.json({ success: true, drift: await drift.report({ cfg }) });
  } catch (err) {
    next(err);
  }
});

/** POST /ml/admin/drift/snapshot — capture today's distributions. */
router.post('/admin/drift/snapshot', ...adminOnly, requireSuperAdmin, async (req, res, next) => {
  try {
    return res.json({ success: true, snapshot: await drift.captureSnapshots() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

/**
 * Runtime configuration for the ranking engine.
 *
 * Every weight, threshold and switch the ranker reads resolves through here,
 * backed by `admin_config` rows in the 'ml' category. Nothing in the scoring
 * path may use a hardcoded constant: the requirement is that an administrator
 * has complete control over ML behaviour, and a constant compiled into the
 * ranker is by definition outside their reach.
 *
 * Two problems this has to solve that the existing FeatureFlagService does not:
 *
 *  1. FeatureFlagService caches in-process for 30 seconds with no invalidation
 *     channel. On more than one instance that means a "kill switch" takes up to
 *     30 seconds and applies unevenly — instance A serving ML results while
 *     instance B serves the baseline. A switch with a 30-second uncertain tail
 *     is not a kill switch. This publishes an invalidation over Redis so every
 *     instance drops its cache at once.
 *
 *  2. Feature flags are booleans. Weights are numbers, and they need to be
 *     tunable per territory, which admin_config already supports through its
 *     region_id column.
 *
 * Redis is optional in this deployment — connectRedis() gives up after three
 * retries and leaves the client null — so the cache still expires on a timer as
 * a floor. Redis makes invalidation immediate; its absence makes it eventual,
 * never broken.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

const CATEGORY = 'ml';
const CHANNEL = 'ml:config:invalidate';

/**
 * Region-scoped keys are stored as `<key>::<regionId>`.
 *
 * admin_config declares `config_key TEXT UNIQUE` — the uniqueness is on the key
 * alone, not on (config_key, region_id) — so two rows cannot share a key even
 * when their region_id differs. That makes the table's own region_id column
 * unusable for scoping, and it is not an oversight worth fixing here: eleven
 * other files read this table, and zone.routes.js already works around the same
 * constraint the same way, storing per-territory data under
 * `'territory_features_' || r.id`. Following the existing convention is safer
 * than changing a constraint other features depend on.
 *
 * region_id is still written on the row so the data is queryable and so the
 * scoping is visible to anyone reading the table directly.
 */
function storageKey(key, regionId) {
  return regionId ? `${key}::${regionId}` : key;
}

/**
 * Committed defaults.
 *
 * These are the values migration 094 seeds into admin_config, repeated here for
 * a specific reason: if the database is unreachable, or an operator deletes a
 * row, the ranker must still resolve every key rather than fall over or silently
 * treat a missing weight as zero. A missing `ml_w_dist` that defaults to 0 would
 * turn off proximity — the single most important signal in a hyperlocal feed —
 * without anything reporting an error.
 *
 * They are also what the admin console's "reset to defaults" restores.
 */
const DEFAULTS = Object.freeze({
  ml_enabled: false,
  ml_enabled_shops: true,
  ml_enabled_services: true,
  ml_enabled_jobs: true,
  ml_enabled_marketplace: true,
  ml_w_sim: 0.25,
  ml_w_cf: 0.0,
  ml_w_dist: 0.4,
  ml_w_pop: 0.2,
  ml_w_rec: 0.1,
  ml_w_ctx: 0.05,
  ml_epsilon: 0.12,
  ml_distance_half_life_km: 2.0,
  ml_cf_min_support: 50,
  ml_timeout_ms: 150,
  ml_candidate_limit: 200,

  // Multi-task ranking. Exponents default to 1.0, which makes the composite
  // reduce exactly to the plain product of its three probabilities — neutral
  // rather than an opinion about which objective matters.
  ml_mmoe_enabled: false,
  ml_mmoe_alpha: 1.0,
  ml_mmoe_beta: 1.0,
  ml_mmoe_gamma: 1.0,
  ml_mmoe_lambda: 0.15,
  ml_mmoe_prior_ctr: 0.08,
  ml_mmoe_prior_cvr: 0.12,
  ml_mmoe_prior_weight: 20,

  // Contextual bandit.
  ml_bandit_enabled: false,
  ml_bandit_alpha: 1.0,
  ml_bandit_ridge: 1.0,

  // Anomaly detection and drift.
  ml_anomaly_enabled: true,
  ml_anomaly_z: 3.0,
  ml_anomaly_min_n: 10,
  ml_drift_psi_warn: 0.10,
  ml_drift_psi_alert: 0.25,
});

/**
 * Bounds for every numeric key.
 *
 * Clamping rather than trusting the stored value is deliberate. These rows are
 * writable from an admin UI, and a slider that posts 10 for ml_epsilon would
 * otherwise mean "every slot is an exploration slot" — the feed becomes random
 * and the cause is a config row, not a code path anyone would think to inspect.
 * An out-of-range value is clamped and logged, not silently honoured.
 */
const BOUNDS = Object.freeze({
  ml_w_sim: [0, 1],
  ml_w_cf: [0, 1],
  ml_w_dist: [0, 1],
  ml_w_pop: [0, 1],
  ml_w_rec: [0, 1],
  ml_w_ctx: [0, 1],
  ml_epsilon: [0, 0.5],
  ml_distance_half_life_km: [0.1, 50],
  ml_cf_min_support: [1, 100000],
  ml_timeout_ms: [10, 2000],
  ml_candidate_limit: [10, 2000],

  // Exponents: 0 switches an objective off (x^0 = 1), which is legitimate.
  // Negative would invert the objective and is never what anyone means.
  ml_mmoe_alpha: [0, 5],
  ml_mmoe_beta: [0, 5],
  ml_mmoe_gamma: [0, 5],
  ml_mmoe_lambda: [0, 5],
  ml_mmoe_prior_ctr: [0, 1],
  ml_mmoe_prior_cvr: [0, 1],
  ml_mmoe_prior_weight: [1, 10000],

  // LinUCB alpha scales the confidence width; 0 is pure exploitation.
  ml_bandit_alpha: [0, 10],
  ml_bandit_ridge: [0.001, 100],

  ml_anomaly_z: [1, 10],
  ml_anomaly_min_n: [1, 100000],
  ml_drift_psi_warn: [0, 5],
  ml_drift_psi_alert: [0, 5],
});

const BOOLEAN_KEYS = Object.freeze([
  'ml_enabled',
  'ml_enabled_shops',
  'ml_enabled_services',
  'ml_enabled_jobs',
  'ml_enabled_marketplace',
  'ml_mmoe_enabled',
  'ml_bandit_enabled',
  'ml_anomaly_enabled',
]);

const WEIGHT_KEYS = Object.freeze([
  'ml_w_sim', 'ml_w_cf', 'ml_w_dist', 'ml_w_pop', 'ml_w_rec', 'ml_w_ctx',
]);

const CACHE_TTL_MS = 30000;

/** regionKey -> { values, loadedAt }. `__global__` holds the region-less set. */
const cache = new Map();
const GLOBAL = '__global__';

let subscriber = null;

function parseValue(key, raw) {
  if (BOOLEAN_KEYS.includes(key)) {
    // SQLite stores these as the strings 'true'/'false'; an operator editing by
    // hand may well type 1/0 or 'yes'.
    const v = String(raw).trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULTS[key];

  const bound = BOUNDS[key];
  if (!bound) return n;
  const [min, max] = bound;
  if (n < min || n > max) {
    logger.warn(
      `ML config "${key}" is ${n}, outside [${min}, ${max}]. Clamping. ` +
      'Check the admin console — a stored value out of range usually means a bad write.'
    );
    return Math.min(Math.max(n, min), max);
  }
  return n;
}

async function loadFromDb(regionId) {
  const values = { ...DEFAULTS };
  try {
    // Region-scoped rows override the global ones, so the global set is read
    // first and then overlaid. A territory that has not been tuned inherits the
    // platform defaults rather than having to duplicate every key.
    const globalRows = await query(
      'SELECT config_key, config_value FROM admin_config WHERE config_category = $1 AND region_id IS NULL',
      [CATEGORY]
    );
    for (const row of globalRows.rows || globalRows || []) {
      if (row.config_key in DEFAULTS) values[row.config_key] = parseValue(row.config_key, row.config_value);
    }

    if (regionId) {
      const regionRows = await query(
        'SELECT config_key, config_value FROM admin_config WHERE config_category = $1 AND region_id = $2',
        [CATEGORY, regionId]
      );
      for (const row of regionRows.rows || regionRows || []) {
        // Strip the `::<regionId>` suffix back to the bare key.
        const bare = String(row.config_key).split('::')[0];
        if (bare in DEFAULTS) values[bare] = parseValue(bare, row.config_value);
      }
    }
  } catch (err) {
    // Falling back to defaults keeps ranking deterministic rather than throwing
    // inside a request. ml_enabled defaults to false, so a database problem
    // degrades to the baseline feed instead of an unconfigured ranker.
    logger.error('ML config load failed, using committed defaults: ' + err.message);
  }
  return values;
}

/**
 * Resolved configuration for a territory, or globally when regionId is omitted.
 */
async function get(regionId = null) {
  const key = regionId || GLOBAL;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.loadedAt < CACHE_TTL_MS) return hit.values;

  const values = await loadFromDb(regionId);
  cache.set(key, { values, loadedAt: Date.now() });
  return values;
}

/**
 * Whether ML ranking should run for a surface in a territory.
 *
 * The master switch and the per-surface switch are separate so that a problem
 * with, say, job ranking can be contained without taking recommendations off
 * the shop feed too.
 */
async function isEnabled(surface, regionId = null) {
  const cfg = await get(regionId);
  if (!cfg.ml_enabled) return false;
  const surfaceKey = `ml_enabled_${surface}`;
  if (surfaceKey in cfg) return Boolean(cfg[surfaceKey]);
  return true;
}

/**
 * Scoring weights, renormalised to sum to 1.
 *
 * Renormalisation is what lets a term be switched off without changing the
 * meaning of the others. ml_w_cf sits at 0 until the affinity matrix has
 * support; without this, zeroing it would quietly shrink every score by
 * whatever the collaborative weight used to contribute and make scores from
 * before and after the change incomparable.
 *
 * If an operator somehow zeroes every weight, fall back to the defaults rather
 * than dividing by zero and returning NaN scores for the whole catalogue.
 */
async function getWeights(regionId = null) {
  const cfg = await get(regionId);
  const raw = {};
  let total = 0;
  for (const k of WEIGHT_KEYS) {
    raw[k] = cfg[k];
    total += cfg[k];
  }

  if (total <= 0) {
    logger.warn('All ML scoring weights are zero; falling back to committed defaults.');
    let d = 0;
    for (const k of WEIGHT_KEYS) d += DEFAULTS[k];
    const out = {};
    for (const k of WEIGHT_KEYS) out[k] = DEFAULTS[k] / d;
    return out;
  }

  const out = {};
  for (const k of WEIGHT_KEYS) out[k] = raw[k] / total;
  return out;
}

/** Drops every cached set in this process. */
function invalidateLocal() {
  cache.clear();
}

/**
 * Invalidates this process and publishes to the others.
 *
 * Called after any admin write. The local clear happens first and
 * unconditionally, so a Redis outage degrades this to "the writing instance is
 * immediate, the rest catch up within the TTL" rather than losing the change.
 */
async function invalidate() {
  invalidateLocal();
  try {
    const { redisClient } = require('../../../config/redis');
    if (redisClient && typeof redisClient.publish === 'function') {
      await redisClient.publish(CHANNEL, String(Date.now()));
    }
  } catch (err) {
    logger.warn('ML config invalidation broadcast failed (local cache cleared): ' + err.message);
  }
}

/**
 * Subscribes to invalidations from other instances.
 *
 * node-redis requires a dedicated connection for subscribe — a client in
 * subscriber mode cannot run normal commands — so this duplicates the client
 * rather than reusing the shared one, which the rest of the app needs for GET
 * and SET.
 */
async function initInvalidationListener() {
  try {
    const { redisClient } = require('../../../config/redis');
    if (!redisClient || typeof redisClient.duplicate !== 'function') {
      logger.info('ML config: Redis unavailable, config changes propagate within 30s by TTL.');
      return false;
    }
    subscriber = redisClient.duplicate();
    subscriber.on('error', (err) => logger.warn('ML config subscriber error: ' + err.message));
    await subscriber.connect();
    await subscriber.subscribe(CHANNEL, () => {
      invalidateLocal();
      logger.info('ML config invalidated by another instance.');
    });
    logger.info('✅ ML config invalidation listener active.');
    return true;
  } catch (err) {
    logger.warn('ML config invalidation listener failed to start: ' + err.message);
    return false;
  }
}

/** Closes the subscriber connection during graceful shutdown. */
async function close() {
  if (subscriber) {
    try {
      await subscriber.quit();
    } catch {
      /* already closing */
    }
    subscriber = null;
  }
}

/**
 * Writes one key, scoped globally or to a territory.
 *
 * `updatedBy` is required rather than optional: these rows change what every
 * user sees, and "who lowered the distance weight last Tuesday" has to be
 * answerable. The value is validated through the same parser the read path
 * uses, so an out-of-range write is rejected here rather than clamped silently
 * on every subsequent read.
 */
async function set(key, value, { regionId = null, updatedBy } = {}) {
  if (!(key in DEFAULTS)) {
    const err = new Error(`Unknown ML config key: ${key}`);
    err.status = 400;
    throw err;
  }
  if (!updatedBy) {
    const err = new Error('updatedBy is required when changing ML configuration');
    err.status = 400;
    throw err;
  }

  if (!BOOLEAN_KEYS.includes(key)) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      const err = new Error(`ML config "${key}" must be a number, received: ${value}`);
      err.status = 400;
      throw err;
    }
    const bound = BOUNDS[key];
    if (bound && (n < bound[0] || n > bound[1])) {
      const err = new Error(`ML config "${key}" must be between ${bound[0]} and ${bound[1]}, received ${n}`);
      err.status = 400;
      throw err;
    }
  }

  const stored = BOOLEAN_KEYS.includes(key)
    ? (parseValue(key, value) ? 'true' : 'false')
    : String(Number(value));

  const rowKey = storageKey(key, regionId);

  /**
   * admin_config.updated_by is a foreign key onto users(id). An actor id that
   * does not resolve to a real user therefore makes the whole write fail with a
   * constraint error — which would mean the kill switch could be blocked by a
   * referential detail. Nothing about stopping the ranking engine should depend
   * on the actor's row still existing.
   *
   * The id is resolved first and stored as NULL when it does not match a user.
   * Attribution is not lost: the route writes the real actor into
   * admin_audit_log, which has no such constraint.
   */
  let actorId = updatedBy;
  try {
    const actor = await query('SELECT id FROM users WHERE id = $1', [updatedBy]);
    if (!(actor.rows || actor || []).length) {
      logger.warn(
        `ML config change by "${updatedBy}", which is not a users(id). ` +
        'Storing updated_by as NULL; attribution is in admin_audit_log.'
      );
      actorId = null;
    }
  } catch (err) {
    logger.warn('Could not verify ML config actor, storing NULL: ' + err.message);
    actorId = null;
  }

  // Matched on config_key rather than id. The id column is
  // `TEXT PRIMARY KEY` with no default on SQLite, which — unlike every other
  // engine — permits NULL in a primary key, so rows seeded without an explicit
  // id have a NULL one and `WHERE id = ?` silently matches nothing. config_key
  // is UNIQUE, so it is the reliable identifier on both engines.
  const existing = await query(
    'SELECT config_key FROM admin_config WHERE config_key = $1',
    [rowKey]
  );
  const found = (existing.rows || existing || [])[0];

  if (found) {
    await query(
      'UPDATE admin_config SET config_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE config_key = $3',
      [stored, actorId, rowKey]
    );
  } else {
    await query(
      `INSERT INTO admin_config (id, config_key, config_value, config_category, description, region_id, is_active, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, 1, $7)`,
      [crypto.randomUUID(), rowKey, stored, CATEGORY,
       `ML runtime configuration: ${key}`, regionId, actorId]
    );
  }

  await invalidate();
  return { key, value: stored, regionId: regionId || null };
}

/** Restores every key to its committed default. */
async function resetToDefaults({ regionId = null, updatedBy } = {}) {
  const changed = [];
  for (const key of Object.keys(DEFAULTS)) {
    await set(key, DEFAULTS[key], { regionId, updatedBy });
    changed.push(key);
  }
  return changed;
}

module.exports = {
  get,
  set,
  getWeights,
  isEnabled,
  resetToDefaults,
  invalidate,
  invalidateLocal,
  initInvalidationListener,
  close,
  DEFAULTS,
  BOUNDS,
  BOOLEAN_KEYS,
  WEIGHT_KEYS,
  CATEGORY,
  CHANNEL,
};

/**
 * Administrator overrides for the launch feature registry (A12, P6).
 *
 * packages/shared/src/features.js is the single registry: every feature's key,
 * category and launch default. Route gating (featureFlag.middleware.js), the
 * public GET /features and the clients all evaluate it through
 * isFeatureEnabled(), which honours FEATURE_<KEY> in process.env.
 *
 * The console's kill switch used to write process.env[`FEATURE_${k}_ENABLED`]
 * for body keys such as KRISHI_ENABLED. isFeatureEnabled() reads FEATURE_KRISHI,
 * so the switch changed nothing, and even a correctly named write would have
 * been lost on restart and invisible to every other instance.
 *
 * Overrides now live in admin_config (category 'feature_flag', key
 * FEATURE_<KEY>), are applied to process.env the moment they are written, and
 * are re-read on startup and every REFRESH_MS so other instances converge.
 */
const crypto = require('crypto');
const { query, queryOne, queryMany } = require('../config/database');
const { FEATURES, isFeatureEnabled } = require('../../../packages/shared/src/features');

const CATEGORY = 'feature_flag';
const REFRESH_MS = 30000;

/** Feature keys whose kill switch would take the platform itself down. */
const NOT_SWITCHABLE = new Set(['commerce_core']);

/** Legacy console body keys, accepted so existing callers keep working. */
const LEGACY_KEYS = {
  SOCIETY_ENABLED: 'society_management',
  CARPOOL_ENABLED: 'carpool',
  JOBS_ENABLED: 'jobs',
  KRISHI_ENABLED: 'krishi',
  SOS_ENABLED: 'emergency_sos',
};

const definitions = () => Object.values(FEATURES);
const known = (key) => definitions().some((d) => d.key === key);
const envName = (key) => `FEATURE_${String(key).toUpperCase()}`;
const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true';

/** Environment overrides present when the process started; never overwritten by the DB. */
const bootEnv = {};
for (const def of definitions()) {
  if (process.env[envName(def.key)] !== undefined) bootEnv[def.key] = process.env[envName(def.key)];
}

let lastLoad = 0;

/** Reads every stored override and applies it to process.env. Returns { key: boolean }. */
async function load() {
  const rows = await queryMany(
    'SELECT config_key, config_value FROM admin_config WHERE config_category = $1',
    [CATEGORY]
  );
  const overrides = {};
  for (const row of rows) {
    const key = String(row.config_key).replace(/^FEATURE_/, '').toLowerCase();
    if (!known(key)) continue;
    const raw = typeof row.config_value === 'string' ? row.config_value.replace(/^"|"$/g, '') : row.config_value;
    overrides[key] = truthy(raw);
    process.env[envName(key)] = overrides[key] ? 'true' : 'false';
  }
  lastLoad = Date.now();
  return overrides;
}

/** load(), at most once per REFRESH_MS unless forced. Never throws. */
async function refresh(force = false) {
  if (!force && Date.now() - lastLoad < REFRESH_MS) return;
  try {
    await load();
  } catch (err) {
    console.warn('[featureOverrides] could not read overrides:', err.message);
  }
}

/** Normalises a request body into { featureKey: boolean }, or throws a 400-style error. */
function normalise(body) {
  const source = body && typeof body.features === 'object' && body.features !== null ? body.features : body || {};
  const out = {};
  for (const [rawKey, value] of Object.entries(source)) {
    const key = LEGACY_KEYS[rawKey] || String(rawKey).toLowerCase();
    if (!known(key)) {
      const err = new Error(`Unknown feature "${rawKey}"`);
      err.status = 400;
      throw err;
    }
    if (NOT_SWITCHABLE.has(key) && !truthy(value)) {
      const err = new Error(`"${key}" is the platform itself and cannot be switched off from the console`);
      err.status = 400;
      throw err;
    }
    if (typeof value !== 'boolean' && !['true', 'false', '1', '0', 1, 0].includes(value)) {
      const err = new Error(`"${rawKey}" must be true or false`);
      err.status = 400;
      throw err;
    }
    out[key] = truthy(value);
  }
  if (Object.keys(out).length === 0) {
    const err = new Error('No feature changes supplied');
    err.status = 400;
    throw err;
  }
  return out;
}

/** Persists and applies overrides. Returns [{ key, from, to }]. */
async function set(changes, adminId) {
  const applied = [];
  for (const [key, enabled] of Object.entries(changes)) {
    const from = isFeatureEnabled(key);
    const configKey = envName(key);
    const existing = await queryOne(
      'SELECT id FROM admin_config WHERE config_key = $1 AND config_category = $2',
      [configKey, CATEGORY]
    );
    const value = JSON.stringify(enabled ? 'true' : 'false');
    if (existing) {
      await query(
        'UPDATE admin_config SET config_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [value, adminId || null, existing.id]
      );
    } else {
      await query(
        `INSERT INTO admin_config (id, config_key, config_value, config_category, description, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), configKey, value, CATEGORY, `Console override for feature ${key}`, adminId || null]
      );
    }
    process.env[configKey] = enabled ? 'true' : 'false';
    applied.push({ key, from, to: enabled });
  }
  lastLoad = Date.now();
  return applied;
}

/** The registry as the console shows it. */
async function list() {
  await refresh(true);
  return definitions().map((def) => {
    const stored = process.env[envName(def.key)];
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      category: def.category,
      scope: def.scope,
      defaultEnabled: Boolean(def.enabled),
      enabled: isFeatureEnabled(def.key),
      overridden: stored !== undefined && bootEnv[def.key] !== stored,
      switchable: !NOT_SWITCHABLE.has(def.key),
    };
  });
}

let timer = null;
/** Called once from server start: apply stored overrides, then keep them fresh. */
async function start() {
  await refresh(true);
  if (!timer) {
    timer = setInterval(() => { refresh(true); }, REFRESH_MS);
    if (timer.unref) timer.unref();
  }
}

module.exports = { load, refresh, set, list, normalise, start, LEGACY_KEYS, NOT_SWITCHABLE, CATEGORY };

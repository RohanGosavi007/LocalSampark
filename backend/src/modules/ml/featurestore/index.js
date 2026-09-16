/**
 * Feature serving: one online path for ranking, one offline path for training.
 *
 * Both read the definitions in registry.js, so the two cannot disagree about
 * what a feature means. What differs is only how the value is obtained:
 *
 *   online(names, ids)              cache -> Redis -> compute. Sub-5ms when warm.
 *   trainingSet(rows, names)        recomputed as of each row's own timestamp.
 *
 * The offline path deliberately does not read the cache or ml_feature_values.
 * Both hold current values, and a current value in a training row is the
 * leakage this module exists to prevent. Training is slower as a result. That
 * is the correct trade: a training set is built once and a wrong one is not
 * detectable by looking at it.
 */

const crypto = require('crypto');
const registry = require('./registry');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * In-process LRU.
 *
 * Redis is optional in this deployment — connectRedis gives up after three
 * retries and leaves the client null — and a feature store that hard-depends on
 * it would take ranking down whenever it is absent. This is the floor: bounded,
 * so it cannot grow into the heap, and TTL'd, so a stale value expires rather
 * than persisting until restart.
 */
class LruCache {
  constructor(maxEntries = 20000) {
    this.max = maxEntries;
    this.map = new Map();
  }

  /**
   * A non-positive ttlMs means "treat as expired", not "never expire".
   *
   * The opposite reading is the tempting one — `ttlMs > 0 && age > ttlMs` — and
   * it makes `online(..., { ttlMs: 0 })` mean cache forever, which is the exact
   * reverse of what every caller passing 0 intends. A caller asking for a
   * zero-length cache lifetime wants a fresh computation.
   */
  get(key, ttlMs) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (ttlMs <= 0 || Date.now() - hit.at > ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    // Re-insert to move to the end: Map preserves insertion order, which is
    // what makes the eviction below least-recently-used rather than arbitrary.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, at: Date.now() });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

const cache = new LruCache();

const metrics = {
  hits: 0,
  misses: 0,
  computes: 0,
  errors: 0,
  redis_hits: 0,
};

function cacheKey(feature, entityId) {
  return `mlf:${feature}:${entityId}`;
}

async function redisClient() {
  try {
    const { redisClient: client } = require('../../../config/redis');
    if (client && typeof client.mGet === 'function') return client;
  } catch {
    /* Redis is optional. */
  }
  return null;
}

/**
 * Current values for a set of features over a set of entities.
 *
 * Returns `{ [feature]: Map<entityId, value> }`. Every requested entity is
 * present in every map: a missing feature resolves to its declared default
 * rather than to undefined, because a scoring expression that silently becomes
 * NaN is far harder to notice than one that uses a default.
 */
async function online(featureNames, entityIds, { ttlMs = 60000 } = {}) {
  const out = {};
  const ids = entityIds.map(String);
  if (ids.length === 0) {
    for (const name of featureNames) out[name] = new Map();
    return out;
  }

  const redis = await redisClient();

  for (const name of featureNames) {
    const definition = registry.get(name);
    if (!definition) {
      logger.warn(`Feature store: unknown feature "${name}" requested; skipping.`);
      out[name] = new Map();
      continue;
    }

    const values = new Map();
    const missing = [];

    for (const id of ids) {
      const hit = cache.get(cacheKey(name, id), ttlMs);
      if (hit !== undefined) {
        values.set(id, hit);
        metrics.hits += 1;
      } else {
        missing.push(id);
      }
    }

    // A second chance from Redis before computing. On more than one instance
    // this is what stops every instance recomputing the same aggregate.
    if (missing.length > 0 && redis) {
      try {
        const fetched = await redis.mGet(missing.map((id) => cacheKey(name, id)));
        const stillMissing = [];
        fetched.forEach((raw, i) => {
          const id = missing[i];
          if (raw === null || raw === undefined) {
            stillMissing.push(id);
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            values.set(id, parsed);
            cache.set(cacheKey(name, id), parsed);
            metrics.redis_hits += 1;
          } else {
            stillMissing.push(id);
          }
        });
        missing.length = 0;
        missing.push(...stillMissing);
      } catch (err) {
        logger.warn('Feature store: Redis read failed, computing locally: ' + err.message);
      }
    }

    if (missing.length > 0) {
      metrics.misses += missing.length;
      try {
        const computed = await registry.onlineFor(name)(missing);
        metrics.computes += 1;
        for (const id of missing) {
          const value = computed.has(id) ? computed.get(id) : definition.default;
          values.set(id, value);
          cache.set(cacheKey(name, id), value);
        }
        if (redis) {
          // Fire and forget. A failed cache write is not a failed feature read,
          // and awaiting it would put a network round trip on the ranking path
          // for no benefit to this request.
          const ttlSeconds = Math.max(Math.round(ttlMs / 1000), 1);
          Promise.all(missing.map((id) =>
            redis.set(cacheKey(name, id), String(values.get(id)), { EX: ttlSeconds })
          )).catch(() => { /* best effort */ });
        }
      } catch (err) {
        metrics.errors += 1;
        logger.warn(`Feature store: "${name}" failed, using default: ${err.message}`);
        for (const id of missing) values.set(id, definition.default);
      }
    }

    out[name] = values;
  }

  return out;
}

/**
 * Builds a training set with point-in-time correctness.
 *
 * `rows` are label events: `{ entityId, at, label, ...anything else }`. Each
 * row's features are computed as of that row's own `at`, so a row labelled at
 * Tuesday noon sees only what was observable at Tuesday noon.
 *
 * Rows are grouped into time buckets and each bucket resolved with one query
 * per feature. Computing per row would be one query per feature per row, which
 * on a year of events is not a slow training job, it is one that never
 * finishes. The bucket boundary is the resolution at which point-in-time
 * correctness holds, so it is a parameter and it is stated in the output:
 * an hour is fine for daily-updating features and would be wrong for a feature
 * that moves minute to minute.
 *
 * Buckets round *down*. Rounding to the nearest bucket would round half the
 * rows forward in time, which is leakage — small, systematic, and invisible.
 */
async function trainingSet(rows, featureNames, { bucketMs = 3600 * 1000 } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return { rows: [], buckets: 0 };

  const buckets = new Map();
  for (const row of rows) {
    const at = Number(row.at);
    if (!Number.isFinite(at)) continue;
    const bucket = Math.floor(at / bucketMs) * bucketMs;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket).push(row);
  }

  const out = [];

  for (const [bucket, bucketRows] of buckets) {
    const ids = [...new Set(bucketRows.map((row) => String(row.entityId)))];
    const resolved = {};

    for (const name of featureNames) {
      const definition = registry.get(name);
      if (!definition) continue;
      try {
        resolved[name] = await definition.asOf(ids, bucket);
      } catch (err) {
        metrics.errors += 1;
        logger.warn(`Feature store: as-of "${name}" failed at ${new Date(bucket).toISOString()}: ${err.message}`);
        resolved[name] = new Map();
      }
    }

    for (const row of bucketRows) {
      const features = {};
      for (const name of featureNames) {
        const definition = registry.get(name);
        if (!definition) continue;
        const value = resolved[name] ? resolved[name].get(String(row.entityId)) : undefined;
        features[name] = value === undefined ? definition.default : value;
      }
      out.push({ ...row, features, feature_bucket: bucket });
    }
  }

  // Chronological, which is what a time-based train/test split needs. Leaving
  // them grouped by bucket would put the split in the middle of a bucket.
  out.sort((a, b) => a.at - b.at);

  return { rows: out, buckets: buckets.size, bucket_ms: bucketMs };
}

/**
 * Materialises current values into ml_feature_values.
 *
 * Written for observability rather than for serving — the online path computes
 * and caches rather than reading this table. What it gives is a record of what
 * the store was saying and when, which is what the freshness report reads and
 * what makes "the ranker was using a stale CTR last Tuesday" checkable.
 */
async function materialize(featureName, entityIds) {
  const definition = registry.get(featureName);
  if (!definition) throw new Error(`Unknown feature: ${featureName}`);

  const ids = entityIds.map(String);
  if (ids.length === 0) return { written: 0 };

  const values = await registry.onlineFor(featureName)(ids);
  const now = registry.sqlTimestamp(Date.now());

  let written = 0;
  const CHUNK = 200;

  for (let start = 0; start < ids.length; start += CHUNK) {
    const slice = ids.slice(start, start + CHUNK);
    const params = [];
    const tuples = slice.map((id) => {
      const value = values.has(id) ? values.get(id) : definition.default;
      const row = [
        crypto.randomUUID(),
        featureName,
        definition.entityType,
        id,
        Number(value),
        now,
        now,
      ];
      const slots = row.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      return `(${slots.join(', ')})`;
    });

    try {
      await query(
        `INSERT INTO ml_feature_values
           (id, feature, entity_type, entity_id, value_num, valid_from, computed_at)
         VALUES ${tuples.join(', ')}`,
        params
      );
      written += slice.length;
    } catch (err) {
      // The unique index on (feature, entity_type, entity_id, valid_from) makes
      // a second write in the same second a duplicate. That is the intended
      // behaviour — one value per entity per instant — and not an error worth
      // failing the job over.
      if (!/unique|duplicate/i.test(err.message)) {
        logger.warn(`Feature store: materialise "${featureName}" failed: ${err.message}`);
      }
    }
  }

  return { written, feature: featureName };
}

/**
 * Freshness and null rate per feature, for the drift surface.
 *
 * A feature that has gone stale reports as healthy everywhere else in the
 * system: the ranker gets a number, the score is finite, nothing errors. This
 * is the only place the staleness is visible, which is why it is reported per
 * feature with its own SLA rather than as one aggregate.
 */
async function freshness() {
  const out = [];
  for (const name of registry.names()) {
    const definition = registry.get(name);
    let newest = null;
    let rowCount = 0;
    let nullCount = 0;

    try {
      const res = await query(
        `SELECT MAX(computed_at) AS newest,
                COUNT(*) AS total,
                SUM(CASE WHEN value_num IS NULL THEN 1 ELSE 0 END) AS nulls
           FROM ml_feature_values WHERE feature = $1`,
        [name]
      );
      const row = (res.rows || res || [])[0] || {};
      newest = row.newest || null;
      rowCount = Number(row.total) || 0;
      nullCount = Number(row.nulls) || 0;
    } catch (err) {
      logger.warn(`Feature store: freshness query failed for "${name}": ${err.message}`);
    }

    const newestMs = newest ? new Date(String(newest).replace(' ', 'T')).getTime() : null;
    const ageMs = newestMs && Number.isFinite(newestMs) ? Date.now() - newestMs : null;

    out.push({
      feature: name,
      entity_type: definition.entityType,
      description: definition.description,
      rows: rowCount,
      null_rate: rowCount > 0 ? nullCount / rowCount : null,
      newest_at: newest,
      age_ms: ageMs,
      sla_ms: definition.freshnessSlaMs,
      // null when nothing has ever been materialised, which is a different
      // state from "stale" and must not be reported as a breach.
      stale: ageMs == null ? null : ageMs > definition.freshnessSlaMs,
    });
  }

  // Worst offenders first, as the admin tab wants them.
  out.sort((a, b) => {
    const aRatio = a.age_ms == null ? -1 : a.age_ms / a.sla_ms;
    const bRatio = b.age_ms == null ? -1 : b.age_ms / b.sla_ms;
    return bRatio - aRatio;
  });

  return out;
}

function stats() {
  const lookups = metrics.hits + metrics.misses;
  return {
    ...metrics,
    cache_entries: cache.size,
    hit_rate: lookups > 0 ? metrics.hits / lookups : null,
    features: registry.names().length,
  };
}

function invalidate() {
  cache.clear();
}

module.exports = {
  online,
  trainingSet,
  materialize,
  freshness,
  stats,
  invalidate,
  registry,
  LruCache,
};

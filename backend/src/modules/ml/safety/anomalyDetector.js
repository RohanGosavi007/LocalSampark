/**
 * Statistical anomaly detection for listings and demand.
 *
 * Complements FraudDetectionService rather than duplicating it. That service is
 * rule-based — a phone number reused across shops, a review from the owner's own
 * device, a GPS jump faster than a car can drive — and it fires on patterns
 * somebody already knew to look for. This one has no rules: it learns what
 * normal looks like from the population and flags what is far from it, which is
 * how you catch the abuse nobody has described yet.
 *
 * Because it has no rules, it is also wrong more often. Everything here goes to
 * a moderation queue for a human, never to an automatic block. A rule hit can
 * justify an action on its own; "4.2 standard deviations from the median" cannot.
 *
 * Three detectors:
 *
 *   reviewBurst   reviews arriving far faster than this listing's own baseline
 *   priceAnomaly  a price far from the category's distribution
 *   duplicateSpam near-identical listings from one owner
 *
 * Modified z-scores throughout, not ordinary ones. The mean and standard
 * deviation are themselves moved by the outliers being looked for — a single
 * listing with 400 fake reviews raises the mean enough to make itself look
 * ordinary. The median and MAD are not moved, which is the whole reason to use
 * them here rather than the more familiar formula.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * 0.6745 is the 75th percentile of the standard normal. Dividing the MAD by it
 * makes the result comparable to a conventional standard deviation for normally
 * distributed data, so a threshold of 3 means roughly what people expect it to.
 */
const MAD_SCALE = 0.6745;

function median(values) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Median absolute deviation. */
function mad(values, med) {
  if (values.length === 0) return 0;
  return median(values.map((v) => Math.abs(v - med)));
}

/**
 * Modified z-score of one value against a population.
 *
 * Returns 0 when the MAD is zero — which happens when more than half the
 * population shares one value — rather than dividing by zero and returning
 * Infinity for every point that differs at all.
 */
function modifiedZ(value, values) {
  if (!Array.isArray(values) || values.length < 3) return 0;
  const med = median(values);
  const dispersion = mad(values, med);
  if (dispersion === 0) return 0;
  return (MAD_SCALE * (value - med)) / dispersion;
}

/**
 * Maps a z-score to a 0..100 risk score, tempered by how much evidence exists.
 *
 * A z of 6 computed from four observations is not six times more alarming than
 * a z of 1 from four hundred; it mostly means the sample is tiny. The evidence
 * factor saturates at the configured minimum, so a flag can only reach a high
 * risk score once there is enough data for the z-score to mean something.
 */
function riskScore(z, sampleSize, minSamples) {
  const magnitude = Math.min(Math.abs(z) / 6, 1);
  const evidence = Math.min(sampleSize / Math.max(minSamples, 1), 1);
  return Math.round(magnitude * evidence * 100);
}

/** Cutoff literal both engines compare correctly. See telemetry.service.js. */
function cutoffLiteral(days) {
  return new Date(Date.now() - days * 86400000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

/**
 * Enqueues a flag, or updates the open one for the same entity and detector.
 *
 * Re-flagging the same listing every run would bury everything else in the
 * queue, so the partial unique index in migration 099 permits exactly one open
 * item per (entity, detector) and this updates it in place.
 */
async function enqueue({ entityType, entityId, detector, risk, evidence, regionId = null }) {
  try {
    const existing = await query(
      `SELECT id FROM ml_moderation_queue
        WHERE entity_type = $1 AND entity_id = $2 AND detector = $3
          AND status IN ('pending', 'reviewing')`,
      [entityType, entityId, detector]
    );
    const found = (existing.rows || existing || [])[0];

    if (found) {
      await query(
        'UPDATE ml_moderation_queue SET risk_score = $1, evidence = $2 WHERE id = $3',
        [risk, JSON.stringify(evidence), found.id]
      );
      return { queued: false, updated: true, id: found.id };
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO ml_moderation_queue
         (id, entity_type, entity_id, detector, risk_score, evidence, region_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, entityType, entityId, detector, risk, JSON.stringify(evidence), regionId]
    );
    return { queued: true, updated: false, id };
  } catch (err) {
    logger.warn(`Could not enqueue ${detector} flag for ${entityId}: ` + err.message);
    return { queued: false, updated: false, error: true };
  }
}

/**
 * Review burst detection.
 *
 * Compares each shop's recent review count against the population of shops that
 * received any reviews in the window. A shop going from two reviews a month to
 * forty in a day is the signal; the population comparison is what distinguishes
 * that from a genuinely busy period where everybody's counts rose.
 */
async function detectReviewBursts({ cfg = {}, windowDays = 7, regionId = null } = {}) {
  const threshold = Number(cfg.ml_anomaly_z) || 3;
  const minSamples = Number(cfg.ml_anomaly_min_n) || 10;
  const flags = [];

  let rows = [];
  try {
    const res = await query(
      `SELECT r.shop_id, COUNT(*) AS recent_reviews, s.region_id, s.name
         FROM shop_reviews r
         JOIN local_shops s ON s.id = r.shop_id
        WHERE r.created_at >= $1
        GROUP BY r.shop_id, s.region_id, s.name`,
      [cutoffLiteral(windowDays)]
    );
    rows = res.rows || res || [];
  } catch (err) {
    logger.warn('Review burst detection query failed: ' + err.message);
    return { detector: 'review_burst', flags: [], error: true };
  }

  if (rows.length < 3) {
    // Fewer than three shops with reviews is no population to compare against.
    // Flagging anything here would be flagging the only data there is.
    return { detector: 'review_burst', flags: [], reason: 'insufficient_population', sample: rows.length };
  }

  const counts = rows.map((r) => Number(r.recent_reviews) || 0);

  for (const row of rows) {
    const value = Number(row.recent_reviews) || 0;
    const z = modifiedZ(value, counts);
    // One-sided: an unusually quiet shop is not a moderation concern.
    if (z < threshold) continue;

    const risk = riskScore(z, rows.length, minSamples);
    const evidence = {
      recent_reviews: value,
      population_median: median(counts),
      modified_z: Number(z.toFixed(2)),
      shops_compared: rows.length,
      window_days: windowDays,
    };
    flags.push({ shop_id: row.shop_id, name: row.name, risk, evidence });
    await enqueue({
      entityType: 'shop',
      entityId: row.shop_id,
      detector: 'review_burst',
      risk,
      evidence,
      regionId: row.region_id || regionId,
    });
  }

  return { detector: 'review_burst', flags, population: rows.length };
}

/**
 * Price anomaly detection, within category.
 *
 * Comparing across categories would flag every piece of jewellery and no
 * overpriced vegetable, which is exactly backwards. Two-sided here: a price far
 * below the category median is as suspicious as one far above — bait listings
 * are the more common abuse.
 */
async function detectPriceAnomalies({ cfg = {}, regionId = null } = {}) {
  const threshold = Number(cfg.ml_anomaly_z) || 3;
  const minSamples = Number(cfg.ml_anomaly_min_n) || 10;
  const flags = [];

  let rows = [];
  try {
    const res = await query(
      `SELECT p.id, p.name, p.price, p.shop_id, s.category, s.region_id
         FROM shop_products p
         JOIN local_shops s ON s.id = p.shop_id
        WHERE p.price IS NOT NULL AND p.price > 0
          AND COALESCE(p.is_active, 1) = 1`
    );
    rows = res.rows || res || [];
  } catch (err) {
    logger.warn('Price anomaly query failed: ' + err.message);
    return { detector: 'price_anomaly', flags: [], error: true };
  }

  const byCategory = new Map();
  for (const row of rows) {
    const key = row.category || 'uncategorised';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(row);
  }

  for (const [category, items] of byCategory) {
    if (items.length < minSamples) continue; // too few to know what normal is
    const prices = items.map((i) => Number(i.price) || 0);

    for (const item of items) {
      const z = modifiedZ(Number(item.price) || 0, prices);
      if (Math.abs(z) < threshold) continue;

      const risk = riskScore(z, items.length, minSamples);
      const evidence = {
        price: Number(item.price),
        category,
        category_median: median(prices),
        modified_z: Number(z.toFixed(2)),
        direction: z > 0 ? 'above' : 'below',
        items_compared: items.length,
      };
      flags.push({ product_id: item.id, name: item.name, risk, evidence });
      await enqueue({
        entityType: 'product',
        entityId: item.id,
        detector: 'price_anomaly',
        risk,
        evidence,
        regionId: item.region_id || regionId,
      });
    }
  }

  return { detector: 'price_anomaly', flags, categories: byCategory.size };
}

/**
 * Duplicate listing detection.
 *
 * Normalises each shop's name and groups by owner. Listing the same business
 * several times to occupy more of the feed is cheap and effective, and it is
 * invisible to any per-listing check because each copy looks fine on its own.
 */
function normaliseName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function detectDuplicateListings({ regionId = null } = {}) {
  const flags = [];

  let rows = [];
  try {
    const res = await query(
      `SELECT id, name, owner_id, region_id FROM local_shops
        WHERE owner_id IS NOT NULL AND COALESCE(is_active, 1) = 1`
    );
    rows = res.rows || res || [];
  } catch (err) {
    logger.warn('Duplicate listing query failed: ' + err.message);
    return { detector: 'duplicate_listing', flags: [], error: true };
  }

  const byOwner = new Map();
  for (const row of rows) {
    if (!byOwner.has(row.owner_id)) byOwner.set(row.owner_id, []);
    byOwner.get(row.owner_id).push(row);
  }

  for (const [ownerId, shops] of byOwner) {
    if (shops.length < 2) continue;

    const groups = new Map();
    for (const shop of shops) {
      const key = normaliseName(shop.name);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(shop);
    }

    for (const [key, duplicates] of groups) {
      if (duplicates.length < 2) continue;

      // Risk rises with the number of copies and saturates: two copies may be a
      // genuine second branch, six is not.
      const risk = Math.min(40 + (duplicates.length - 2) * 20, 100);
      const evidence = {
        owner_id: ownerId,
        normalised_name: key,
        duplicate_count: duplicates.length,
        shop_ids: duplicates.map((d) => d.id),
      };

      // Flagged against the copies, not the first listing, which is most likely
      // the legitimate original.
      for (const duplicate of duplicates.slice(1)) {
        flags.push({ shop_id: duplicate.id, name: duplicate.name, risk, evidence });
        await enqueue({
          entityType: 'shop',
          entityId: duplicate.id,
          detector: 'duplicate_listing',
          risk,
          evidence,
          regionId: duplicate.region_id || regionId,
        });
      }
    }
  }

  return { detector: 'duplicate_listing', flags, owners_checked: byOwner.size };
}

/**
 * Demand velocity aggregation.
 *
 * Rolls the interaction log into (region, category, hour) buckets that the
 * detectors and the admin console read instead of scanning raw events. Runs on
 * a schedule, never on a request.
 */
async function aggregateDemand({ windowHours = 24 } = {}) {
  const cutoff = cutoffLiteral(windowHours / 24);
  let rows = [];

  try {
    const res = await query(
      `SELECT e.region_id,
              s.category AS category,
              SUBSTR(e.created_at, 1, 13) AS bucket_hour,
              SUM(CASE WHEN e.event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions,
              SUM(CASE WHEN e.event_type = 'CARD_CLICK' THEN 1 ELSE 0 END) AS clicks,
              SUM(CASE WHEN e.event_type IN ('CALL_VENDOR','PURCHASE_INTENT') THEN 1 ELSE 0 END) AS conversions,
              COUNT(DISTINCT COALESCE(e.user_id, e.session_id)) AS actors
         FROM ml_interaction_events e
         LEFT JOIN local_shops s ON s.id = e.item_id
        WHERE e.created_at >= $1 AND e.item_type = 'shop'
        GROUP BY e.region_id, s.category, SUBSTR(e.created_at, 1, 13)`,
      [cutoff]
    );
    rows = res.rows || res || [];
  } catch (err) {
    logger.warn('Demand aggregation query failed: ' + err.message);
    return { buckets: 0, error: true };
  }

  let written = 0;
  for (const row of rows) {
    // 'YYYY-MM-DD HH' back to a full timestamp.
    const bucketStart = `${row.bucket_hour}:00:00`;
    try {
      const existing = await query(
        `SELECT id FROM ml_demand_buckets
          WHERE COALESCE(region_id, '') = COALESCE($1, '')
            AND COALESCE(category, '') = COALESCE($2, '')
            AND bucket_start = $3`,
        [row.region_id || null, row.category || null, bucketStart]
      );
      const found = (existing.rows || existing || [])[0];

      if (found) {
        await query(
          `UPDATE ml_demand_buckets
              SET impressions = $1, clicks = $2, conversions = $3,
                  distinct_actors = $4, computed_at = CURRENT_TIMESTAMP
            WHERE id = $5`,
          [row.impressions, row.clicks, row.conversions, row.actors, found.id]
        );
      } else {
        await query(
          `INSERT INTO ml_demand_buckets
             (id, region_id, category, bucket_start, impressions, clicks, conversions, distinct_actors)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [crypto.randomUUID(), row.region_id || null, row.category || null, bucketStart,
            row.impressions, row.clicks, row.conversions, row.actors]
        );
      }
      written += 1;
    } catch (err) {
      logger.warn('Demand bucket write failed: ' + err.message);
    }
  }

  return { buckets: written };
}

/** Runs every detector. Scheduled, not called from a request. */
async function runAll({ cfg = {}, regionId = null } = {}) {
  if (cfg.ml_anomaly_enabled === false) {
    return { skipped: 'disabled' };
  }

  const started = Date.now();
  const results = {};

  // Each detector is isolated: one failing query must not stop the others.
  for (const [name, fn] of [
    ['review_burst', () => detectReviewBursts({ cfg, regionId })],
    ['price_anomaly', () => detectPriceAnomalies({ cfg, regionId })],
    ['duplicate_listing', () => detectDuplicateListings({ regionId })],
  ]) {
    try {
      results[name] = await fn();
    } catch (err) {
      logger.error(`Anomaly detector ${name} failed: ` + err.message);
      results[name] = { detector: name, flags: [], error: err.message };
    }
  }

  try {
    results.demand = await aggregateDemand({});
  } catch (err) {
    results.demand = { buckets: 0, error: err.message };
  }

  const flagged = Object.values(results).reduce(
    (sum, r) => sum + (Array.isArray(r.flags) ? r.flags.length : 0), 0
  );

  return { ...results, total_flags: flagged, duration_ms: Date.now() - started };
}

/** The moderation queue, highest risk first. */
async function getQueue({ status = 'pending', limit = 50, regionId = null } = {}) {
  const params = [status];
  let where = 'WHERE q.status = $1';
  if (regionId) {
    params.push(regionId);
    where += ` AND q.region_id = $${params.length}`;
  }
  params.push(Math.min(Math.max(Number(limit) || 50, 1), 200));

  const res = await query(
    `SELECT q.* FROM ml_moderation_queue q
      ${where}
      ORDER BY q.risk_score DESC, q.created_at ASC
      LIMIT $${params.length}`,
    params
  );
  return (res.rows || res || []).map((row) => ({
    ...row,
    evidence: (() => { try { return JSON.parse(row.evidence); } catch { return row.evidence; } })(),
  }));
}

/** Records a moderator's decision. */
async function resolve(id, { status, note, reviewedBy }) {
  if (!['actioned', 'dismissed', 'reviewing'].includes(status)) {
    const err = new Error(`Invalid moderation status: ${status}`);
    err.status = 400;
    throw err;
  }
  await query(
    `UPDATE ml_moderation_queue
        SET status = $1, resolution_note = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4`,
    [status, note || null, reviewedBy || null, id]
  );
  return { id, status };
}

module.exports = {
  runAll,
  detectReviewBursts,
  detectPriceAnomalies,
  detectDuplicateListings,
  aggregateDemand,
  getQueue,
  resolve,
  modifiedZ,
  median,
  mad,
  riskScore,
  normaliseName,
};

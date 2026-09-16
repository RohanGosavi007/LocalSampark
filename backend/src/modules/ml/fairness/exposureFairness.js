/**
 * Exposure fairness for merchants.
 *
 * A relevance-only ranker is a rich-get-richer machine. The top three shops in
 * a pincode take nearly all the impressions, accumulate nearly all the
 * interactions, and those interactions feed back into the collaborative and
 * popularity terms that put them on top. Everyone else gets nothing, learns
 * nothing about why, and eventually stops paying for a listing. The catalogue
 * hollows out from the bottom while every engagement metric on the dashboard
 * improves — because the metrics are computed over the merchants that are still
 * being shown.
 *
 * The exploration slots in ranker.service.js are a partial answer: they hand a
 * fixed share of positions to under-shown items. What they cannot do is
 * remember. A merchant starved on Monday has no better claim on Tuesday than
 * one shown a thousand times, because each feed is decided in isolation.
 *
 * This module adds the memory. A daily ledger records what each merchant was
 * actually served against what an equal split would have given them, and the
 * re-ranker pays down the resulting deficit across sessions rather than within
 * any one of them — which is also what keeps the correction invisible to users,
 * since no single feed is distorted much.
 *
 * ── The cost is measured, not assumed ──────────────────────────────────────
 *
 * Fairness is not free: promoting an under-served merchant means demoting a
 * more relevant one. That trade is a business decision, and a business decision
 * needs a number. So the strength parameter is not applied directly. It is the
 * *ceiling* on a binary search for the strongest correction that still keeps
 * NDCG within the configured loss budget, and the realised NDCG loss is
 * returned with every call.
 *
 * This means the constraint cannot be violated by a slider. An operator who
 * drags fairness to maximum gets the most fairness available for the relevance
 * they agreed to spend, not a broken feed.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * Discounted cumulative gain with a logarithmic position discount.
 *
 * The discount is the point: an item at position 1 is worth far more than the
 * same item at position 10, which is exactly why moving one costs something and
 * why a plain count of inversions would not capture the cost.
 */
function dcg(relevances) {
  let total = 0;
  for (let i = 0; i < relevances.length; i += 1) {
    total += relevances[i] / Math.log2(i + 2);
  }
  return total;
}

/**
 * NDCG of an ordering against the best possible ordering of the same items.
 *
 * Relevances are the ranker's own scores, shifted so the minimum is zero.
 * Scores can legitimately be negative once an override multiplier is applied,
 * and a negative gain would make a worse ordering score higher — DCG assumes
 * non-negative relevance.
 */
function ndcg(ordered, relevanceOf) {
  if (ordered.length === 0) return 1;

  const raw = ordered.map(relevanceOf);
  const min = Math.min(...raw, 0);
  const shifted = raw.map((value) => value - min);

  const ideal = [...shifted].sort((a, b) => b - a);
  const idealDcg = dcg(ideal);
  if (idealDcg === 0) return 1; // Every item equally relevant: no ordering is worse.
  return dcg(shifted) / idealDcg;
}

/**
 * Gini coefficient of an exposure distribution.
 *
 * 0 is a perfectly equal split, 1 is one merchant taking everything. Reported
 * per pincode because that is the market a merchant actually competes in —
 * a national Gini would look healthy while every individual neighbourhood was
 * a monopoly.
 */
function gini(values) {
  const sorted = values.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;

  const total = sorted.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;

  let weighted = 0;
  for (let i = 0; i < n; i += 1) weighted += (i + 1) * sorted[i];

  return (2 * weighted) / (n * total) - (n + 1) / n;
}

/** Min-max normalisation into [0, 1]; a flat input becomes all zeros. */
function normalise(values) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return values.map(() => 0);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min;
  if (range === 0) return values.map(() => 0);
  return values.map((v) => (Number.isFinite(v) ? (v - min) / range : 0));
}

/**
 * Orders items by a blend of relevance and owed exposure.
 *
 * A single sort rather than a slot-by-slot greedy selection. Greedy selection
 * is what the FA*IR family does when the constraint is a hard quota per prefix;
 * here the constraint is a global relevance budget, and a blended sort is both
 * cheaper and easier to reason about — the binary search below is what turns it
 * into a guarantee.
 */
function blendedOrder(items, deficits, strength, relevanceOf) {
  if (strength <= 0) {
    return [...items].sort((a, b) => relevanceOf(b) - relevanceOf(a));
  }

  const relevance = normalise(items.map(relevanceOf));
  const owed = normalise(items.map((item) => Math.max(deficits.get(String(item.id)) || 0, 0)));

  const scored = items.map((item, i) => ({
    item,
    priority: (1 - strength) * relevance[i] + strength * owed[i],
    relevance: relevance[i],
  }));

  scored.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Ties broken by relevance, so fairness never reorders items it has no
    // opinion about — which would be churn with no benefit to anyone.
    return b.relevance - a.relevance;
  });

  return scored.map((entry) => entry.item);
}

/**
 * Re-ranks under an explicit relevance budget.
 *
 * Binary search over strength in [0, requested]. The NDCG of a blended order is
 * monotonically non-increasing in strength in practice but not provably so —
 * ties and plateaus can produce small reversals — so the search tracks the best
 * feasible ordering it has actually seen rather than trusting monotonicity.
 * That makes the returned ordering always within budget, whatever the shape of
 * the curve.
 */
function rerank(items, {
  deficits = new Map(),
  strength = 0.3,
  maxNdcgLoss = 0.05,
  relevanceOf = (item) => Number(item._score) || 0,
  iterations = 12,
} = {}) {
  if (!Array.isArray(items) || items.length < 2) {
    return {
      items: Array.isArray(items) ? items : [],
      applied_strength: 0,
      ndcg: 1,
      ndcg_loss: 0,
      moved: 0,
    };
  }

  const baseline = [...items].sort((a, b) => relevanceOf(b) - relevanceOf(a));
  const minimumNdcg = 1 - Math.max(maxNdcgLoss, 0);

  let bestOrder = baseline;
  let bestStrength = 0;
  let bestNdcg = ndcg(baseline, relevanceOf);

  let low = 0;
  let high = Math.max(strength, 0);

  for (let i = 0; i < iterations && high - low > 1e-4; i += 1) {
    const mid = (low + high) / 2;
    const candidate = blendedOrder(items, deficits, mid, relevanceOf);
    const score = ndcg(candidate, relevanceOf);

    if (score >= minimumNdcg) {
      // Affordable: keep it and try harder.
      bestOrder = candidate;
      bestStrength = mid;
      bestNdcg = score;
      low = mid;
    } else {
      high = mid;
    }
  }

  // How far items actually moved, which is what a merchant experiences. NDCG
  // loss can be small while a specific merchant drops six places.
  const baselinePositions = new Map(baseline.map((item, i) => [String(item.id), i]));
  let moved = 0;
  let maxMove = 0;
  bestOrder.forEach((item, i) => {
    const before = baselinePositions.get(String(item.id));
    if (before === undefined || before === i) return;
    moved += 1;
    maxMove = Math.max(maxMove, Math.abs(before - i));
  });

  return {
    items: bestOrder,
    applied_strength: bestStrength,
    requested_strength: strength,
    ndcg: bestNdcg,
    ndcg_loss: 1 - bestNdcg,
    budget: maxNdcgLoss,
    moved,
    max_move: maxMove,
  };
}

/** 'YYYY-MM-DD' for the ledger's daily window. */
function windowDate(at = Date.now()) {
  return new Date(at).toISOString().slice(0, 10);
}

/**
 * Current deficits for a set of merchants in a territory.
 *
 * Deficit is what an equal split would have given the merchant minus what they
 * actually received, summed over the trailing window. Positive means owed.
 */
async function loadDeficits(itemIds, { regionId = null, windowDays = 7 } = {}) {
  const out = new Map();
  if (!Array.isArray(itemIds) || itemIds.length === 0) return out;

  const since = windowDate(Date.now() - windowDays * 86400000);
  const params = [since, ...itemIds.map(String)];
  const placeholders = itemIds.map((_, i) => `$${i + 2}`).join(', ');

  let clause = `window_date >= $1 AND item_id IN (${placeholders})`;
  if (regionId) {
    params.push(regionId);
    clause += ` AND region_id = $${params.length}`;
  }

  try {
    const res = await query(
      `SELECT item_id, SUM(deficit) AS deficit, SUM(impressions) AS impressions
         FROM ml_exposure_ledger
        WHERE ${clause}
        GROUP BY item_id`,
      params
    );
    for (const row of res.rows || res || []) {
      out.set(String(row.item_id), Number(row.deficit) || 0);
    }
  } catch (err) {
    // No ledger means no deficits, which means fairness is a no-op rather than
    // an error. The feed is served on relevance alone, which is the status quo.
    logger.warn('Fairness: ledger unavailable, deficits are zero: ' + err.message);
  }

  return out;
}

/**
 * Records what a served feed actually gave each merchant.
 *
 * Called after ranking, not before, and deliberately not awaited by the request
 * — a ledger write must not extend the latency of the feed it is recording.
 *
 * `fair_share` is the equal split over the merchants that were *eligible* for
 * this feed, not over the whole catalogue. A merchant outside the radius was
 * never in the running, and counting them as owed exposure they could not have
 * received would make every local merchant look over-served.
 */
async function recordExposure(servedIds, eligibleIds, { regionId = null, at = Date.now() } = {}) {
  if (!Array.isArray(servedIds) || servedIds.length === 0) return { written: 0 };

  const eligible = Array.isArray(eligibleIds) && eligibleIds.length > 0 ? eligibleIds : servedIds;
  const share = servedIds.length / eligible.length;
  const date = windowDate(at);

  const served = new Set(servedIds.map(String));
  let written = 0;

  for (const rawId of eligible) {
    const itemId = String(rawId);
    const impressions = served.has(itemId) ? 1 : 0;
    // Owed minus received for this feed. Negative for a merchant shown more
    // than their share, which is what lets a merchant work off a surplus rather
    // than the deficit only ever growing.
    const deficitDelta = share - impressions;

    try {
      const existing = await query(
        `SELECT id, impressions, fair_share, deficit FROM ml_exposure_ledger
          WHERE item_type = 'shop' AND item_id = $1 AND window_date = $2
            AND ${regionId ? 'region_id = $3' : 'region_id IS NULL'}`,
        regionId ? [itemId, date, regionId] : [itemId, date]
      );
      const row = (existing.rows || existing || [])[0];

      if (row) {
        await query(
          `UPDATE ml_exposure_ledger
              SET impressions = impressions + $1,
                  fair_share  = fair_share + $2,
                  deficit     = deficit + $3,
                  updated_at  = CURRENT_TIMESTAMP
            WHERE id = $4`,
          [impressions, share, deficitDelta, row.id]
        );
      } else {
        await query(
          `INSERT INTO ml_exposure_ledger
             (id, item_type, item_id, region_id, window_date, impressions, fair_share, deficit)
           VALUES ($1, 'shop', $2, $3, $4, $5, $6, $7)`,
          [crypto.randomUUID(), itemId, regionId, date, impressions, share, deficitDelta]
        );
      }
      written += 1;
    } catch (err) {
      logger.warn(`Fairness: ledger write failed for ${itemId}: ${err.message}`);
    }
  }

  return { written, window_date: date, fair_share: share };
}

/**
 * Exposure concentration per territory, for the admin console.
 *
 * The number an operator needs to answer "is the feed becoming a monopoly?",
 * reported alongside how many merchants are currently owed exposure.
 */
async function concentration({ regionId = null, windowDays = 7 } = {}) {
  const since = windowDate(Date.now() - windowDays * 86400000);
  const params = [since];
  let clause = 'window_date >= $1';
  if (regionId) {
    params.push(regionId);
    clause += ` AND region_id = $${params.length}`;
  }

  try {
    const res = await query(
      `SELECT item_id, SUM(impressions) AS impressions, SUM(deficit) AS deficit
         FROM ml_exposure_ledger
        WHERE ${clause}
        GROUP BY item_id`,
      params
    );
    const rows = res.rows || res || [];
    const impressions = rows.map((row) => Number(row.impressions) || 0);
    const owed = rows.filter((row) => Number(row.deficit) > 0).length;
    const total = impressions.reduce((sum, v) => sum + v, 0);

    // Share taken by the top decile: the figure that makes concentration
    // concrete in a way a Gini coefficient does not.
    const sorted = [...impressions].sort((a, b) => b - a);
    const topDecileCount = Math.max(1, Math.round(sorted.length * 0.1));
    const topDecile = sorted.slice(0, topDecileCount).reduce((sum, v) => sum + v, 0);

    return {
      window_days: windowDays,
      merchants: rows.length,
      total_impressions: total,
      gini: gini(impressions),
      top_decile_share: total > 0 ? topDecile / total : null,
      merchants_owed: owed,
    };
  } catch (err) {
    return { window_days: windowDays, merchants: 0, gini: null, error: err.message };
  }
}

module.exports = {
  rerank,
  blendedOrder,
  loadDeficits,
  recordExposure,
  concentration,
  ndcg,
  dcg,
  gini,
  normalise,
  windowDate,
};

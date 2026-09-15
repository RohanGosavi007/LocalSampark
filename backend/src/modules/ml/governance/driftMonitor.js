/**
 * Data drift monitoring by Population Stability Index.
 *
 * PSI compares how a feature was distributed in a reference period against how
 * it is distributed now:
 *
 *   PSI = Σ (actual_i − expected_i) · ln(actual_i / expected_i)
 *
 * summed over bins, with both terms as proportions. It is symmetric and
 * unbounded above; the conventional reading is < 0.10 stable, 0.10–0.25 some
 * shift, > 0.25 significant shift.
 *
 * Why this matters more for a ranker than for a classifier: nothing here fails
 * when the inputs move. A model whose features have shifted keeps returning
 * ordered lists, keeps answering in 8ms, keeps looking healthy. The only
 * evidence is that the distribution it was tuned against no longer matches the
 * one it sees — which is exactly what this measures. Without it, the first
 * signal of a broken feed is a merchant complaining.
 *
 * Distributions are stored binned rather than raw, so comparing two windows is
 * reading two small rows instead of scanning the interaction log twice.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * Features worth watching, with the bin edges each is measured on.
 *
 * Fixed edges, not quantiles recomputed per window. Quantile bins move with the
 * data, which is precisely the thing being measured — they would report
 * stability no matter what happened.
 */
const FEATURES = Object.freeze({
  distance_km: { edges: [0, 0.5, 1, 2, 5, 10, 25, Infinity] },
  rating: { edges: [0, 2, 3, 3.5, 4, 4.5, 5] },
  position: { edges: [0, 1, 3, 5, 10, 20, Infinity] },
  local_hour: { edges: [0, 6, 11, 16, 21, 24] },
});

/** Bins values into the configured edges and returns proportions. */
function binned(values, edges) {
  const counts = new Array(edges.length - 1).fill(0);
  for (const raw of values) {
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    for (let i = 0; i < counts.length; i += 1) {
      if (v >= edges[i] && v < edges[i + 1]) {
        counts[i] += 1;
        break;
      }
    }
  }
  const n = counts.reduce((a, b) => a + b, 0);
  return { counts, n, proportions: n > 0 ? counts.map((c) => c / n) : counts.map(() => 0) };
}

/**
 * Population Stability Index between two proportion vectors.
 *
 * An empty bin makes the ratio 0 or infinite and the logarithm undefined, so
 * proportions are floored at a small epsilon. Without it a single empty bin
 * returns Infinity and the metric is unusable exactly when a distribution has
 * shifted enough to empty one — the case it exists to detect.
 */
function psi(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual)) return null;
  if (expected.length !== actual.length || expected.length === 0) return null;

  const EPSILON = 1e-6;
  let total = 0;
  for (let i = 0; i < expected.length; i += 1) {
    const e = Math.max(expected[i], EPSILON);
    const a = Math.max(actual[i], EPSILON);
    total += (a - e) * Math.log(a / e);
  }
  return Number(total.toFixed(6));
}

/** Cutoff literal both engines compare correctly. */
function cutoffLiteral(daysAgo) {
  return new Date(Date.now() - daysAgo * 86400000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

/**
 * Pulls raw feature values from the interaction log for a window.
 *
 * Only `position` and `local_hour` are recorded on the event itself; distance
 * and rating are joined from the shop, which is an approximation — the shop's
 * rating today is not necessarily what it was at impression time. Recorded here
 * rather than glossed over: it makes rating drift slightly lag reality, and it
 * is the reason those two features are the less trustworthy half of this
 * report.
 */
async function loadFeatureValues(feature, { fromDays, toDays }) {
  const from = cutoffLiteral(fromDays);
  const to = cutoffLiteral(toDays);

  const column = {
    position: 'e.position',
    local_hour: 'e.local_hour',
    rating: 's.rating',
    distance_km: null,
  }[feature];

  if (feature === 'distance_km') {
    // Not stored on the event. Returning nothing is honest; inventing a
    // distance from the shop's current coordinates and an unknown user
    // location would be measuring noise.
    return [];
  }

  const res = await query(
    `SELECT ${column} AS value
       FROM ml_interaction_events e
       LEFT JOIN local_shops s ON s.id = e.item_id
      WHERE e.created_at >= $1 AND e.created_at < $2
        AND ${column} IS NOT NULL`,
    [from, to]
  );
  return (res.rows || res || []).map((r) => Number(r.value));
}

/** Stores today's binned distribution for each feature. */
async function captureSnapshots() {
  const today = new Date().toISOString().slice(0, 10);
  const captured = [];

  for (const [feature, spec] of Object.entries(FEATURES)) {
    try {
      const values = await loadFeatureValues(feature, { fromDays: 1, toDays: 0 });
      if (values.length === 0) continue;

      const dist = binned(values, spec.edges);
      const payload = JSON.stringify({ edges: spec.edges, counts: dist.counts, n: dist.n });

      const existing = await query(
        'SELECT id FROM ml_feature_snapshots WHERE feature = $1 AND snapshot_date = $2',
        [feature, today]
      );
      const found = (existing.rows || existing || [])[0];

      if (found) {
        await query(
          'UPDATE ml_feature_snapshots SET distribution = $1, sample_size = $2 WHERE id = $3',
          [payload, dist.n, found.id]
        );
      } else {
        await query(
          `INSERT INTO ml_feature_snapshots (id, feature, snapshot_date, distribution, sample_size)
           VALUES ($1, $2, $3, $4, $5)`,
          [crypto.randomUUID(), feature, today, payload, dist.n]
        );
      }
      captured.push({ feature, samples: dist.n });
    } catch (err) {
      logger.warn(`Drift snapshot for ${feature} failed: ` + err.message);
    }
  }

  return { date: today, captured };
}

/**
 * PSI for each feature: the last 7 days against the 7 before that.
 *
 * Rolling windows rather than a frozen reference, because a hyperlocal
 * marketplace has no stationary "correct" distribution — new territories launch
 * and seasons change. What matters is week-over-week movement, not distance
 * from an arbitrary baseline that becomes less relevant every month.
 */
async function report({ cfg = {}, windowDays = 7 } = {}) {
  const warn = Number(cfg.ml_drift_psi_warn) || 0.10;
  const alert = Number(cfg.ml_drift_psi_alert) || 0.25;
  const features = [];

  for (const [feature, spec] of Object.entries(FEATURES)) {
    try {
      const [recent, reference] = await Promise.all([
        loadFeatureValues(feature, { fromDays: windowDays, toDays: 0 }),
        loadFeatureValues(feature, { fromDays: windowDays * 2, toDays: windowDays }),
      ]);

      // A PSI computed from a handful of events is noise. Reporting it as a
      // number invites acting on it, so it is reported as insufficient instead.
      const MIN_SAMPLES = 50;
      if (recent.length < MIN_SAMPLES || reference.length < MIN_SAMPLES) {
        features.push({
          feature,
          psi: null,
          status: 'insufficient_data',
          recent_samples: recent.length,
          reference_samples: reference.length,
          min_samples: MIN_SAMPLES,
        });
        continue;
      }

      const recentDist = binned(recent, spec.edges);
      const referenceDist = binned(reference, spec.edges);
      const value = psi(referenceDist.proportions, recentDist.proportions);

      features.push({
        feature,
        psi: value,
        status: value == null ? 'unknown' : value >= alert ? 'drifted' : value >= warn ? 'shifting' : 'stable',
        recent_samples: recent.length,
        reference_samples: reference.length,
        // The distributions themselves, so an operator can see which bin moved
        // rather than only that something did.
        bins: spec.edges,
        reference_proportions: referenceDist.proportions.map((p) => Number(p.toFixed(4))),
        recent_proportions: recentDist.proportions.map((p) => Number(p.toFixed(4))),
      });
    } catch (err) {
      logger.warn(`Drift report for ${feature} failed: ` + err.message);
      features.push({ feature, psi: null, status: 'error' });
    }
  }

  const drifted = features.filter((f) => f.status === 'drifted');

  return {
    window_days: windowDays,
    thresholds: { warn, alert },
    features,
    alert: drifted.length > 0,
    drifted_features: drifted.map((f) => f.feature),
  };
}

module.exports = { report, captureSnapshots, psi, binned, FEATURES, loadFeatureValues };

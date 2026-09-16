/**
 * Feature definitions.
 *
 * Every ranking feature is declared once, here, with two computations that must
 * agree: `online`, which returns the value as of now for serving, and `asOf`,
 * which returns the value as it stood at a past instant for training.
 *
 * Declaring both together, in one place, is the entire point. The classic
 * failure is that the serving feature and the training feature are written
 * months apart by different code paths, drift, and the model is then trained on
 * a quantity it never sees in production. The model's offline metrics stay
 * excellent and its live behaviour is inexplicable. Keeping the two functions
 * adjacent does not prevent that by itself, but it makes the divergence
 * visible to anyone reading the file, and the contract test asserts they agree
 * when `asOf` is called with the present moment.
 *
 * ── Point-in-time correctness ──────────────────────────────────────────────
 *
 * `asOf(ids, t)` must return what the feature would have said at time t, using
 * only rows that existed at t. Every query below therefore carries
 * `created_at < $t`, and the training set is built by joining each label event
 * to features computed as of *that event's own timestamp*.
 *
 * Getting this wrong does not throw. It produces a model that has seen the
 * future — trained to predict a click using a click-through rate that already
 * includes the click — which scores brilliantly offline and does nothing at
 * all live. This is the single most expensive silent bug available in a
 * recommender, and the reason this module exists rather than the features
 * being computed inline where they are used.
 */

const { query } = require('../../../config/database');

/**
 * A timestamp in the format both engines compare correctly.
 *
 * SQLite stores CURRENT_TIMESTAMP as 'YYYY-MM-DD HH:MM:SS' text with no
 * timezone, and comparison is lexicographic. An ISO string sorts wrong against
 * it because 'T' is greater than ' ', so every `created_at < $t` silently
 * matches nothing and every feature reads as its default. telemetry.service.js
 * carries the same note for the same reason.
 */
function sqlTimestamp(date) {
  return new Date(date).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

/** Placeholder list `$2, $3, ...` for an IN clause starting after `offset`. */
function placeholders(count, offset) {
  return Array.from({ length: count }, (_, i) => `$${i + offset + 1}`).join(', ');
}

function rowsOf(result) {
  return result.rows || result || [];
}

/**
 * Aggregates over the event log for a set of shops, bounded above by a time.
 *
 * One query serving several features, because they share a scan. The upper
 * bound is always exclusive: an event at exactly t is not observable at t.
 */
async function shopEventAggregates(shopIds, { since, until }) {
  if (shopIds.length === 0) return new Map();

  const params = [sqlTimestamp(since), sqlTimestamp(until), ...shopIds.map(String)];
  const res = await query(
    `SELECT item_id,
            SUM(CASE WHEN event_type = 'IMPRESSION' THEN 1 ELSE 0 END)       AS impressions,
            SUM(CASE WHEN event_type = 'CARD_CLICK' THEN 1 ELSE 0 END)       AS clicks,
            SUM(CASE WHEN event_type IN ('CALL_VENDOR', 'PURCHASE_INTENT')
                     THEN 1 ELSE 0 END)                                       AS bookings,
            COUNT(DISTINCT user_id)                                           AS distinct_users
       FROM ml_interaction_events
      WHERE item_type = 'shop'
        AND created_at >= $1
        AND created_at <  $2
        AND item_id IN (${placeholders(shopIds.length, 2)})
      GROUP BY item_id`,
    params
  );

  const out = new Map();
  for (const row of rowsOf(res)) {
    out.set(String(row.item_id), {
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      bookings: Number(row.bookings) || 0,
      distinct_users: Number(row.distinct_users) || 0,
    });
  }
  return out;
}

async function userEventAggregates(userIds, { until }) {
  if (userIds.length === 0) return new Map();

  const params = [sqlTimestamp(until), ...userIds.map(String)];
  const res = await query(
    `SELECT e.user_id AS user_id,
            COUNT(*)                        AS events,
            SUM(e.weight)                   AS total_weight,
            COUNT(DISTINCT e.item_id)       AS distinct_items
       FROM ml_interaction_events e
      WHERE e.created_at < $1
        AND e.weight > 0
        AND e.user_id IN (${placeholders(userIds.length, 1)})
      GROUP BY e.user_id`,
    params
  );

  const out = new Map();
  for (const row of rowsOf(res)) {
    out.set(String(row.user_id), {
      events: Number(row.events) || 0,
      total_weight: Number(row.total_weight) || 0,
      distinct_items: Number(row.distinct_items) || 0,
    });
  }
  return out;
}

const DAY_MS = 86400000;

/**
 * Smoothed click-through rate.
 *
 * A shop with one impression and one click does not have a CTR of 1. The
 * Beta(alpha, beta) prior pulls a thin history toward the platform average and
 * lets it earn its way out with volume — the same argument the Wilson bound in
 * the ranker makes, in the form the feature store needs.
 */
const PRIOR_CLICKS = 2;
const PRIOR_IMPRESSIONS = 25;

function smoothedRate(numerator, denominator, priorNum, priorDen) {
  return (numerator + priorNum) / (denominator + priorDen);
}

/**
 * The registry.
 *
 * `freshnessSlaMs` is what the console alerts on: a feature whose newest value
 * is older than its SLA is a feature the ranker is using without knowing it is
 * stale, which is worse than not having it.
 */
const FEATURES = Object.freeze({
  shop_ctr_7d: {
    entityType: 'shop',
    type: 'number',
    default: smoothedRate(0, 0, PRIOR_CLICKS, PRIOR_IMPRESSIONS),
    freshnessSlaMs: 6 * 3600 * 1000,
    description: 'Smoothed click-through rate over the trailing seven days.',
    async asOf(ids, at) {
      const aggregates = await shopEventAggregates(ids, { since: at - 7 * DAY_MS, until: at });
      const out = new Map();
      for (const id of ids) {
        const row = aggregates.get(String(id));
        out.set(String(id), smoothedRate(
          row ? row.clicks : 0,
          row ? row.impressions : 0,
          PRIOR_CLICKS,
          PRIOR_IMPRESSIONS
        ));
      }
      return out;
    },
  },

  shop_bookings_7d: {
    entityType: 'shop',
    type: 'number',
    default: 0,
    freshnessSlaMs: 6 * 3600 * 1000,
    description: 'Calls and purchase intents over the trailing seven days.',
    async asOf(ids, at) {
      const aggregates = await shopEventAggregates(ids, { since: at - 7 * DAY_MS, until: at });
      const out = new Map();
      for (const id of ids) out.set(String(id), aggregates.get(String(id))?.bookings || 0);
      return out;
    },
  },

  shop_impressions_7d: {
    entityType: 'shop',
    type: 'number',
    default: 0,
    freshnessSlaMs: 6 * 3600 * 1000,
    description: 'Times the shop was shown over the trailing seven days.',
    async asOf(ids, at) {
      const aggregates = await shopEventAggregates(ids, { since: at - 7 * DAY_MS, until: at });
      const out = new Map();
      for (const id of ids) out.set(String(id), aggregates.get(String(id))?.impressions || 0);
      return out;
    },
  },

  shop_distinct_users_7d: {
    entityType: 'shop',
    type: 'number',
    default: 0,
    freshnessSlaMs: 6 * 3600 * 1000,
    description: 'Distinct users who engaged over the trailing seven days.',
    async asOf(ids, at) {
      const aggregates = await shopEventAggregates(ids, { since: at - 7 * DAY_MS, until: at });
      const out = new Map();
      for (const id of ids) out.set(String(id), aggregates.get(String(id))?.distinct_users || 0);
      return out;
    },
  },

  shop_age_days: {
    entityType: 'shop',
    type: 'number',
    default: 0,
    freshnessSlaMs: 24 * 3600 * 1000,
    description: 'Days since the shop was listed, as of the reference time.',
    async asOf(ids, at) {
      const out = new Map();
      if (ids.length === 0) return out;
      const res = await query(
        `SELECT id, created_at FROM local_shops WHERE id IN (${placeholders(ids.length, 0)})`,
        ids.map(String)
      );
      for (const row of rowsOf(res)) {
        const created = new Date(String(row.created_at).replace(' ', 'T')).getTime();
        // Negative when the shop did not exist yet at the reference time. The
        // caller sees 0 rather than a negative age, but the distinction matters
        // for training: a row about a shop that did not exist is not a row.
        const age = Number.isFinite(created) ? Math.max((at - created) / DAY_MS, 0) : 0;
        out.set(String(row.id), age);
      }
      for (const id of ids) if (!out.has(String(id))) out.set(String(id), 0);
      return out;
    },
  },

  user_event_count: {
    entityType: 'user',
    type: 'number',
    default: 0,
    freshnessSlaMs: 3600 * 1000,
    description: 'Weighted interactions the user had produced by the reference time.',
    async asOf(ids, at) {
      const aggregates = await userEventAggregates(ids, { until: at });
      const out = new Map();
      for (const id of ids) out.set(String(id), aggregates.get(String(id))?.events || 0);
      return out;
    },
  },

  user_distinct_items: {
    entityType: 'user',
    type: 'number',
    default: 0,
    freshnessSlaMs: 3600 * 1000,
    description: 'Distinct items the user had engaged with by the reference time.',
    async asOf(ids, at) {
      const aggregates = await userEventAggregates(ids, { until: at });
      const out = new Map();
      for (const id of ids) out.set(String(id), aggregates.get(String(id))?.distinct_items || 0);
      return out;
    },
  },
});

/**
 * Every feature's online value is its as-of value at the present instant.
 *
 * Deriving one from the other rather than writing two implementations is what
 * makes training/serving skew structurally impossible for these features. It
 * costs the online path nothing — the query is identical, only the bound
 * differs — and it removes the class of bug the module exists to prevent.
 *
 * A feature whose online computation genuinely cannot be expressed as an as-of
 * query (a live counter held elsewhere, say) would have to override this, and
 * would then owe a test proving the two agree.
 */
function onlineFor(name) {
  const definition = FEATURES[name];
  if (!definition) throw new Error(`Unknown feature: ${name}`);
  return (ids) => definition.asOf(ids, Date.now());
}

function names() {
  return Object.keys(FEATURES);
}

function get(name) {
  return FEATURES[name] || null;
}

function forEntity(entityType) {
  return names().filter((name) => FEATURES[name].entityType === entityType);
}

module.exports = {
  FEATURES,
  names,
  get,
  forEntity,
  onlineFor,
  sqlTimestamp,
  smoothedRate,
  PRIOR_CLICKS,
  PRIOR_IMPRESSIONS,
};

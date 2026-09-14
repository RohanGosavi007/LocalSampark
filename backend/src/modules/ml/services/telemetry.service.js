/**
 * Interaction event ingest.
 *
 * This is the first thing the ranking engine needed, because nothing in the
 * platform recorded what a user looked at. Until these rows accumulate there is
 * no collaborative signal to rank with, so the value of this module is measured
 * in elapsed time collecting rather than in anything it returns.
 *
 * Two rules shape the whole file:
 *
 *  1. Telemetry never breaks a request. A malformed batch, a database outage, a
 *     client sending a field we removed last month — none of it may surface an
 *     error to a user or block a render. The route answers 202 and reports how
 *     many rows it accepted; callers are not expected to retry.
 *
 *  2. Impressions carry weight zero. They are the denominator of every rate
 *     metric, not evidence of interest. Counting them as weak positives is the
 *     standard way a recommender learns to promote whatever it already showed,
 *     which reads as rising engagement while the catalogue quietly narrows.
 */

const crypto = require('crypto');
const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * Interaction weights, ordered by commercial intent rather than frequency.
 *
 * CALL_VENDOR outranks everything except an actual checkout because in a
 * hyperlocal directory a tapped phone number is the moment the platform has
 * done its job — the transaction itself happens offline where we cannot see it.
 */
const EVENT_WEIGHTS = Object.freeze({
  PURCHASE_INTENT: 8.0,
  CALL_VENDOR: 5.0,
  BOOKMARK: 3.0,
  SHARE: 2.5,
  DETAIL_VIEW: 1.5,
  CARD_CLICK: 1.0,
  IMPRESSION: 0.0,
});

const VALID_EVENTS = Object.freeze(Object.keys(EVENT_WEIGHTS));
const VALID_ITEM_TYPES = Object.freeze(['shop', 'product', 'service', 'job', 'listing', 'event']);
const VALID_PLATFORMS = Object.freeze(['web', 'ios', 'android', 'unknown']);

/** Caps one request. A client sending more than this is malfunctioning. */
const MAX_BATCH = 200;

/**
 * Validates and normalises one client-supplied event.
 *
 * Returns null for anything unusable rather than throwing: one bad event in a
 * batch of twenty-five must not discard the other twenty-four, and a client
 * version we no longer recognise should degrade to partial telemetry rather
 * than to none.
 */
function normalizeEvent(raw, context = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const eventType = String(raw.event_type || raw.eventType || '').toUpperCase();
  if (!VALID_EVENTS.includes(eventType)) return null;

  const itemType = String(raw.item_type || raw.itemType || '').toLowerCase();
  if (!VALID_ITEM_TYPES.includes(itemType)) return null;

  const itemId = raw.item_id != null ? String(raw.item_id) : (raw.itemId != null ? String(raw.itemId) : '');
  if (!itemId || itemId.length > 128) return null;

  // Position arrives as the zero-based slot the item occupied. Negative or
  // absurd values mean a client bug; drop the field, keep the event.
  let position = Number(raw.position);
  if (!Number.isInteger(position) || position < 0 || position > 10000) position = null;

  let localHour = Number(raw.local_hour != null ? raw.local_hour : raw.localHour);
  if (!Number.isInteger(localHour) || localHour < 0 || localHour > 23) localHour = null;

  const platform = VALID_PLATFORMS.includes(String(raw.platform || '').toLowerCase())
    ? String(raw.platform).toLowerCase()
    : 'unknown';

  const surface = raw.surface ? String(raw.surface).slice(0, 48) : null;
  const pincode = raw.pincode ? String(raw.pincode).slice(0, 10) : (context.pincode || null);

  return {
    user_id: context.userId || null,
    session_id: (raw.session_id || raw.sessionId || context.sessionId || null),
    item_type: itemType,
    item_id: itemId,
    event_type: eventType,
    // Weight is resolved server-side and stored on the row. The client is not
    // trusted to supply it, and storing it means the nightly matrix rebuild is
    // a pure aggregation that does not need to know the weighting rules — and
    // that changing a weight later does not silently rewrite the meaning of
    // history already recorded.
    weight: EVENT_WEIGHTS[eventType],
    surface,
    position,
    is_exploration: raw.is_exploration === true || raw.isExploration === true,
    region_id: raw.region_id || raw.regionId || context.regionId || null,
    pincode,
    local_hour: localHour,
    platform,
  };
}

/**
 * Persists a batch.
 *
 * Rows are written with a single multi-row INSERT rather than one statement per
 * event. At a batch size of 25 that is the difference between one round trip
 * and twenty-five, which is what keeps ingest inside its latency budget without
 * needing a queue in front of it.
 */
async function recordBatch(events, context = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    return { accepted: 0, rejected: 0 };
  }

  const capped = events.slice(0, MAX_BATCH);
  const rows = [];
  let rejected = events.length - capped.length;

  for (const raw of capped) {
    const normalized = normalizeEvent(raw, context);
    if (normalized) rows.push(normalized);
    else rejected += 1;
  }

  if (rows.length === 0) return { accepted: 0, rejected };

  const COLUMNS = [
    'user_id', 'session_id', 'item_type', 'item_id', 'event_type', 'weight',
    'surface', 'position', 'is_exploration', 'region_id', 'pincode',
    'local_hour', 'platform',
  ];

  const params = [];
  const tuples = rows.map((row) => {
    const slots = COLUMNS.map((col) => {
      params.push(col === 'is_exploration' ? (row[col] ? 1 : 0) : row[col]);
      return `$${params.length}`;
    });
    return `(${slots.join(', ')})`;
  });

  try {
    await query(
      `INSERT INTO ml_interaction_events (${COLUMNS.join(', ')}) VALUES ${tuples.join(', ')}`,
      params
    );
    return { accepted: rows.length, rejected };
  } catch (err) {
    // Swallowed deliberately. A telemetry write failing is a problem for the
    // recommender's training data, not for the user who was browsing shops.
    logger.error('ML telemetry write failed, dropping batch: ' + err.message);
    return { accepted: 0, rejected: events.length, error: true };
  }
}

/**
 * A stable anonymous session id.
 *
 * Derived from a per-boot server secret plus the client's rotating session
 * token, so the stored value cannot be reversed into an IP or device id. It
 * groups one browsing session for co-occurrence and is deliberately never
 * joined back to a user account after the fact — that linkage is what would
 * turn anonymous browsing history into personal data retroactively.
 */
const SESSION_SALT = crypto.randomBytes(16).toString('hex');

function deriveSessionId(clientToken) {
  if (!clientToken) return null;
  return crypto
    .createHash('sha256')
    .update(SESSION_SALT + String(clientToken))
    .digest('hex')
    .slice(0, 32);
}

/**
 * Aggregate metrics for the admin console.
 *
 * CTR is clicks over impressions within the window. Coverage is the share of
 * the eligible catalogue that was shown at all — the metric that catches a
 * ranker collapsing onto a popular core while its CTR looks healthy.
 */
async function getMetrics({ surface = null, sinceHours = 24, regionId = null } = {}) {
  const params = [];
  const conditions = [];

  // CURRENT_TIMESTAMP arithmetic differs between the two engines, so the cutoff
  // is computed in JS and bound as a parameter instead.
  //
  // It must be formatted as 'YYYY-MM-DD HH:MM:SS', not as an ISO string.
  // SQLite has no date type: created_at holds the literal text CURRENT_TIMESTAMP
  // produced, which is space-separated with no timezone, and `>=` on it is a
  // plain string comparison. Against an ISO cutoff every comparison is false,
  // because ' ' sorts before 'T' — so every metric silently reported zero while
  // the rows were sitting in the table. Postgres parses this form correctly too.
  const cutoff = new Date(Date.now() - Number(sinceHours) * 3600 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
  params.push(cutoff);
  conditions.push(`created_at >= $${params.length}`);

  if (surface) {
    params.push(surface);
    conditions.push(`surface = $${params.length}`);
  }
  if (regionId) {
    params.push(regionId);
    conditions.push(`region_id = $${params.length}`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const totals = await query(
    `SELECT
        COUNT(*) AS total_events,
        SUM(CASE WHEN event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions,
        SUM(CASE WHEN event_type = 'CARD_CLICK' THEN 1 ELSE 0 END) AS clicks,
        SUM(CASE WHEN event_type = 'DETAIL_VIEW' THEN 1 ELSE 0 END) AS detail_views,
        SUM(CASE WHEN event_type = 'CALL_VENDOR' THEN 1 ELSE 0 END) AS calls,
        SUM(CASE WHEN event_type = 'PURCHASE_INTENT' THEN 1 ELSE 0 END) AS purchase_intents,
        SUM(CASE WHEN is_exploration = 1 AND event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS explore_impressions,
        SUM(CASE WHEN is_exploration = 1 AND event_type = 'CARD_CLICK' THEN 1 ELSE 0 END) AS explore_clicks,
        COUNT(DISTINCT user_id) AS distinct_users,
        COUNT(DISTINCT item_id) AS distinct_items_shown
       FROM ml_interaction_events ${where}`,
    params
  );
  const t = (totals.rows || totals || [])[0] || {};

  const impressions = Number(t.impressions || 0);
  const clicks = Number(t.clicks || 0);
  const exploreImpressions = Number(t.explore_impressions || 0);
  const exploreClicks = Number(t.explore_clicks || 0);

  // Size of the eligible catalogue, for coverage. Shops only for now: it is the
  // only surface with a populated catalogue.
  let catalogueSize = 0;
  try {
    const c = await query('SELECT COUNT(*) AS c FROM local_shops WHERE COALESCE(is_active, 1) = 1');
    catalogueSize = Number((c.rows || c || [])[0]?.c || 0);
  } catch {
    catalogueSize = 0;
  }

  const distinctShown = Number(t.distinct_items_shown || 0);

  return {
    window_hours: Number(sinceHours),
    surface: surface || 'all',
    total_events: Number(t.total_events || 0),
    impressions,
    clicks,
    detail_views: Number(t.detail_views || 0),
    calls: Number(t.calls || 0),
    purchase_intents: Number(t.purchase_intents || 0),
    distinct_users: Number(t.distinct_users || 0),
    // null rather than 0 when there is no denominator: "no data yet" and "a CTR
    // of zero" mean very different things to an operator, and conflating them
    // is how a broken tracker goes unnoticed.
    ctr: impressions > 0 ? clicks / impressions : null,
    exploration_ctr: exploreImpressions > 0 ? exploreClicks / exploreImpressions : null,
    catalogue_size: catalogueSize,
    items_shown: distinctShown,
    coverage: catalogueSize > 0 ? Math.min(distinctShown / catalogueSize, 1) : null,
  };
}

/** Whether enough history exists for the collaborative term to be credible. */
async function getReadiness() {
  try {
    const res = await query(
      `SELECT COUNT(*) AS weighted_events, COUNT(DISTINCT user_id) AS users
         FROM ml_interaction_events WHERE weight > 0`
    );
    const row = (res.rows || res || [])[0] || {};
    const events = Number(row.weighted_events || 0);
    const users = Number(row.users || 0);
    return {
      weighted_events: events,
      active_users: users,
      // The thresholds the architecture gates phase 4 on. Reported rather than
      // enforced here so the console can show progress towards them.
      target_events: 50000,
      target_users: 500,
      cf_ready: events >= 50000 && users >= 500,
    };
  } catch (err) {
    logger.error('ML readiness query failed: ' + err.message);
    return { weighted_events: 0, active_users: 0, target_events: 50000, target_users: 500, cf_ready: false };
  }
}

module.exports = {
  recordBatch,
  normalizeEvent,
  deriveSessionId,
  getMetrics,
  getReadiness,
  EVENT_WEIGHTS,
  VALID_EVENTS,
  VALID_ITEM_TYPES,
  MAX_BATCH,
};

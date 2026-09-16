/**
 * "Why you are seeing this."
 *
 * A ranked feed is opaque. The user sees eleven shops in an order they did not
 * choose, and the only available reading is that someone paid for the top slot.
 * A badge that says *why* — eleven homes in this building have used them, they
 * answer in under fifteen minutes — converts the ranking from an assertion into
 * an argument, and an argument can be checked.
 *
 * Three rules shape the implementation:
 *
 *  1. **Every badge must be literally true and traceable to a row.** A badge is
 *     a claim the platform makes on a merchant's behalf. "18 bookings this
 *     week" that is really 6 is not a rounding choice, it is a false statement
 *     about a real business to their prospective customer. Each rule below
 *     names the query its number comes from.
 *
 *  2. **Deterministic, not generated.** The obvious design here is an LLM
 *     writing a line per card. That costs a network round trip inside the
 *     ranking budget, produces different text for the same evidence on two
 *     refreshes, and can hallucinate a superlative nobody can substantiate. The
 *     rules below are ordered by strength of evidence and the strongest
 *     applicable one wins. Same inputs, same badge, every time — which is also
 *     what makes the badges testable.
 *
 *  3. **The budget is real and the fallback is narrower, not absent.** Badge
 *     generation must not extend the ranking path. Aggregates are loaded once
 *     per feed under a timeout; if that overruns, the engine degrades to the
 *     rules that need only the candidate row already in memory — verified,
 *     fast-responding, new — rather than dropping badges entirely or, worse,
 *     blocking the feed.
 */

const { query } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * Rules in descending order of how much they justify a placement.
 *
 * Order is the whole design. A merchant can satisfy five of these at once, and
 * showing all five is noise; showing the *strongest* is an argument. Social
 * proof from the user's own building outranks proof from the wider area, which
 * outranks a property of the merchant in isolation.
 */
const BADGE_PRIORITY = Object.freeze([
  'society_proof',
  'area_trend',
  'top_rated_local',
  'repeat_custom',
  'fast_response',
  'open_late',
  'similar_to_history',
  'new_nearby',
  'verified',
]);

/** Evidence below which a count is not worth stating. */
const MIN_SOCIETY_HOUSEHOLDS = 2;
const MIN_AREA_BOOKINGS = 5;
const MIN_REVIEWS_FOR_TOP_RATED = 5;
const FAST_RESPONSE_MINUTES = 15;

/**
 * Hours at which "open late" is worth saying.
 *
 * Only meaningful for categories where late opening is unusual and useful. A
 * 24-hour pharmacy at 11pm is the single most valuable card the app can show;
 * a grocery listed as open at 11pm is usually stale opening-hours data.
 */
const LATE_HOURS = new Set([21, 22, 23, 0, 1, 2, 3, 4, 5]);
const LATE_VALUABLE_TERMS = ['pharmacy', 'medical', 'chemist', 'clinic', 'hospital', 'fuel', 'atm'];

/**
 * Formats a count into a phrase that stays true as the number grows.
 *
 * Deliberately never rounds up. "Over 20" for 21 is fine; "20+" for 19 is a
 * lie, and at these volumes a merchant can count their own bookings.
 */
function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Aggregates every badge rule needs, in one pass per feed.
 *
 * One query per signal over the whole candidate set rather than per candidate:
 * a feed of 20 cards would otherwise be 60 queries. The window is seven days
 * because that is what "this week" means to a reader, and because a shorter
 * window on this platform's current volume yields counts too small to state.
 */
async function loadEvidence(itemIds, { societyId = null, userId = null, windowDays = 7 } = {}) {
  const evidence = {
    areaBookings: new Map(),   // itemId -> weighted-action count
    societyHouseholds: new Map(), // itemId -> distinct society members
    userRepeat: new Map(),     // itemId -> this user's prior engagements
    loaded: { area: false, society: false, repeat: false },
  };

  if (!Array.isArray(itemIds) || itemIds.length === 0) return evidence;

  // Formatted the way telemetry.service formats its cutoff, and for the same
  // reason: SQLite stores created_at as the literal text CURRENT_TIMESTAMP
  // produced, so an ISO string with a 'T' compares wrong and silently matches
  // nothing.
  const cutoff = new Date(Date.now() - windowDays * 86400000)
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');

  const placeholders = itemIds.map((_, i) => `$${i + 2}`).join(', ');

  // Bookings in the area: the high-intent events only. A card click is not a
  // booking and must never be counted as one in text shown to a user.
  try {
    const res = await query(
      `SELECT item_id, COUNT(*) AS bookings
         FROM ml_interaction_events
        WHERE created_at >= $1
          AND item_type = 'shop'
          AND event_type IN ('CALL_VENDOR', 'PURCHASE_INTENT')
          AND item_id IN (${placeholders})
        GROUP BY item_id`,
      [cutoff, ...itemIds]
    );
    for (const row of res.rows || res || []) {
      evidence.areaBookings.set(String(row.item_id), Number(row.bookings) || 0);
    }
    evidence.loaded.area = true;
  } catch (err) {
    logger.warn('Narratives: area evidence unavailable: ' + err.message);
  }

  // Households in this user's own society. The strongest badge on the platform,
  // and the one that most needs to be exact: the reader can walk downstairs and
  // check.
  if (societyId) {
    try {
      const res = await query(
        `SELECT e.item_id AS item_id, COUNT(DISTINCT e.user_id) AS households
           FROM ml_interaction_events e
           JOIN society_members sm ON sm.user_id = e.user_id
          WHERE sm.society_id = $1
            AND e.item_type = 'shop'
            AND e.event_type IN ('CALL_VENDOR', 'PURCHASE_INTENT')
            AND e.item_id IN (${itemIds.map((_, i) => `$${i + 2}`).join(', ')})
          GROUP BY e.item_id`,
        [societyId, ...itemIds]
      );
      for (const row of res.rows || res || []) {
        evidence.societyHouseholds.set(String(row.item_id), Number(row.households) || 0);
      }
      evidence.loaded.society = true;
    } catch (err) {
      logger.warn('Narratives: society evidence unavailable: ' + err.message);
    }
  }

  if (userId) {
    try {
      const res = await query(
        `SELECT item_id, COUNT(*) AS engagements
           FROM ml_interaction_events
          WHERE user_id = $1
            AND item_type = 'shop'
            AND event_type IN ('CALL_VENDOR', 'PURCHASE_INTENT')
            AND item_id IN (${itemIds.map((_, i) => `$${i + 2}`).join(', ')})
          GROUP BY item_id`,
        [userId, ...itemIds]
      );
      for (const row of res.rows || res || []) {
        evidence.userRepeat.set(String(row.item_id), Number(row.engagements) || 0);
      }
      evidence.loaded.repeat = true;
    } catch (err) {
      logger.warn('Narratives: repeat evidence unavailable: ' + err.message);
    }
  }

  return evidence;
}

/**
 * Picks the single strongest badge for one candidate.
 *
 * Pure: takes the candidate row and the pre-loaded evidence, returns a badge or
 * null. Being pure is what lets the whole rule set be tested without a
 * database, which matters for rules that make factual claims.
 */
function badgeFor(candidate, evidence, context = {}) {
  const { localHour = null, topRatedId = null } = context;
  const id = String(candidate.id);

  const societyHouseholds = evidence.societyHouseholds.get(id) || 0;
  const areaBookings = evidence.areaBookings.get(id) || 0;
  const repeat = evidence.userRepeat.get(id) || 0;

  const candidates = [];

  if (societyHouseholds >= MIN_SOCIETY_HOUSEHOLDS) {
    candidates.push({
      type: 'society_proof',
      badge_text: `Used by ${plural(societyHouseholds, 'home', 'homes')} in your society`,
      // Confidence rises with the count and saturates: ten households is
      // conclusive, and twenty is not twice as conclusive.
      confidence_score: Math.min(0.5 + societyHouseholds / 20, 0.98),
    });
  }

  if (areaBookings >= MIN_AREA_BOOKINGS) {
    candidates.push({
      type: 'area_trend',
      badge_text: `Trending nearby this week`,
      confidence_score: Math.min(0.4 + areaBookings / 50, 0.9),
    });
  }

  if (topRatedId && id === String(topRatedId)) {
    const label = candidate.category_name || candidate.category;
    candidates.push({
      type: 'top_rated_local',
      badge_text: label ? `Top rated ${String(label).toLowerCase()} nearby` : 'Top rated nearby',
      confidence_score: 0.7,
    });
  }

  if (repeat > 0) {
    candidates.push({
      type: 'repeat_custom',
      badge_text: repeat === 1 ? 'You have used them before' : `You have used them ${repeat} times`,
      confidence_score: 0.95,
    });
  }

  const waitMinutes = Number(candidate.avg_wait_minutes);
  if (Number.isFinite(waitMinutes) && waitMinutes > 0 && waitMinutes <= FAST_RESPONSE_MINUTES) {
    candidates.push({
      type: 'fast_response',
      badge_text: `Usually responds in ${Math.round(waitMinutes)} min`,
      confidence_score: 0.6,
    });
  }

  if (localHour != null && LATE_HOURS.has(Number(localHour))) {
    const text = String(candidate.category_name || candidate.category || '').toLowerCase();
    if (LATE_VALUABLE_TERMS.some((term) => text.includes(term))) {
      candidates.push({
        type: 'open_late',
        badge_text: 'Open late',
        confidence_score: 0.55,
      });
    }
  }

  // The content-similarity term the ranker already computed. Reused rather than
  // recomputed so the badge cannot disagree with the score that placed the card.
  const sim = candidate._terms && Number(candidate._terms.sim);
  if (Number.isFinite(sim) && sim >= 0.35) {
    candidates.push({
      type: 'similar_to_history',
      badge_text: 'Similar to places you have used',
      confidence_score: Math.min(0.3 + sim, 0.85),
    });
  }

  if (candidate.created_at) {
    const created = new Date(String(candidate.created_at).replace(' ', 'T')).getTime();
    if (Number.isFinite(created) && Date.now() - created < 30 * 86400000) {
      candidates.push({
        type: 'new_nearby',
        badge_text: 'New in your area',
        confidence_score: 0.5,
      });
    }
  }

  if (candidate.is_verified === 1 || candidate.is_verified === true) {
    candidates.push({
      type: 'verified',
      badge_text: 'Verified merchant',
      confidence_score: 0.45,
    });
  }

  if (candidates.length === 0) return null;

  const byType = new Map(candidates.map((c) => [c.type, c]));
  for (const type of BADGE_PRIORITY) {
    if (byType.has(type)) return byType.get(type);
  }
  return candidates[0];
}

/**
 * The separate social-proof line.
 *
 * Kept apart from the badge because it answers a different question — the badge
 * says why this card is here, the proof line says how much use is behind it —
 * and because a card showing "Used by 6 homes in your society" alongside
 * "6 bookings this week" reads as two facts when it is one.
 */
function socialProofFor(candidate, evidence, badge) {
  const id = String(candidate.id);
  const areaBookings = evidence.areaBookings.get(id) || 0;

  if (badge && badge.type === 'area_trend' && areaBookings > 0) {
    return `${plural(areaBookings, 'booking', 'bookings')} this week`;
  }
  if (areaBookings >= MIN_AREA_BOOKINGS) {
    return `${plural(areaBookings, 'booking', 'bookings')} this week`;
  }

  const reviews = Number(candidate.review_count ?? candidate.total_ratings ?? 0);
  const rating = Number(candidate.rating);
  if (reviews >= MIN_REVIEWS_FOR_TOP_RATED && Number.isFinite(rating) && rating > 0) {
    return `${rating.toFixed(1)} from ${plural(reviews, 'review', 'reviews')}`;
  }

  return null;
}

/**
 * The merchant a "top rated nearby" badge may legitimately go to.
 *
 * Exactly one card per feed, chosen by the same Wilson lower bound the ranker
 * scores with rather than by mean rating, and only when enough reviews stand
 * behind it. Two cards both claiming to be top rated is the fastest way to make
 * every badge on the screen worthless.
 */
function pickTopRated(candidates, wilsonScore) {
  let best = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const reviews = Number(candidate.review_count ?? candidate.total_ratings ?? 0);
    if (reviews < MIN_REVIEWS_FOR_TOP_RATED) continue;
    const score = wilsonScore(candidate.rating, reviews);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best ? best.id : null;
}

/**
 * Attaches badges to a ranked feed.
 *
 * Returns a new array; the input is not mutated, because the caller may be
 * holding the ranked list for telemetry and a badge is presentation.
 *
 * The evidence load runs against a wall-clock budget. Exceeding it is not an
 * error — it produces a narrower set of badges from the candidate rows alone,
 * and reports `degraded` so the console can see how often that happens rather
 * than an operator wondering why the badges got duller.
 */
async function annotate(items, context = {}) {
  const {
    userId = null,
    societyId = null,
    localHour = null,
    budgetMs = 40,
    wilsonScore = null,
    enabled = true,
  } = context;

  if (!enabled || !Array.isArray(items) || items.length === 0) {
    return { items: Array.isArray(items) ? items : [], degraded: false, badged: 0 };
  }

  const started = Date.now();
  const itemIds = items.map((item) => String(item.id));

  const empty = {
    areaBookings: new Map(),
    societyHouseholds: new Map(),
    userRepeat: new Map(),
    loaded: { area: false, society: false, repeat: false },
  };

  let evidence = empty;
  let degraded = false;

  try {
    // Raced rather than awaited outright. An await with a check afterwards
    // measures the overrun but still pays for it; the feed has already been
    // waiting by the time anyone notices.
    evidence = await Promise.race([
      loadEvidence(itemIds, { societyId, userId }),
      new Promise((resolve) => setTimeout(() => resolve(null), Math.max(budgetMs, 1))),
    ]) || empty;
    if (evidence === empty) degraded = true;
  } catch (err) {
    logger.warn('Narratives: evidence load failed, using intrinsic badges only: ' + err.message);
    evidence = empty;
    degraded = true;
  }

  const topRatedId = typeof wilsonScore === 'function' ? pickTopRated(items, wilsonScore) : null;

  let badged = 0;
  const out = items.map((item) => {
    const badge = badgeFor(item, evidence, { localHour, topRatedId });
    const socialProof = socialProofFor(item, evidence, badge);
    if (!badge && !socialProof) return item;
    badged += 1;
    return {
      ...item,
      justification: {
        badge_text: badge ? badge.badge_text : null,
        badge_type: badge ? badge.type : null,
        social_proof: socialProof,
        confidence_score: badge ? Math.round(badge.confidence_score * 100) / 100 : null,
      },
    };
  });

  return {
    items: out,
    degraded,
    badged,
    duration_ms: Date.now() - started,
  };
}

module.exports = {
  annotate,
  badgeFor,
  socialProofFor,
  pickTopRated,
  loadEvidence,
  plural,
  BADGE_PRIORITY,
  MIN_SOCIETY_HOUSEHOLDS,
  MIN_AREA_BOOKINGS,
  MIN_REVIEWS_FOR_TOP_RATED,
  FAST_RESPONSE_MINUTES,
};

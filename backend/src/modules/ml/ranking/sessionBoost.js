/**
 * Applies in-session intent hints to a ranking request.
 *
 * The mobile client classifies what a user is doing right now — needing
 * something urgently versus browsing — and sends the conclusion as tags. This
 * turns those tags into bounded adjustments to the ranking parameters.
 *
 * The governing rule is that tags are HINTS, not commands. A client that could
 * set ranking parameters directly would be a client that could promote its own
 * results, and a compromised or modified app is not a hypothetical on Android.
 * So:
 *
 *   - Only a fixed vocabulary of tags is recognised; anything else is ignored.
 *   - Each adjustment is a bounded multiplier or delta, not an assignment.
 *   - The result is clamped back into the same admin-configured bounds the
 *     values started in, so no sequence of tags can push a parameter outside
 *     the range an administrator permitted.
 *   - The kill switches still win. A hint cannot turn ranking on.
 *
 * The one hard behaviour is `require:open_now`, which filters rather than
 * reweights. Someone who needs a pharmacy at 11pm does not want a better-rated
 * closed one ranked above an open one, and no amount of score adjustment
 * expresses "closed is useless" as reliably as removing it.
 */

const RECOGNISED_INTENTS = Object.freeze(['urgent', 'transactional', 'browsing', 'unknown']);

/** Bounded adjustments per tag. Multipliers unless noted. */
const TAG_EFFECTS = Object.freeze({
  // Urgency: proximity and responsiveness matter more, discovery matters less.
  'prefer:proximity': { ml_w_dist: 1.5, ml_mmoe_lambda: 1.4, ml_epsilon: 0.5 },
  // Conversion intent: favour listings people actually call or book.
  'prefer:conversion': { ml_mmoe_beta: 1.4, ml_w_pop: 1.2 },
  // Responsiveness proxy — quality carries the response-time component.
  'prefer:responsive': { ml_mmoe_gamma: 1.2 },
  // Passive browsing: widen the net, explore more.
  'prefer:discovery': { ml_epsilon: 1.5, ml_w_sim: 1.2, ml_w_dist: 0.85 },
});

const MAX_TAGS = 8;

function clamp(value, bounds, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (!bounds) return n;
  return Math.min(Math.max(n, bounds[0]), bounds[1]);
}

/**
 * Parses client tags into a normalised shape.
 *
 * Deliberately tolerant of junk and strict about volume: an unrecognised tag is
 * dropped rather than rejected, because an older app build sending a tag this
 * server does not know should degrade to no hint rather than to a failed
 * request. The count cap stops a client sending a thousand tags to make the
 * parser do work.
 */
function parseTags(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') list = raw.split(',');

  const tags = [];
  let category = null;
  let intent = null;

  for (const entry of list.slice(0, MAX_TAGS)) {
    const tag = String(entry || '').trim().toLowerCase();
    if (!tag) continue;

    if (tag.startsWith('intent:')) {
      const value = tag.slice(7);
      if (RECOGNISED_INTENTS.includes(value)) intent = value;
      continue;
    }
    if (tag.startsWith('category:')) {
      // Length-capped: this reaches a SQL comparison as a bound parameter, but
      // an unbounded string is still worth refusing.
      const value = tag.slice(9).slice(0, 64);
      if (value) category = value;
      continue;
    }
    if (tag === 'require:open_now' || TAG_EFFECTS[tag]) tags.push(tag);
  }

  return { tags, category, intent };
}

/**
 * Returns a copy of the config with hints applied.
 *
 * `confidence` scales every adjustment: the client reports how much evidence
 * its classification rests on, and a decisive-looking intent from two
 * interactions should move the ranking less than the same intent from ten.
 * Without this the first tap of a session would swing the feed as hard as a
 * settled pattern.
 */
function applyHints(cfg, { tags = [], intent = null, confidence = 1 } = {}, bounds = {}) {
  if (!cfg || tags.length === 0) return { cfg, applied: [] };

  const adjusted = { ...cfg };
  const applied = [];
  const strength = Math.min(Math.max(Number(confidence) || 0, 0), 1);
  if (strength === 0) return { cfg, applied: [] };

  for (const tag of tags) {
    const effects = TAG_EFFECTS[tag];
    if (!effects) continue;

    for (const [key, multiplier] of Object.entries(effects)) {
      const current = Number(adjusted[key]);
      if (!Number.isFinite(current)) continue;

      // Interpolate between 1 and the multiplier by confidence, so a weak
      // signal produces a proportionally weak adjustment.
      const effective = 1 + (multiplier - 1) * strength;
      adjusted[key] = clamp(current * effective, bounds[key], current);
    }
    applied.push(tag);
  }

  return { cfg: adjusted, applied, intent };
}

/**
 * Whether a shop is open at the given local hour.
 *
 * opening_hours is stored as JSON, and in practice it is stored several ways
 * across this catalogue — {open,close}, a per-day map, or absent. Unknown hours
 * count as OPEN rather than closed: filtering out every shop that has not filled
 * in its hours would empty the urgent feed precisely when it matters most, and
 * a wrongly-included shop costs a wasted tap while a wrongly-excluded one costs
 * the whole point of the query.
 */
function isOpenAt(shop, localHour) {
  if (!Number.isInteger(localHour)) return true;

  let hours = shop.opening_hours;
  if (!hours) return true;
  if (typeof hours === 'string') {
    try {
      hours = JSON.parse(hours);
    } catch {
      return true;
    }
  }
  if (!hours || typeof hours !== 'object') return true;

  const parseHour = (value) => {
    if (value == null) return null;
    const match = String(value).match(/^(\d{1,2})/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    return Number.isInteger(h) && h >= 0 && h <= 24 ? h : null;
  };

  const open = parseHour(hours.open ?? hours.opens ?? hours.from);
  const close = parseHour(hours.close ?? hours.closes ?? hours.to);
  if (open == null || close == null) return true;

  // A closing hour before the opening hour means the shop runs past midnight.
  if (close <= open) return localHour >= open || localHour < close;
  return localHour >= open && localHour < close;
}

/**
 * Filters candidates for a hard requirement tag.
 *
 * Returns the original list if filtering would empty it. An urgent query that
 * returns nothing is worse than one that returns closed shops: the user can see
 * for themselves that a shop is closed, but they cannot see a result that was
 * never returned.
 */
function applyHardFilters(candidates, { tags = [], localHour = null } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return { candidates, filtered: [] };
  if (!tags.includes('require:open_now')) return { candidates, filtered: [] };

  const open = candidates.filter((c) => isOpenAt(c, localHour));
  if (open.length === 0) return { candidates, filtered: [], reason: 'would_be_empty' };
  return { candidates: open, filtered: ['require:open_now'], removed: candidates.length - open.length };
}

/** Multiplier for a candidate matching the session's dominant category. */
function categoryBoost(candidate, category) {
  if (!category) return 1;
  const haystack = `${candidate.category_name || ''} ${candidate.category || ''} ${candidate.category_slug || ''}`.toLowerCase();
  return haystack.includes(category) ? 1.25 : 1;
}

module.exports = {
  parseTags,
  applyHints,
  applyHardFilters,
  categoryBoost,
  isOpenAt,
  TAG_EFFECTS,
  RECOGNISED_INTENTS,
  MAX_TAGS,
};

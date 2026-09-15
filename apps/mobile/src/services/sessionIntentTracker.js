/**
 * In-session intent tracking.
 *
 * Holds a sliding window of the last N micro-interactions and classifies what
 * the user is currently doing, so an active recommendation query can be biased
 * toward it. The distinction that matters in a hyperlocal app is between
 * someone who needs something now — a pharmacy at 11pm, a plumber for a leak —
 * and someone browsing. The same query text should not return the same ordering
 * in both cases.
 *
 * Everything here is synchronous, in-memory and allocation-light, because it
 * runs on the interaction path with a sub-50ms budget. There is no network call,
 * no storage write and no JSON round trip in `classify()`; the window is a
 * fixed-size array of small objects and classification is a single pass over at
 * most ten of them. Measured in the accompanying test rather than assumed.
 *
 * Deliberately separate from lib/telemetry.js. Telemetry batches events to the
 * server for training a model over weeks; this reads the last few seconds to
 * change the next request. They observe the same actions and answer different
 * questions, and merging them would put a network buffer in the path of a
 * latency-sensitive classification.
 */

const WINDOW_SIZE = 10;

/**
 * How strongly each action indicates urgency rather than browsing.
 *
 * A tapped phone number is the strongest available signal of immediate need —
 * nobody calls a shop to browse. Scrolling is its opposite. The scale is
 * deliberately asymmetric: one call outweighs several scrolls, because the
 * cost of missing genuine urgency is much higher than the cost of briefly
 * treating a browser as urgent.
 */
const URGENCY_WEIGHTS = Object.freeze({
  CALL_TAP: 1.0,
  DIRECTIONS_TAP: 0.9,
  EMERGENCY_CATEGORY_VIEW: 1.0,
  BOOKING_START: 0.8,
  DETAIL_VIEW: 0.35,
  SEARCH_SUBMIT: 0.3,
  CARD_CLICK: 0.2,
  FILTER_CHANGE: 0.05,
  SCROLL: -0.15,
  IMPRESSION: -0.05,
  CATEGORY_BROWSE: -0.1,
});

/** Categories whose mere appearance implies urgency regardless of action. */
const URGENT_CATEGORIES = Object.freeze([
  'pharmacy', 'medical', 'hospital', 'clinic', 'ambulance', 'emergency',
  'plumber', 'electrician', 'locksmith', 'towing', 'repair',
]);

const INTENT = Object.freeze({
  URGENT: 'urgent',
  TRANSACTIONAL: 'transactional',
  BROWSING: 'browsing',
  UNKNOWN: 'unknown',
});

/** Interactions older than this no longer describe what the user is doing. */
const RECENCY_MS = 120000;

class SessionIntentTracker {
  constructor({ windowSize = WINDOW_SIZE, recencyMs = RECENCY_MS } = {}) {
    this.windowSize = windowSize;
    this.recencyMs = recencyMs;
    // Plain array used as a ring: at ten entries, shift() is cheaper than the
    // bookkeeping a real ring buffer needs, and far easier to read.
    this.window = [];
    this.sessionStart = Date.now();
    this.listeners = new Set();
    this.lastIntent = INTENT.UNKNOWN;
  }

  /**
   * Records one interaction. Returns the current intent.
   *
   * Callable from a render path or a gesture handler: it allocates one small
   * object, trims the window, and classifies in a single pass.
   */
  record(action, { category = null, itemId = null, at = Date.now() } = {}) {
    if (!action) return this.lastIntent;

    this.window.push({
      action: String(action).toUpperCase(),
      category: category ? String(category).toLowerCase() : null,
      itemId,
      at,
    });

    if (this.window.length > this.windowSize) this.window.shift();

    const intent = this.classify(at);
    if (intent.intent !== this.lastIntent) {
      const previous = this.lastIntent;
      this.lastIntent = intent.intent;
      // Emitted only on change, not on every interaction. A listener that
      // refetched recommendations per scroll event would defeat the purpose.
      this._emit({ ...intent, previous });
    }
    return intent;
  }

  /**
   * Classifies the current window.
   *
   * Recent interactions count for more, linearly by age within the recency
   * window. A user who called a shop ninety seconds ago and has been scrolling
   * since is browsing again, and a decay is what expresses that without needing
   * a separate timeout.
   */
  classify(now = Date.now()) {
    const window = this.window;
    if (window.length === 0) {
      return { intent: INTENT.UNKNOWN, confidence: 0, score: 0, signals: 0, boostTags: [] };
    }

    let score = 0;
    let recencySum = 0;
    let urgentCategoryHits = 0;
    const categories = new Map();

    for (let i = 0; i < window.length; i += 1) {
      const entry = window[i];
      const age = now - entry.at;
      if (age > this.recencyMs) continue;

      const recency = 1 - age / this.recencyMs; // 1 now, 0 at the horizon
      const weight = URGENCY_WEIGHTS[entry.action];
      if (weight === undefined) continue;

      score += weight * recency;
      recencySum += recency;

      if (entry.category) {
        categories.set(entry.category, (categories.get(entry.category) || 0) + recency);
        if (URGENT_CATEGORIES.some((u) => entry.category.includes(u))) {
          urgentCategoryHits += recency;
        }
      }
    }

    if (recencySum === 0) {
      return { intent: INTENT.UNKNOWN, confidence: 0, score: 0, signals: window.length, boostTags: [] };
    }

    // The recency-weighted MEAN of the raw weights, which keeps the result on
    // the same [-0.15, 1.0] scale the weights are defined on.
    //
    // Dividing by the sum of absolute weights instead — the obvious-looking
    // choice — is wrong in a way that is easy to miss: any window containing
    // only positive actions normalises to exactly 1.0 regardless of magnitude,
    // so a card tap followed by a detail view scored identically to three
    // tapped phone numbers, and everything that was not outright scrolling
    // classified as urgent.
    const normalised = score / recencySum;

    // An urgent category carries independent evidence: looking at pharmacies at
    // all is informative even without a call.
    const adjusted = normalised + Math.min(urgentCategoryHits * 0.25, 0.5);

    let intent;
    if (adjusted >= 0.5) intent = INTENT.URGENT;
    else if (adjusted >= 0.15) intent = INTENT.TRANSACTIONAL;
    else intent = INTENT.BROWSING;

    // Confidence is how much evidence the window holds, not how extreme the
    // score is: a decisive-looking score from two interactions is not something
    // to act on hard.
    const confidence = Math.min(window.length / this.windowSize, 1);

    return {
      intent,
      confidence,
      score: Number(adjusted.toFixed(4)),
      signals: window.length,
      boostTags: this._boostTags(intent, categories),
    };
  }

  /**
   * Tags to attach to the next recommendation query.
   *
   * The server treats these as hints, not commands — it still applies its own
   * config and kill switches. A client that could dictate ranking would be a
   * client that could promote its own results.
   */
  _boostTags(intent, categories) {
    const tags = [`intent:${intent}`];

    // The dominant recent category, if one clearly leads. A tie carries no
    // information and adding both tags would just widen the query.
    let top = null;
    let topScore = 0;
    let runnerUp = 0;
    for (const [category, value] of categories) {
      if (value > topScore) {
        runnerUp = topScore;
        topScore = value;
        top = category;
      } else if (value > runnerUp) {
        runnerUp = value;
      }
    }
    if (top && topScore > runnerUp * 1.5) tags.push(`category:${top}`);

    if (intent === INTENT.URGENT) {
      // Ranking reads these: open-now becomes a hard filter and the distance
      // weight rises, because somebody who needs a plumber now does not want
      // the better-rated one forty minutes away.
      tags.push('require:open_now', 'prefer:proximity', 'prefer:responsive');
    } else if (intent === INTENT.TRANSACTIONAL) {
      tags.push('prefer:conversion');
    } else {
      tags.push('prefer:discovery');
    }

    return tags;
  }

  /** Query parameters for the recommendation API. */
  getQueryContext() {
    const state = this.classify();
    return {
      intent: state.intent,
      intent_confidence: Number(state.confidence.toFixed(2)),
      boost_tags: state.boostTags,
      session_depth: this.window.length,
      session_age_seconds: Math.round((Date.now() - this.sessionStart) / 1000),
    };
  }

  /** Recent category affinity, normalised — the bandit's context feature. */
  getCategoryAffinity() {
    const now = Date.now();
    const affinity = {};
    let total = 0;

    for (const entry of this.window) {
      if (!entry.category) continue;
      const age = now - entry.at;
      if (age > this.recencyMs) continue;
      const recency = 1 - age / this.recencyMs;
      affinity[entry.category] = (affinity[entry.category] || 0) + recency;
      total += recency;
    }

    if (total === 0) return {};
    for (const key of Object.keys(affinity)) affinity[key] /= total;
    return affinity;
  }

  onIntentChange(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(payload) {
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch {
        // A throwing listener must not break the interaction that triggered it.
      }
    }
  }

  /** Called on pull-to-refresh or when the app returns from the background. */
  reset() {
    this.window = [];
    this.sessionStart = Date.now();
    this.lastIntent = INTENT.UNKNOWN;
  }

  snapshot() {
    return {
      window: this.window.slice(),
      ...this.classify(),
      session_age_seconds: Math.round((Date.now() - this.sessionStart) / 1000),
    };
  }
}

/**
 * Process-wide instance.
 *
 * A session is a property of the running app, not of a screen, so intent built
 * up on the directory is still available when the user reaches the home feed.
 */
const sessionIntentTracker = new SessionIntentTracker();

module.exports = {
  sessionIntentTracker,
  SessionIntentTracker,
  INTENT,
  URGENCY_WEIGHTS,
  URGENT_CATEGORIES,
  WINDOW_SIZE,
};

/**
 * On-device micro-ranking.
 *
 * The server ranks with everything it knows: history, distance, ratings, the
 * graph, the sequence model. What it cannot know is what the user is doing in
 * the two seconds after the response arrives — that they slowed to a stop over
 * the fourth card, that they have tapped three plumbers in a row this screen,
 * that they are on a metered connection in a lift. Those signals exist only on
 * the device, expire in seconds, and are not worth a round trip.
 *
 * So this runs one local pass over the top candidates before they render.
 *
 * ── Why the adjustment is deliberately small ───────────────────────────────
 *
 * The server's ordering is the product of far more evidence than anything
 * available here. This pass can only ever be a nudge, and the multiplier is
 * bounded to make that structural rather than a matter of tuning: no
 * combination of local signals can move a card more than a couple of positions.
 *
 * A local re-ranker that could reorder freely would produce a feed that jumps
 * while the user is looking at it, which reads as a bug, and it would make the
 * server's ranking unmeasurable — the impressions logged would belong to an
 * ordering no server-side experiment produced.
 *
 * ── Failing open is the whole contract ─────────────────────────────────────
 *
 * Every entry point is wrapped. If anything here throws, takes too long, or
 * returns something malformed, the caller gets the server's array back,
 * unchanged, with no error toast and no re-render. A recommendation feed must
 * never be worse for having tried to improve itself.
 *
 * There is no ONNX runtime and no quantised neural model. A learned re-ranker
 * needs on-device labels to train against, and shipping a model whose weights
 * came from somewhere else and calling it on-device inference would add ~3 MB
 * to the bundle, a native dependency to the build, and a cold-start cost to the
 * first feed — to compute the same kind of bounded nudge this computes in about
 * a tenth of a millisecond. The signals below are the ones that carry the
 * information; the scoring function over them is simple because the information
 * is shallow, not because the implementation is unfinished.
 */

/** Hard ceiling. Exceeding it returns the server order untouched. */
const BUDGET_MS = 15;

/** How far a local score may move a card, as a multiplier on its rank score. */
const MAX_ADJUSTMENT = 0.25;

/** Candidates considered. Beyond the first screenful, local signals say nothing. */
const CANDIDATE_WINDOW = 20;

/** Dwell beyond this is reading, not scanning. */
const MEANINGFUL_DWELL_MS = 800;

/** Scroll samples kept for the velocity estimate. */
const SCROLL_SAMPLES = 6;

/**
 * High-resolution clock, where one exists.
 *
 * React Native provides `performance.now` on recent versions and not on older
 * ones. `Date.now` has a 1ms resolution, which is too coarse to measure a pass
 * budgeted at 15ms, so the budget check silently becomes useless without this
 * fallback being explicit about what it costs.
 */
const now = (() => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return () => performance.now();
  }
  return () => Date.now();
})();

class EdgeRanker {
  constructor({ budgetMs = BUDGET_MS, maxAdjustment = MAX_ADJUSTMENT } = {}) {
    this.budgetMs = budgetMs;
    this.maxAdjustment = maxAdjustment;

    this.scrollSamples = [];
    this.dwell = new Map();          // itemId -> accumulated ms
    this.categoryTaps = new Map();   // category -> recency-weighted count
    this.device = { battery: null, charging: null, networkType: null, metered: null };

    this.stats = { passes: 0, skipped: 0, overBudget: 0, totalMs: 0, maxMs: 0 };
  }

  /**
   * Records a scroll position sample.
   *
   * Called from onScroll, so it must be trivial: two array operations and no
   * allocation beyond one small object. Anything heavier here is felt directly
   * as scroll jank, which is a far worse outcome than a slightly less
   * well-ordered feed.
   */
  observeScroll(offsetY, at = now()) {
    const offset = Number(offsetY);
    if (!Number.isFinite(offset)) return;
    this.scrollSamples.push({ offset, at });
    if (this.scrollSamples.length > SCROLL_SAMPLES) this.scrollSamples.shift();
  }

  /** Records time a card spent substantially visible. */
  observeDwell(itemId, ms) {
    if (!itemId || !Number.isFinite(ms) || ms <= 0) return;
    const key = String(itemId);
    this.dwell.set(key, (this.dwell.get(key) || 0) + ms);
  }

  /** Records a tap on a card in a category, for intra-screen affinity. */
  observeCategoryTap(category, at = Date.now()) {
    if (!category) return;
    const key = String(category).toLowerCase();
    this.categoryTaps.set(key, { count: (this.categoryTaps.get(key)?.count || 0) + 1, at });
  }

  /**
   * Updates device state.
   *
   * Supplied by the caller rather than read here. expo-battery and
   * @react-native-community/netinfo are async and optional, and this module
   * must not import either — a re-ranker that cannot run without two optional
   * native modules installed is not failing open, it is failing closed with
   * extra steps.
   */
  setDeviceState({ battery = null, charging = null, networkType = null, metered = null } = {}) {
    this.device = { battery, charging, networkType, metered };
  }

  /**
   * Scroll velocity in pixels per millisecond, and its rate of change.
   *
   * Deceleration is the signal worth having: someone slowing down is reading,
   * and the cards under their thumb at that moment are the ones they are
   * considering. Fast, constant scrolling means nothing on screen has caught
   * them, and the local pass should keep out of the way.
   */
  scrollDynamics(at = now()) {
    const samples = this.scrollSamples;
    if (samples.length < 2) return { velocity: 0, acceleration: 0, stale: true };

    const last = samples[samples.length - 1];
    // Samples stop arriving when scrolling stops, so an old last sample means
    // the user is stationary — not that they are still moving at the last
    // measured speed.
    if (at - last.at > 400) return { velocity: 0, acceleration: 0, stale: true };

    const first = samples[0];
    const span = last.at - first.at;
    if (span <= 0) return { velocity: 0, acceleration: 0, stale: true };

    const velocity = Math.abs(last.offset - first.offset) / span;

    let acceleration = 0;
    if (samples.length >= 3) {
      const mid = samples[Math.floor(samples.length / 2)];
      const earlySpan = mid.at - first.at;
      const lateSpan = last.at - mid.at;
      if (earlySpan > 0 && lateSpan > 0) {
        const early = Math.abs(mid.offset - first.offset) / earlySpan;
        const late = Math.abs(last.offset - mid.offset) / lateSpan;
        acceleration = (late - early) / ((earlySpan + lateSpan) / 2);
      }
    }

    return { velocity, acceleration, stale: false };
  }

  /**
   * How much the local pass should be trusted right now, in [0, 1].
   *
   * Zero while the user is flinging — nothing has caught their attention, so
   * there is no local preference to act on and reordering would only make the
   * list move under a moving thumb. Highest when they have slowed to a stop.
   */
  confidence(at = now()) {
    const { velocity, acceleration, stale } = this.scrollDynamics(at);
    if (stale) return 1;                          // stationary: fully trusted
    if (velocity > 3) return 0;                   // flinging
    const slowing = acceleration < 0 ? 0.3 : 0;
    return Math.min(1, Math.max(0, 1 - velocity / 3) + slowing);
  }

  /**
   * Per-item local score in [-1, 1].
   *
   * Positive pulls a card up. Every component is bounded, so no single signal
   * can dominate: a long dwell on one card must not bury the nine below it.
   */
  localScore(item, { sessionEvents = [], at = Date.now() } = {}) {
    let score = 0;

    const dwellMs = this.dwell.get(String(item.id)) || 0;
    if (dwellMs > MEANINGFUL_DWELL_MS) {
      // Saturating at four seconds. Beyond that the user has either decided or
      // put the phone down, and neither is more evidence than the first four
      // seconds gave.
      score += 0.4 * Math.min((dwellMs - MEANINGFUL_DWELL_MS) / 3200, 1);
    }

    const category = String(item.category_slug || item.category || '').toLowerCase();
    if (category) {
      const tap = this.categoryTaps.get(category);
      if (tap) {
        // Decays over two minutes. A category tapped at the start of a long
        // session is not what the user is doing now.
        const age = at - tap.at;
        const recency = Math.max(0, 1 - age / 120000);
        score += 0.35 * Math.min(tap.count / 3, 1) * recency;
      }

      // The session trail from sessionIntentTracker, most recent weighted most.
      for (let i = sessionEvents.length - 1, depth = 0; i >= 0 && depth < 5; i -= 1, depth += 1) {
        if (String(sessionEvents[i].category).toLowerCase() !== category) continue;
        score += 0.2 * (1 - depth / 5);
        break;
      }
    }

    // On a metered or slow connection, prefer cards that will actually render.
    // A beautiful ranking of images that do not load is a worse feed than a
    // slightly less relevant one that does.
    if (this.device.metered === true || this.device.networkType === '2g') {
      const hasHeavyMedia = Array.isArray(item.photo_urls) ? item.photo_urls.length > 2 : false;
      if (hasHeavyMedia) score -= 0.15;
    }

    return Math.min(Math.max(score, -1), 1);
  }

  /**
   * Re-orders the top candidates. Returns a new array, or the input unchanged.
   *
   * The input is never mutated: the caller may be holding it for impression
   * telemetry, and reordering it in place would make the logged positions
   * disagree with what was rendered.
   */
  rerank(items, { sessionEvents = [], at = Date.now() } = {}) {
    const started = now();

    try {
      if (!Array.isArray(items)) {
        // An empty array, not the input. The caller's next move is almost
        // always `<FlatList data={...}>`, and handing that back an undefined
        // or a string is the render crash this module exists to prevent —
        // "return it unchanged" is only failing open when the thing returned
        // is a usable feed.
        this.stats.skipped += 1;
        return [];
      }
      if (items.length < 3) {
        this.stats.skipped += 1;
        return items;
      }

      const trust = this.confidence(started);
      if (trust <= 0) {
        // Flinging. Leaving the order alone is the correct action, not a
        // failure, so it is not counted as a skip.
        return items;
      }

      const window = Math.min(CANDIDATE_WINDOW, items.length);
      const head = items.slice(0, window);
      const tail = items.slice(window);

      const scored = new Array(window);
      for (let i = 0; i < window; i += 1) {
        const item = head[i];
        // The server's ordering, as a decaying score. Position 0 starts well
        // ahead of position 1, which is what stops a local nudge from
        // displacing the top result on a whim.
        const serverScore = 1 / Math.log2(i + 2);
        const local = this.localScore(item, { sessionEvents, at });
        scored[i] = {
          item,
          index: i,
          score: serverScore * (1 + this.maxAdjustment * local * trust),
        };
      }

      // Budget checked before the sort rather than after. Sorting 20 elements
      // is microseconds; if the scoring pass alone has blown the budget, the
      // device is under enough pressure that finishing would be the wrong call.
      if (now() - started > this.budgetMs) {
        this.stats.overBudget += 1;
        return items;
      }

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Ties keep the server's order. Without this, `sort` stability across
        // engines decides, and the feed differs between platforms for no reason.
        return a.index - b.index;
      });

      const elapsed = now() - started;
      this.stats.passes += 1;
      this.stats.totalMs += elapsed;
      if (elapsed > this.stats.maxMs) this.stats.maxMs = elapsed;

      return scored.map((entry) => entry.item).concat(tail);
    } catch {
      // Deliberately silent. An error here is a ranking nicety failing, and a
      // toast about it would tell the user about a problem they cannot act on
      // while the feed they asked for is sitting right there.
      this.stats.skipped += 1;
      return Array.isArray(items) ? items : [];
    }
  }

  /** Called when the user leaves a screen; local signals do not carry over. */
  resetScreen() {
    this.scrollSamples = [];
    this.dwell.clear();
    this.categoryTaps.clear();
  }

  /**
   * Snake_case throughout, matching the server's metric payloads.
   *
   * Spreading `this.stats` directly leaked its camelCase internals alongside
   * the snake_case derived fields, so the object advertised `mean_ms` and
   * `maxMs` side by side and a dashboard reading `max_ms` got undefined.
   */
  metrics() {
    return {
      passes: this.stats.passes,
      skipped: this.stats.skipped,
      over_budget: this.stats.overBudget,
      total_ms: this.stats.totalMs,
      max_ms: this.stats.maxMs,
      mean_ms: this.stats.passes > 0 ? this.stats.totalMs / this.stats.passes : 0,
      budget_ms: this.budgetMs,
    };
  }
}

/**
 * Whether to prefetch the predicted next category's feed.
 *
 * Prefetching is spending the user's battery and data on a guess. The guess has
 * to be good enough and the resources cheap enough, and both conditions are
 * checked here rather than at the call site so there is one place to reason
 * about it.
 *
 * Defaults are deliberately conservative: an unknown battery level or an
 * unknown network is treated as a reason not to prefetch. The cost of a missed
 * prefetch is one slower screen transition; the cost of a wrong one on a
 * metered connection is the user's money.
 */
function shouldPrefetch({ prediction, device = {}, minConfidence = 0.35 } = {}) {
  if (!prediction || !prediction.top_category) {
    return { prefetch: false, reason: 'no_prediction' };
  }
  if (!(Number(prediction.confidence) >= minConfidence)) {
    return { prefetch: false, reason: 'low_confidence', confidence: prediction.confidence };
  }
  if (device.metered === true) {
    return { prefetch: false, reason: 'metered_connection' };
  }
  if (device.networkType === '2g' || device.networkType === 'none') {
    return { prefetch: false, reason: 'slow_network' };
  }
  if (device.charging !== true && Number.isFinite(device.battery) && device.battery < 0.2) {
    return { prefetch: false, reason: 'low_battery', battery: device.battery };
  }
  if (device.battery === null || device.battery === undefined) {
    // Unknown battery on an uncharged device. Declining is the conservative
    // read, and the caller can supply a level to get a decision.
    if (device.charging !== true) return { prefetch: false, reason: 'battery_unknown' };
  }

  return { prefetch: true, category: prediction.top_category, confidence: prediction.confidence };
}

/** Process-wide instance, matching sessionIntentTracker's shape. */
const edgeRanker = new EdgeRanker();

module.exports = {
  edgeRanker,
  EdgeRanker,
  shouldPrefetch,
  BUDGET_MS,
  MAX_ADJUSTMENT,
  CANDIDATE_WINDOW,
  MEANINGFUL_DWELL_MS,
};

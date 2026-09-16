/**
 * On-device micro-ranking.
 *
 * Two claims are load-bearing and both are measured here rather than asserted
 * in a comment: the pass completes inside its budget, and it fails open. A
 * re-ranker that throws on a malformed item blanks the feed; one that takes
 * 80ms drops frames on the scroll it was meant to improve.
 *
 * The third group of tests pins the bound on how far a local signal may move a
 * card. That bound is what keeps the server's ranking measurable — if the
 * device could reorder freely, the impressions logged would describe an
 * ordering no server-side experiment ever produced.
 */

const {
  EdgeRanker,
  edgeRanker,
  shouldPrefetch,
  CANDIDATE_WINDOW,
  MEANINGFUL_DWELL_MS,
} = require('../src/services/edgeRanker');

function feed(n = 20) {
  return Array.from({ length: n }, (_, i) => ({
    id: `shop-${i}`,
    name: `Shop ${i}`,
    category_slug: i % 3 === 0 ? 'plumber' : i % 3 === 1 ? 'grocery' : 'salon',
  }));
}

function ids(items) {
  return items.map((item) => item.id);
}

describe('failing open', () => {
  test('a null input returns an empty array rather than throwing', () => {
    expect(new EdgeRanker().rerank(null)).toEqual([]);
  });

  test('a non-array input returns an empty array', () => {
    expect(new EdgeRanker().rerank('not a feed')).toEqual([]);
  });

  test('a feed too short to reorder is returned unchanged', () => {
    const items = feed(2);
    expect(new EdgeRanker().rerank(items)).toBe(items);
  });

  test('items missing every expected field are returned, not dropped', () => {
    const ranker = new EdgeRanker();
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, {}, null];
    const out = ranker.rerank(items);
    expect(out).toHaveLength(items.length);
  });

  test('a throwing accessor does not propagate to the caller', () => {
    const ranker = new EdgeRanker();
    const hostile = feed(5);
    Object.defineProperty(hostile[2], 'category_slug', {
      get() { throw new Error('boom'); },
    });

    expect(() => ranker.rerank(hostile)).not.toThrow();
    expect(ranker.rerank(hostile)).toHaveLength(5);
  });

  test('the input array is never mutated', () => {
    // The caller holds this array for impression telemetry. Reordering it in
    // place would make the logged positions disagree with what was rendered.
    const ranker = new EdgeRanker();
    ranker.observeDwell('shop-7', 4000);
    const items = feed(10);
    const before = ids(items);

    ranker.rerank(items);

    expect(ids(items)).toEqual(before);
  });
});

describe('latency budget', () => {
  test('a full pass over the candidate window stays well inside 15ms', () => {
    const ranker = new EdgeRanker();
    const items = feed(CANDIDATE_WINDOW);

    // A realistic amount of accumulated local state.
    for (let i = 0; i < CANDIDATE_WINDOW; i += 1) ranker.observeDwell(`shop-${i}`, 500 + i * 100);
    ranker.observeCategoryTap('plumber');
    ranker.observeCategoryTap('grocery');
    for (let i = 0; i < 6; i += 1) ranker.observeScroll(i * 120);

    const sessionEvents = Array.from({ length: 50 }, (_, i) => ({
      category: i % 2 === 0 ? 'plumber' : 'salon',
      at: Date.now() - i * 1000,
    }));

    const started = Date.now();
    const runs = 200;
    for (let i = 0; i < runs; i += 1) ranker.rerank(items, { sessionEvents });
    const perPass = (Date.now() - started) / runs;

    expect(perPass).toBeLessThan(15);
    expect(ranker.metrics().max_ms).toBeLessThan(15);
  });

  test('a pass that overruns its budget returns the server order', () => {
    // Budget forced to zero: the check must fire and the input must come back
    // untouched rather than half-reordered.
    const ranker = new EdgeRanker({ budgetMs: -1 });
    ranker.observeDwell('shop-5', 5000);
    const items = feed(10);

    const out = ranker.rerank(items);

    expect(ids(out)).toEqual(ids(items));
    expect(ranker.metrics().over_budget).toBeGreaterThan(0);
  });

  test('only the candidate window is scored, however long the feed', () => {
    const ranker = new EdgeRanker();
    const items = feed(200);
    const out = ranker.rerank(items);

    expect(out).toHaveLength(200);
    // Everything past the window keeps the server's order exactly.
    expect(ids(out).slice(CANDIDATE_WINDOW)).toEqual(ids(items).slice(CANDIDATE_WINDOW));
  });
});

describe('local signals', () => {
  test('a dwelled-on card moves up', () => {
    const ranker = new EdgeRanker();
    const items = feed(10);
    ranker.observeDwell('shop-6', 5000);

    const out = ranker.rerank(items);
    const before = ids(items).indexOf('shop-6');
    const after = ids(out).indexOf('shop-6');

    expect(after).toBeLessThan(before);
  });

  test('dwell below the meaningful threshold does nothing', () => {
    const ranker = new EdgeRanker();
    const items = feed(10);
    ranker.observeDwell('shop-6', MEANINGFUL_DWELL_MS - 100);

    expect(ids(ranker.rerank(items))).toEqual(ids(items));
  });

  test('a tapped category lifts other cards in that category', () => {
    const ranker = new EdgeRanker();
    const items = feed(12);
    ranker.observeCategoryTap('salon');
    ranker.observeCategoryTap('salon');
    ranker.observeCategoryTap('salon');

    const out = ranker.rerank(items);
    const firstSalonBefore = ids(items).findIndex((id) => items.find((i) => i.id === id).category_slug === 'salon');
    const firstSalonAfter = out.findIndex((item) => item.category_slug === 'salon');

    expect(firstSalonAfter).toBeLessThanOrEqual(firstSalonBefore);
  });

  test('a category tapped long ago has decayed away', () => {
    const ranker = new EdgeRanker();
    const items = feed(12);
    ranker.observeCategoryTap('salon', Date.now() - 300000); // five minutes

    expect(ids(ranker.rerank(items))).toEqual(ids(items));
  });

  test('no local signal means no reordering at all', () => {
    const ranker = new EdgeRanker();
    const items = feed(20);
    expect(ids(ranker.rerank(items))).toEqual(ids(items));
  });
});

describe('the adjustment is bounded', () => {
  test('the strongest possible local signal cannot lift the last card to the top', () => {
    // The structural guarantee. If this fails, the device can reorder freely
    // and every server-side ranking experiment becomes unmeasurable.
    const ranker = new EdgeRanker();
    const items = feed(20);

    ranker.observeDwell('shop-19', 60000);
    ranker.observeCategoryTap('grocery');
    ranker.observeCategoryTap('grocery');
    ranker.observeCategoryTap('grocery');
    const sessionEvents = Array.from({ length: 10 }, () => ({ category: 'grocery', at: Date.now() }));

    const out = ranker.rerank(items, { sessionEvents });

    expect(out[0].id).toBe('shop-0');
    expect(ids(out).indexOf('shop-19')).toBeGreaterThan(5);
  });

  test('the top card survives a strong signal for a card just below it', () => {
    const ranker = new EdgeRanker();
    const items = feed(10);
    ranker.observeDwell('shop-1', 60000);

    expect(ranker.rerank(items)[0].id).toBe('shop-0');
  });

  test('ties keep the server order rather than depending on sort stability', () => {
    const ranker = new EdgeRanker();
    const items = feed(20);
    // Identical dwell on everything: every local score is equal.
    for (let i = 0; i < 20; i += 1) ranker.observeDwell(`shop-${i}`, 5000);

    expect(ids(ranker.rerank(items))).toEqual(ids(items));
  });
});

describe('scroll dynamics', () => {
  test('a fling suppresses the local pass entirely', () => {
    const ranker = new EdgeRanker();
    const items = feed(10);
    ranker.observeDwell('shop-8', 9000);

    // Fast, recent scrolling.
    const t = Date.now();
    for (let i = 0; i < 6; i += 1) ranker.observeScroll(i * 900, t + i * 16);

    // Confidence is zero, so the order is left alone even with a strong dwell.
    const out = ranker.rerank(items, { at: t + 90 });
    expect(ids(out)).toEqual(ids(items));
  });

  test('a stationary user is fully trusted', () => {
    const ranker = new EdgeRanker();
    expect(ranker.confidence()).toBe(1);
  });

  test('stale scroll samples mean stationary, not still-moving', () => {
    const ranker = new EdgeRanker();
    const t = 1000;
    ranker.observeScroll(0, t);
    ranker.observeScroll(900, t + 16);

    const dynamics = ranker.scrollDynamics(t + 5000);
    expect(dynamics.stale).toBe(true);
    expect(dynamics.velocity).toBe(0);
  });

  test('non-numeric scroll offsets are ignored rather than poisoning the estimate', () => {
    const ranker = new EdgeRanker();
    ranker.observeScroll('nonsense');
    ranker.observeScroll(undefined);
    ranker.observeScroll(NaN);
    expect(ranker.scrollDynamics().stale).toBe(true);
  });
});

describe('prefetch decisions', () => {
  const good = { battery: 0.8, charging: false, networkType: 'wifi', metered: false };

  test('prefetches on a confident prediction and a healthy device', () => {
    const result = shouldPrefetch({
      prediction: { top_category: 'plumber', confidence: 0.7 },
      device: good,
    });
    expect(result.prefetch).toBe(true);
    expect(result.category).toBe('plumber');
  });

  test('declines without a prediction', () => {
    expect(shouldPrefetch({ device: good }).prefetch).toBe(false);
  });

  test('declines on a low-confidence prediction', () => {
    const result = shouldPrefetch({
      prediction: { top_category: 'plumber', confidence: 0.1 },
      device: good,
    });
    expect(result.prefetch).toBe(false);
    expect(result.reason).toBe('low_confidence');
  });

  test('declines on a metered connection — this is the user\'s money', () => {
    const result = shouldPrefetch({
      prediction: { top_category: 'plumber', confidence: 0.9 },
      device: { ...good, metered: true },
    });
    expect(result.prefetch).toBe(false);
    expect(result.reason).toBe('metered_connection');
  });

  test('declines on 2g', () => {
    const result = shouldPrefetch({
      prediction: { top_category: 'plumber', confidence: 0.9 },
      device: { ...good, networkType: '2g' },
    });
    expect(result.reason).toBe('slow_network');
  });

  test('declines on a low battery unless charging', () => {
    const drained = { ...good, battery: 0.1 };
    expect(shouldPrefetch({
      prediction: { top_category: 'plumber', confidence: 0.9 },
      device: drained,
    }).reason).toBe('low_battery');

    expect(shouldPrefetch({
      prediction: { top_category: 'plumber', confidence: 0.9 },
      device: { ...drained, charging: true },
    }).prefetch).toBe(true);
  });

  test('an unknown battery on an uncharged device declines', () => {
    // Conservative by design: a missed prefetch costs one slower transition, a
    // wrong one costs data the user pays for.
    const result = shouldPrefetch({
      prediction: { top_category: 'plumber', confidence: 0.9 },
      device: { networkType: 'wifi', metered: false },
    });
    expect(result.prefetch).toBe(false);
    expect(result.reason).toBe('battery_unknown');
  });
});

describe('screen lifecycle', () => {
  test('resetScreen clears local signals so they do not leak across screens', () => {
    const ranker = new EdgeRanker();
    ranker.observeDwell('shop-3', 9000);
    ranker.observeCategoryTap('plumber');
    ranker.observeScroll(400);

    ranker.resetScreen();

    const items = feed(10);
    expect(ids(ranker.rerank(items))).toEqual(ids(items));
  });

  test('the shared instance is an EdgeRanker', () => {
    expect(edgeRanker).toBeInstanceOf(EdgeRanker);
  });
});

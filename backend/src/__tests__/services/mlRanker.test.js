/**
 * Scoring, content vectors and the degradation path.
 *
 * The properties covered here are the ones whose failure is invisible: a
 * recommender that ranks badly still returns a list, still answers 200, and
 * still looks like working software. Each test below names the wrong-but-silent
 * behaviour it exists to prevent.
 */

process.env.USE_SQLITE = 'true';

const ranker = require('../../modules/ml/services/ranker.service');
const embeddings = require('../../modules/ml/services/embedding.service');
const mlconfig = require('../../modules/ml/services/mlconfig.service');

describe('distance scoring', () => {
  test('decays by half at the configured half-life', () => {
    expect(ranker.distanceScore(2, 2)).toBeCloseTo(0.5, 6);
    expect(ranker.distanceScore(4, 2)).toBeCloseTo(0.25, 6);
  });

  test('is 1 at the user and monotonically decreasing', () => {
    expect(ranker.distanceScore(0, 2)).toBe(1);
    const points = [0, 0.5, 1, 2, 5, 10].map((km) => ranker.distanceScore(km, 2));
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]).toBeLessThan(points[i - 1]);
    }
  });

  test('spends its range on distances people act on', () => {
    // The point of exponential rather than linear decay: 200m vs 1km decides
    // whether someone walks over; 8km vs 9km is noise. A linear decay would
    // give those two pairs similar weight.
    const nearGap = ranker.distanceScore(0.2, 2) - ranker.distanceScore(1, 2);
    const farGap = ranker.distanceScore(8, 2) - ranker.distanceScore(9, 2);
    expect(nearGap).toBeGreaterThan(farGap * 5);
  });

  test('handles a missing or nonsense distance', () => {
    expect(ranker.distanceScore(null, 2)).toBe(0);
    expect(ranker.distanceScore(-5, 2)).toBe(0);
    expect(ranker.distanceScore(NaN, 2)).toBe(0);
  });
});

describe('popularity scoring', () => {
  test('ninety reviews at 4.6 outrank one review at 5.0', () => {
    // The entire reason for the Wilson lower bound over a mean. With a mean,
    // every newly listed shop with one glowing review from its owner would sit
    // above established merchants — and nothing would look broken.
    const oneFive = ranker.wilsonScore(5.0, 1);
    const manyGood = ranker.wilsonScore(4.6, 90);
    expect(manyGood).toBeGreaterThan(oneFive);
  });

  test('more evidence at the same rating scores higher', () => {
    expect(ranker.wilsonScore(4.5, 100)).toBeGreaterThan(ranker.wilsonScore(4.5, 5));
  });

  test('an unrated shop scores zero rather than defaulting high', () => {
    expect(ranker.wilsonScore(0, 0)).toBe(0);
    expect(ranker.wilsonScore(null, null)).toBe(0);
  });

  test('stays within 0..1 so it cannot dominate the weighted sum', () => {
    for (const [r, n] of [[5, 1000], [1, 1000], [3, 1], [5, 1]]) {
      const score = ranker.wilsonScore(r, n);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

describe('recency scoring', () => {
  test('a listing created now scores near 1', () => {
    expect(ranker.recencyScore(new Date().toISOString())).toBeGreaterThan(0.99);
  });

  test('decays over months', () => {
    const old = new Date(Date.now() - 180 * 86400000).toISOString();
    expect(ranker.recencyScore(old)).toBeLessThan(0.2);
  });

  test('parses the space-separated form SQLite stores', () => {
    // SQLite has no date type; created_at holds '2026-09-14 17:50:19'. Passing
    // that straight to Date() is invalid in some engines, which would have made
    // every shop score 0 for freshness with nothing reporting an error.
    const sqliteStyle = new Date(Date.now() - 86400000).toISOString().replace('T', ' ').slice(0, 19);
    expect(ranker.recencyScore(sqliteStyle)).toBeGreaterThan(0.9);
  });

  test('handles a missing or unparseable timestamp', () => {
    expect(ranker.recencyScore(null)).toBe(0);
    expect(ranker.recencyScore('not a date')).toBe(0);
  });
});

describe('time-of-day context', () => {
  test('matches a category to its hour band', () => {
    expect(ranker.contextScore('Tiffin & Dairy', 8)).toBe(1);
    expect(ranker.contextScore('Pharmacy & Medical', 23)).toBe(1);
  });

  test('does not match outside the band', () => {
    expect(ranker.contextScore('Tiffin & Dairy', 23)).toBe(0);
  });

  test('is inert without an hour, rather than guessing', () => {
    expect(ranker.contextScore('Pharmacy', null)).toBe(0);
    expect(ranker.contextScore(null, 10)).toBe(0);
  });
});

describe('content vectors', () => {
  test('builds an index over the live catalogue', async () => {
    const index = await embeddings.getIndex({ force: true });
    expect(index.vectors.size).toBeGreaterThan(0);
    expect(index.idf.size).toBeGreaterThan(0);
  });

  test('a shop is maximally similar to itself', async () => {
    const index = await embeddings.getIndex();
    const [, vec] = index.vectors.entries().next().value;
    expect(embeddings.cosine(vec, vec)).toBeCloseTo(1, 5);
  });

  test('similarity is symmetric and bounded', async () => {
    const index = await embeddings.getIndex();
    const it = index.vectors.values();
    const a = it.next().value;
    const b = it.next().value;
    if (!a || !b) return;
    const ab = embeddings.cosine(a, b);
    expect(ab).toBeCloseTo(embeddings.cosine(b, a), 9);
    expect(ab).toBeGreaterThanOrEqual(0);
    expect(ab).toBeLessThanOrEqual(1);
  });

  test('an empty vector is similar to nothing', async () => {
    const index = await embeddings.getIndex();
    const vec = index.vectors.values().next().value;
    expect(embeddings.cosine(new Map(), vec)).toBe(0);
    expect(embeddings.cosine(null, vec)).toBe(0);
  });

  test('tokenizer keeps Devanagari', () => {
    // Shop names in this catalogue are routinely in Hindi or Marathi script.
    // Stripping to [a-z] would reduce those documents to their category alone
    // and make every one of them look identical to the ranker.
    expect(embeddings.tokenize('किराना दुकान')).toContain('किराना');
  });

  test('tokenizer drops stopwords and very short tokens', () => {
    const tokens = embeddings.tokenize('The best shop in and of a Grocery');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('shop');
    expect(tokens).toContain('grocery');
  });

  test('a user with no history has no preference vector', async () => {
    // This is the cold-start case, and it must return null rather than an empty
    // vector: null makes the similarity term contribute 0, while an empty
    // vector silently scores every shop identically.
    await expect(embeddings.preferenceVector(null)).resolves.toBeNull();
    await expect(embeddings.preferenceVector('user-with-no-events')).resolves.toBeNull();
  });
});

describe('exploration', () => {
  const makeItems = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, _score: 1 - i / n }));

  test('reserves roughly epsilon of the page', () => {
    const ranked = makeItems(60);
    const out = ranker.injectExploration(ranked, 0.12, 20, new Map());
    const explored = out.filter((x) => x.is_exploration).length;
    expect(explored).toBeGreaterThanOrEqual(1);
    expect(explored).toBeLessThanOrEqual(4);
  });

  test('never spends the first slot on exploration', () => {
    // Position 0 is the most acted-on slot in any feed; giving it away is the
    // most expensive possible place to explore.
    const out = ranker.injectExploration(makeItems(60), 0.5, 20, new Map());
    expect(out[0].is_exploration).toBeFalsy();
  });

  test('prefers the least-shown items', () => {
    const ranked = makeItems(40);
    const counts = new Map(ranked.map((r, i) => [r.id, i < 30 ? 1000 : 0]));
    const out = ranker.injectExploration(ranked, 0.2, 20, counts);
    const explored = out.filter((x) => x.is_exploration);
    for (const item of explored) {
      expect(counts.get(item.id)).toBe(0);
    }
  });

  test('is a no-op when disabled', () => {
    const out = ranker.injectExploration(makeItems(60), 0, 20, new Map());
    expect(out.filter((x) => x.is_exploration)).toHaveLength(0);
    expect(out).toHaveLength(20);
  });

  test('does not disturb a page too short to spare a slot', () => {
    const out = ranker.injectExploration(makeItems(3), 0.5, 20, new Map());
    expect(out.filter((x) => x.is_exploration)).toHaveLength(0);
  });
});

describe('degradation', () => {
  const candidates = [
    { id: 'a', latitude: 18.60, longitude: 73.90, rating: 3.0, created_at: null },
    { id: 'b', latitude: 18.58, longitude: 73.89, rating: 4.9, created_at: null },
  ];

  test('an empty candidate set returns an empty feed, not an error', async () => {
    const out = await ranker.rank([], { lat: 18.58, lng: 73.89 });
    expect(out.items).toEqual([]);
    expect(out.strategy).toBe('baseline');
  });

  test('serves the baseline while the master switch is off', async () => {
    await mlconfig.set('ml_enabled', false, { updatedBy: 'test' });
    const out = await ranker.rank(candidates, { lat: 18.58, lng: 73.89, limit: 2 });
    expect(out.strategy).toBe('baseline');
    expect(out.reason).toBe('ml_disabled');
    expect(out.items).toHaveLength(2);
  });

  test('the baseline sorts by distance, so it is a usable feed on its own', () => {
    const out = ranker.baselineRank(candidates, { lat: 18.58, lng: 73.89 });
    expect(out[0].id).toBe('b');
  });

  test('ranks when enabled, and reports which strategy ran', async () => {
    await mlconfig.set('ml_enabled', true, { updatedBy: 'test' });
    const out = await ranker.rank(candidates, {
      lat: 18.58, lng: 73.89, surface: 'shops_home', limit: 2, localHour: 10,
    });
    expect(out.strategy).toBe('ml');
    expect(out.items).toHaveLength(2);
    // Every returned item carries its per-term breakdown so an admin can answer
    // a merchant asking why they rank where they do.
    expect(out.items[0]._terms).toBeDefined();
    await mlconfig.set('ml_enabled', false, { updatedBy: 'test' });
  });

  test('publicShape strips internals and rounds the distance', () => {
    const shaped = ranker.publicShape([
      { id: 'a', _score: 0.9, _terms: {}, _pinned: null, _distance_km: 1.23456 },
    ]);
    expect(shaped[0]._score).toBeUndefined();
    expect(shaped[0]._terms).toBeUndefined();
    expect(shaped[0].distance_km).toBe(1.23);
  });

  test('publicShape keeps scores for an admin caller', () => {
    const shaped = ranker.publicShape([{ id: 'a', _score: 0.9, _terms: { dist: 1 } }], { includeScores: true });
    expect(shaped[0]._score).toBe(0.9);
  });
});

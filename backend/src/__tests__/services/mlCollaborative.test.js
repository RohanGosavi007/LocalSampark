/**
 * Collaborative filtering: the matrix builder and its confidence gate.
 *
 * This ships before the data exists, and the tests are mostly about what it
 * must NOT do in that state. A recommender trained on nearly nothing does not
 * fail — it produces confident nonsense, and nothing in the system reports a
 * problem. The gate below is the mechanism that prevents it, so it is the part
 * worth pinning down.
 */

process.env.USE_SQLITE = 'true';

const ranker = require('../../modules/ml/services/ranker.service');
const matrixBuilder = require('../../modules/ml/jobs/matrix-builder.job');

describe('confidence gate', () => {
  const MIN = 50;

  test('a pair below the support threshold contributes nothing', () => {
    // The whole point. A pair seen twice must not carry the authority of one
    // seen four hundred times, and in the first months of a log every pair is
    // the former.
    expect(ranker.collaborativeConfidence(0, MIN)).toBe(0);
    expect(ranker.collaborativeConfidence(12, MIN)).toBe(0);
    expect(ranker.collaborativeConfidence(MIN - 1, MIN)).toBe(0);
  });

  test('confidence ramps rather than switching on', () => {
    // A step function at the threshold would make the feed lurch the moment a
    // pair crossed it. The ramp means evidence accrues into influence.
    const mid = ranker.collaborativeConfidence(275, MIN);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(ranker.collaborativeConfidence(100, MIN))
      .toBeLessThan(ranker.collaborativeConfidence(300, MIN));
  });

  test('saturates at 1 so a very common pair cannot exceed its weight', () => {
    expect(ranker.collaborativeConfidence(500, MIN)).toBe(1);
    expect(ranker.collaborativeConfidence(100000, MIN)).toBe(1);
  });

  test('is monotonic in support', () => {
    let previous = -1;
    for (const support of [0, 50, 75, 150, 300, 450, 600]) {
      const c = ranker.collaborativeConfidence(support, MIN);
      expect(c).toBeGreaterThanOrEqual(previous);
      previous = c;
    }
  });

  test('respects a threshold an admin has changed', () => {
    // ml_cf_min_support is an admin_config row, so the gate has to follow it
    // rather than assume the committed default.
    expect(ranker.collaborativeConfidence(30, 10)).toBeGreaterThan(0);
    expect(ranker.collaborativeConfidence(30, 500)).toBe(0);
  });
});

describe('co-occurrence counting', () => {
  const actor = (items) => items.map((id) => ({ itemId: id, weight: 1 }));

  test('an actor who touched one item produces no pairs', () => {
    const pairs = matrixBuilder.buildPairs(new Map([['a', actor(['s1'])]]));
    expect(pairs.size).toBe(0);
  });

  test('records both directions, because both are queried', () => {
    const pairs = matrixBuilder.buildPairs(new Map([['a', actor(['s1', 's2'])]]));
    const keys = [...pairs.values()].map((p) => `${p.from}->${p.to}`);
    expect(keys).toContain('s1->s2');
    expect(keys).toContain('s2->s1');
  });

  test('ignores an actor who touched implausibly many items', () => {
    // A crawler or an internal QA pass links every item to every other and
    // flattens the matrix into noise — the classic way a co-occurrence
    // recommender ends up recommending the same popular set to everyone.
    const many = Array.from({ length: matrixBuilder.MAX_ITEMS_PER_ACTOR + 1 }, (_, i) => `s${i}`);
    const pairs = matrixBuilder.buildPairs(new Map([['crawler', actor(many)]]));
    expect(pairs.size).toBe(0);
  });

  test('damps a broad actor relative to a focused one', () => {
    // Without damping, one very active user's pairs outweigh fifty ordinary
    // ones, and a single power user defines what the catalogue considers
    // related.
    const focused = matrixBuilder.buildPairs(new Map([['a', actor(['s1', 's2'])]]));
    const broad = matrixBuilder.buildPairs(
      new Map([['b', actor(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'])]])
    );
    const focusedScore = [...focused.values()].find((p) => p.from === 's1' && p.to === 's2').score;
    const broadScore = [...broad.values()].find((p) => p.from === 's1' && p.to === 's2').score;
    expect(broadScore).toBeLessThan(focusedScore);
  });

  test('a pair weighs no more than its weaker side', () => {
    // Geometric mean: an item merely glanced at alongside one that was phoned
    // must not inherit that phone call's authority.
    const strong = new Map([['a', [{ itemId: 's1', weight: 5 }, { itemId: 's2', weight: 5 }]]]);
    const lopsided = new Map([['b', [{ itemId: 's1', weight: 5 }, { itemId: 's2', weight: 0.2 }]]]);
    const s = [...matrixBuilder.buildPairs(strong).values()][0].score;
    const l = [...matrixBuilder.buildPairs(lopsided).values()][0].score;
    expect(l).toBeLessThan(s);
  });

  test('accumulates support across actors', () => {
    const pairs = matrixBuilder.buildPairs(new Map([
      ['a', actor(['s1', 's2'])],
      ['b', actor(['s1', 's2'])],
      ['c', actor(['s1', 's2'])],
    ]));
    const entry = [...pairs.values()].find((p) => p.from === 's1' && p.to === 's2');
    expect(entry.support).toBe(3);
  });
});

describe('normalisation', () => {
  test('scales per source item, not globally', () => {
    // The ranker compares candidates for one item against each other and never
    // across items. A global scale would let a popular shop's relationships
    // dwarf a niche shop's equally meaningful ones.
    const pairs = new Map([
      ['a', { from: 'popular', to: 'x', score: 100, support: 5 }],
      ['b', { from: 'niche', to: 'y', score: 0.5, support: 5 }],
    ]);
    const out = matrixBuilder.normalizePairs(pairs);
    expect([...out.values()].find((p) => p.from === 'popular').score).toBeCloseTo(1, 6);
    expect([...out.values()].find((p) => p.from === 'niche').score).toBeCloseTo(1, 6);
  });

  test('leaves every score inside 0..1', () => {
    const pairs = new Map([
      ['a', { from: 's1', to: 's2', score: 9, support: 2 }],
      ['b', { from: 's1', to: 's3', score: 3, support: 2 }],
    ]);
    for (const p of matrixBuilder.normalizePairs(pairs).values()) {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(1);
    }
  });
});

describe('rebuild against the live database', () => {
  test('a dry run reports without writing', async () => {
    const result = await matrixBuilder.rebuild({ dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(typeof result.pairs_stored).toBe('number');
  });

  test('reports matrix shape without throwing when it is empty', async () => {
    const stats = await matrixBuilder.stats();
    expect(stats).toHaveProperty('pairs');
    expect(stats).toHaveProperty('last_built');
  });

  test('a user with no history gets no collaborative scores', async () => {
    // The normal case today, and it must cost nothing: no history means no
    // rows, which means the term is 0 without a cold-start branch.
    const scores = await ranker.loadCollaborativeScores('nobody-at-all', 50);
    expect(scores.size).toBe(0);
  });

  test('an anonymous request skips the lookup entirely', async () => {
    const scores = await ranker.loadCollaborativeScores(null, 50);
    expect(scores.size).toBe(0);
  });
});

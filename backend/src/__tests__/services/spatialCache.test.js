/**
 * The spatial cache, and the one rule that makes it safe.
 *
 * A cache in front of territory resolution is an optimisation with a payment
 * attached: the answer it stores decides which franchise is credited for an
 * order. Two failures matter more than any hit rate.
 *
 *  1. **A cell that straddles a boundary must never be cached.** A geohash cell
 *     is a rectangle and a franchise boundary is not; a cell containing both
 *     sides of a border has two correct answers, and storing one of them serves
 *     the wrong franchise to everyone on the other side of the street. The
 *     margin test is the whole safety argument and is pinned here.
 *
 *  2. **An assignment change must invalidate everything at once.** A partially
 *     invalidated cache pays the previous holder, and does it silently.
 *
 * Redis is not running in the test environment, so these exercise the in-memory
 * tier — which is also the production path whenever Redis is down, so it is the
 * tier that most needs to be correct.
 */

process.env.USE_SQLITE = 'true';

const cache = require('../../services/spatialCache.service');

const PUNE = { lat: 18.53, lng: 73.87 };

const boundaryAnswer = (id = 't-1') => ({
  resolved: true,
  method: 'boundary',
  territory: { id, name: 'Test Territory', pincode: '411001' },
});

beforeEach(() => {
  cache.invalidate();
});

describe('geohash encoding', () => {
  test('matches the canonical reference hashes', () => {
    // The standard worked example from the geohash literature, plus a second
    // well-known city. These are the check that the bit-interleaving is right;
    // an encoder that is subtly wrong still looks plausible and still buckets
    // consistently, so it would pass every other test in this file while
    // partitioning space incorrectly.
    expect(cache.geohash(57.64911, 10.40744, 11)).toBe('u4pruydqqvj');
    expect(cache.geohash(51.5074, -0.1278, 6)).toBe('gcpvj0');
  });

  test('encodes Pune to a stable cell', () => {
    // Pinned so a change to precision or encoding, which silently repartitions
    // every cached cell, cannot pass unnoticed.
    expect(cache.geohash(18.53, 73.87, 7)).toBe('tek92vq');
  });

  test('neighbouring points inside one cell share a hash', () => {
    // ~30 m apart: the reason the cache hits at all.
    expect(cache.geohash(18.5300, 73.8700)).toBe(cache.geohash(18.5302, 73.8702));
  });

  test('distant points do not', () => {
    expect(cache.geohash(18.53, 73.87)).not.toBe(cache.geohash(19.07, 72.87));
  });

  test('precision controls cell size', () => {
    const coarse = cache.geohash(18.53, 73.87, 4);
    const fine = cache.geohash(18.53, 73.87, 7);
    expect(fine.startsWith(coarse)).toBe(true);
  });
});

describe('the straddling-cell rule', () => {
  test('a point comfortably interior to its territory is cached', async () => {
    const cached = await cache.setCoordinate(PUNE.lat, PUNE.lng, boundaryAnswer(), 4.0);

    expect(cached).toBe(true);
    const hit = await cache.getCoordinate(PUNE.lat, PUNE.lng);
    expect(hit.territory.id).toBe('t-1');
  });

  test('a point near a boundary is never cached', async () => {
    // 30 m from the edge — the street-boundary case. The cell certainly
    // contains the other franchise's ground too.
    const cached = await cache.setCoordinate(PUNE.lat, PUNE.lng, boundaryAnswer(), 0.03);

    expect(cached).toBe(false);
    expect(await cache.getCoordinate(PUNE.lat, PUNE.lng)).toBeNull();
  });

  test('the margin must exceed the cell diagonal, not merely be positive', async () => {
    // A margin smaller than the cell's own diagonal cannot prove the rest of
    // the cell shares the answer, however far inside the polygon it feels.
    const justInside = cache.CELL_DIAGONAL_KM * 0.9;
    expect(await cache.setCoordinate(PUNE.lat, PUNE.lng, boundaryAnswer(), justInside)).toBe(false);

    const clear = cache.CELL_DIAGONAL_KM * 1.1;
    expect(await cache.setCoordinate(PUNE.lat, PUNE.lng, boundaryAnswer(), clear)).toBe(true);
  });

  test('an unknown margin is treated as unsafe rather than as far away', async () => {
    // distanceToBoundaryKm returns null when there is no verified geometry to
    // measure. Reading that as "no nearby edge" would cache precisely the
    // answers with no geometry behind them.
    expect(await cache.setCoordinate(PUNE.lat, PUNE.lng, boundaryAnswer(), null)).toBe(false);
    expect(await cache.setCoordinate(PUNE.lat, PUNE.lng, boundaryAnswer(), undefined)).toBe(false);
    expect(await cache.setCoordinate(PUNE.lat, PUNE.lng, boundaryAnswer(), NaN)).toBe(false);
  });

  test('a centroid guess is never cached, however large its apparent margin', async () => {
    // Only a real polygon match may be frozen into a cell. A centroid inference
    // is a guess, and a cached guess is a guess wearing a boundary answer's
    // clothes.
    const guess = { resolved: true, method: 'centroid', territory: { id: 't-9' } };
    expect(await cache.setCoordinate(PUNE.lat, PUNE.lng, guess, 50)).toBe(false);
  });

  test('an unresolved answer is not cached', async () => {
    const miss = { resolved: false, method: 'unresolved' };
    expect(await cache.setCoordinate(PUNE.lat, PUNE.lng, miss, 10)).toBe(false);
  });
});

describe('pincode entries', () => {
  test('a resolved pincode round-trips', async () => {
    await cache.setPincode('411001', { resolved: true, method: 'pincode', territory: { id: 't-1' } });
    const hit = await cache.getPincode('411001');
    expect(hit.territory.id).toBe('t-1');
  });

  test('an unresolved pincode is not stored', async () => {
    // The coverage-gap counter behind a miss is how an operator sees demand for
    // an unserved area; caching the negative would swallow the signal.
    await cache.setPincode('999999', { resolved: false, method: 'unresolved' });
    expect(await cache.getPincode('999999')).toBeNull();
  });

  test('one pincode does not answer for another', async () => {
    await cache.setPincode('411001', { resolved: true, method: 'pincode', territory: { id: 't-1' } });
    expect(await cache.getPincode('411002')).toBeNull();
  });
});

describe('invalidation', () => {
  test('a territory change makes every existing answer unreachable at once', async () => {
    await cache.setPincode('411001', { resolved: true, method: 'pincode', territory: { id: 't-old' } });
    await cache.setCoordinate(PUNE.lat, PUNE.lng, boundaryAnswer('t-old'), 4.0);

    cache.invalidate();

    // Both tiers, both key shapes. A partial invalidation pays the previous
    // holder, so this asserts the sweep rather than a single key.
    expect(await cache.getPincode('411001')).toBeNull();
    expect(await cache.getCoordinate(PUNE.lat, PUNE.lng)).toBeNull();
  });

  test('the generation advances, so stale Redis keys can never be read back', async () => {
    const before = cache.stats().generation;
    cache.invalidate();
    expect(cache.stats().generation).toBe(before + 1);
  });
});

describe('the in-memory tier', () => {
  test('evicts rather than growing without bound', async () => {
    // Redis being down must not turn the cache into a memory leak in a
    // long-running API process.
    for (let i = 0; i < 6000; i++) {
      await cache.setPincode(`4${String(i).padStart(5, '0')}`, {
        resolved: true,
        method: 'pincode',
        territory: { id: `t-${i}` },
      });
    }

    expect(cache.stats().memoryEntries).toBeLessThanOrEqual(5000);
  });

  test('a recently read entry survives eviction pressure', async () => {
    const hot = '411001';
    await cache.setPincode(hot, { resolved: true, method: 'pincode', territory: { id: 'hot' } });

    for (let i = 0; i < 4800; i++) {
      await cache.setPincode(`5${String(i).padStart(5, '0')}`, {
        resolved: true,
        method: 'pincode',
        territory: { id: `t-${i}` },
      });
      // Keep touching the hot key so recency, not insertion order, decides.
      if (i % 500 === 0) await cache.getPincode(hot);
    }

    expect(await cache.getPincode(hot)).not.toBeNull();
  });
});

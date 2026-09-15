/**
 * ML telemetry ingest and runtime configuration.
 *
 * These cover the properties the ranking engine depends on and that are easy to
 * regress silently, because none of them produce a visible failure when broken:
 *
 *   - IMPRESSION must weigh zero. If it ever counts as a weak positive, the
 *     recommender learns to promote whatever it already showed. That looks like
 *     rising engagement in aggregate while the catalogue narrows, and nothing
 *     in the system reports it as a problem.
 *
 *   - A malformed event in a batch must not discard the valid ones beside it.
 *     Clients ship on their own schedule and an older app version sending a
 *     field we removed should degrade to partial telemetry, not to none.
 *
 *   - Weights must renormalise. ml_w_cf sits at zero until the affinity matrix
 *     has support; without renormalisation, turning it on later would silently
 *     rescale every other term.
 *
 *   - Out-of-range config must be clamped. These rows are written from a UI, and
 *     an epsilon of 10 would make the feed random with no error anywhere.
 */

process.env.USE_SQLITE = 'true';

const telemetry = require('../../modules/ml/services/telemetry.service');
const mlconfig = require('../../modules/ml/services/mlconfig.service');

/**
 * Removes rows this suite created.
 *
 * These tests exercise real write paths against whatever database is
 * configured, and jest.config.js declares no setupFiles — so setup/testDb.js,
 * which exists to point the suite at an isolated file, is never loaded and the
 * writes land in the shared development database. A full run left roughly 3,500
 * synthetic interaction events there, which inflates the demo's own CTR and
 * feeds fabricated pairs into the affinity matrix.
 *
 * Cleaning up by timestamp is narrow but correct: it removes exactly what this
 * run inserted and touches nothing that was there before. The broader fix is to
 * make the suite hermetic, which is a larger piece of work — isolating the
 * database currently fails 48 tests across 9 suites that read the development
 * catalogue rather than seeding their own fixtures.
 */
const SUITE_STARTED_AT = new Date()
  .toISOString()
  .replace('T', ' ')
  .replace(/\.\d{3}Z$/, '');

afterAll(async () => {
  const { query } = require('../../config/database');
  try {
    await query('DELETE FROM ml_interaction_events WHERE created_at >= $1', [SUITE_STARTED_AT]);
  } catch {
    // A failed cleanup is not a failed test; it leaves rows behind in a
    // development database, which is the status quo this is improving on.
  }
});


describe('ML event weights', () => {
  test('IMPRESSION carries zero weight — it is the CTR denominator, not a positive', () => {
    expect(telemetry.EVENT_WEIGHTS.IMPRESSION).toBe(0);
  });

  test('weights are ordered by commercial intent', () => {
    const w = telemetry.EVENT_WEIGHTS;
    expect(w.PURCHASE_INTENT).toBeGreaterThan(w.CALL_VENDOR);
    expect(w.CALL_VENDOR).toBeGreaterThan(w.BOOKMARK);
    expect(w.BOOKMARK).toBeGreaterThan(w.DETAIL_VIEW);
    expect(w.DETAIL_VIEW).toBeGreaterThan(w.CARD_CLICK);
    expect(w.CARD_CLICK).toBeGreaterThan(w.IMPRESSION);
  });

  test('every declared event type has a weight', () => {
    for (const type of telemetry.VALID_EVENTS) {
      expect(typeof telemetry.EVENT_WEIGHTS[type]).toBe('number');
    }
  });
});

describe('normalizeEvent', () => {
  const valid = { event_type: 'CARD_CLICK', item_type: 'shop', item_id: 'shop-1' };

  test('accepts a well-formed event and resolves its weight server-side', () => {
    const out = telemetry.normalizeEvent(valid);
    expect(out).not.toBeNull();
    expect(out.weight).toBe(telemetry.EVENT_WEIGHTS.CARD_CLICK);
  });

  test('ignores a client-supplied weight', () => {
    // A client that could set its own weight could inflate any merchant's
    // ranking simply by claiming its clicks are worth more.
    const out = telemetry.normalizeEvent({ ...valid, weight: 9999 });
    expect(out.weight).toBe(telemetry.EVENT_WEIGHTS.CARD_CLICK);
  });

  test('rejects unknown event and item types', () => {
    expect(telemetry.normalizeEvent({ ...valid, event_type: 'NOT_A_THING' })).toBeNull();
    expect(telemetry.normalizeEvent({ ...valid, item_type: 'spaceship' })).toBeNull();
  });

  test('rejects an event with no item id', () => {
    expect(telemetry.normalizeEvent({ ...valid, item_id: '' })).toBeNull();
  });

  test('drops an implausible position but keeps the event', () => {
    const out = telemetry.normalizeEvent({ ...valid, position: -5 });
    expect(out).not.toBeNull();
    expect(out.position).toBeNull();
  });

  test('drops an out-of-range local hour but keeps the event', () => {
    const out = telemetry.normalizeEvent({ ...valid, local_hour: 47 });
    expect(out).not.toBeNull();
    expect(out.local_hour).toBeNull();
  });

  test('accepts camelCase from clients as well as snake_case', () => {
    const out = telemetry.normalizeEvent({ eventType: 'BOOKMARK', itemType: 'shop', itemId: 'shop-9' });
    expect(out).not.toBeNull();
    expect(out.event_type).toBe('BOOKMARK');
  });

  test('normalises an unrecognised platform rather than rejecting the event', () => {
    const out = telemetry.normalizeEvent({ ...valid, platform: 'blackberry' });
    expect(out.platform).toBe('unknown');
  });
});

describe('recordBatch', () => {
  test('a malformed event does not discard the valid ones beside it', async () => {
    const result = await telemetry.recordBatch([
      { event_type: 'CARD_CLICK', item_type: 'shop', item_id: 'batch-a' },
      { event_type: 'GARBAGE', item_type: 'shop', item_id: 'batch-b' },
      { event_type: 'IMPRESSION', item_type: 'shop', item_id: 'batch-c' },
    ]);
    expect(result.accepted).toBe(2);
    expect(result.rejected).toBe(1);
  });

  test('an empty batch is a no-op, not an error', async () => {
    await expect(telemetry.recordBatch([])).resolves.toEqual({ accepted: 0, rejected: 0 });
    await expect(telemetry.recordBatch(null)).resolves.toEqual({ accepted: 0, rejected: 0 });
  });

  test('a batch above the cap is truncated rather than refused', async () => {
    const many = Array.from({ length: telemetry.MAX_BATCH + 25 }, (_, i) => ({
      event_type: 'IMPRESSION', item_type: 'shop', item_id: `cap-${i}`,
    }));
    const result = await telemetry.recordBatch(many);
    expect(result.accepted).toBe(telemetry.MAX_BATCH);
    expect(result.rejected).toBe(25);
  });
});

describe('deriveSessionId', () => {
  test('is stable for the same token and different for another', () => {
    const a = telemetry.deriveSessionId('token-abc');
    expect(telemetry.deriveSessionId('token-abc')).toBe(a);
    expect(telemetry.deriveSessionId('token-xyz')).not.toBe(a);
  });

  test('does not echo the client token back', () => {
    // The stored id must not be reversible into whatever the client sent.
    expect(telemetry.deriveSessionId('token-abc')).not.toContain('token-abc');
  });

  test('returns null when there is no token', () => {
    expect(telemetry.deriveSessionId(null)).toBeNull();
  });
});

describe('metrics', () => {
  test('CTR is null rather than zero when nothing was shown', async () => {
    // "No data yet" and "a CTR of zero" mean very different things to an
    // operator; conflating them is how a broken tracker goes unnoticed.
    const metrics = await telemetry.getMetrics({ surface: 'surface-that-has-no-events', sinceHours: 1 });
    expect(metrics.ctr).toBeNull();
  });

  test('counts rows written moments ago', async () => {
    // Regression: the cutoff was built with toISOString(), which yields
    // '2026-09-14T17:50:19.219Z'. SQLite has no date type — created_at holds the
    // literal text CURRENT_TIMESTAMP produced, '2026-09-14 17:50:19' — and `>=`
    // on it is a string comparison. ' ' sorts before 'T', so every comparison
    // was false and every metric reported zero while the rows sat in the table.
    // Nothing errored; the console simply showed no traffic.
    const surface = `metrics-window-${Date.now()}`;
    await telemetry.recordBatch([
      { event_type: 'IMPRESSION', item_type: 'shop', item_id: 'win-1', surface },
      { event_type: 'IMPRESSION', item_type: 'shop', item_id: 'win-2', surface },
      { event_type: 'CARD_CLICK', item_type: 'shop', item_id: 'win-1', surface },
    ]);

    const metrics = await telemetry.getMetrics({ surface, sinceHours: 1 });
    expect(metrics.impressions).toBe(2);
    expect(metrics.clicks).toBe(1);
    expect(metrics.ctr).toBeCloseTo(0.5, 6);
  });

  test('reports the collaborative-filtering readiness thresholds', async () => {
    const readiness = await telemetry.getReadiness();
    expect(readiness.target_events).toBe(50000);
    expect(readiness.target_users).toBe(500);
    expect(typeof readiness.cf_ready).toBe('boolean');
  });
});

describe('ML configuration', () => {
  test('ships disabled — the engine is switched on deliberately', () => {
    expect(mlconfig.DEFAULTS.ml_enabled).toBe(false);
  });

  test('the collaborative weight starts at zero', () => {
    // There is no interaction history yet; a non-zero CF weight would be
    // scoring against an empty matrix.
    expect(mlconfig.DEFAULTS.ml_w_cf).toBe(0);
  });

  test('every default sits inside its own declared bounds', () => {
    for (const [key, [min, max]] of Object.entries(mlconfig.BOUNDS)) {
      expect(mlconfig.DEFAULTS[key]).toBeGreaterThanOrEqual(min);
      expect(mlconfig.DEFAULTS[key]).toBeLessThanOrEqual(max);
    }
  });

  test('every weight key has a default and a bound', () => {
    for (const key of mlconfig.WEIGHT_KEYS) {
      expect(mlconfig.DEFAULTS).toHaveProperty(key);
      expect(mlconfig.BOUNDS).toHaveProperty(key);
    }
  });

  test('normalised weights sum to 1 so a zeroed term cannot rescale the others', async () => {
    const weights = await mlconfig.getWeights();
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  test('rejects an unknown config key', async () => {
    await expect(
      mlconfig.set('ml_not_a_real_key', 1, { updatedBy: 'test' })
    ).rejects.toThrow(/Unknown ML config key/);
  });

  test('requires an actor, because a weight change must be attributable', async () => {
    await expect(mlconfig.set('ml_w_dist', 0.5, {})).rejects.toThrow(/updatedBy is required/);
  });

  test('refuses an out-of-range write rather than clamping it silently', async () => {
    // Clamping on write would leave the operator believing they set 10.
    await expect(
      mlconfig.set('ml_epsilon', 10, { updatedBy: 'test' })
    ).rejects.toThrow(/must be between/);
  });

  test('refuses a non-numeric weight', async () => {
    await expect(
      mlconfig.set('ml_w_dist', 'quite a lot', { updatedBy: 'test' })
    ).rejects.toThrow(/must be a number/);
  });

  test('a write survives an actor id that is not a real user', async () => {
    // Regression: updated_by is a foreign key onto users(id), so an actor that
    // does not resolve made the write fail with a constraint error. That put a
    // referential detail in the path of the kill switch — the one control that
    // must always work. The id is now stored as NULL and attribution goes to
    // admin_audit_log instead.
    await expect(
      mlconfig.set('ml_candidate_limit', 150, { updatedBy: 'not-a-real-user-id' })
    ).resolves.toMatchObject({ key: 'ml_candidate_limit' });

    const cfg = await mlconfig.get();
    expect(cfg.ml_candidate_limit).toBe(150);

    await mlconfig.set('ml_candidate_limit', mlconfig.DEFAULTS.ml_candidate_limit, { updatedBy: 'test-cleanup' });
  });

  test('the master switch round-trips, so the kill switch actually takes effect', async () => {
    // Regression: set() matched the row on `id`, but admin_config declares
    // `id TEXT PRIMARY KEY` with no default and SQLite permits NULL in a primary
    // key, so seeded rows had a NULL id and `WHERE id = ?` matched nothing.
    // Every config write silently did nothing — including enabling and
    // disabling the engine.
    await mlconfig.set('ml_enabled', true, { updatedBy: 'test' });
    await expect(mlconfig.isEnabled('shops')).resolves.toBe(true);

    await mlconfig.set('ml_enabled', false, { updatedBy: 'test' });
    await expect(mlconfig.isEnabled('shops')).resolves.toBe(false);
  });

  test('isEnabled is false for every surface while the master switch is off', async () => {
    mlconfig.invalidateLocal();
    const cfg = await mlconfig.get();
    if (cfg.ml_enabled === false) {
      await expect(mlconfig.isEnabled('shops')).resolves.toBe(false);
      await expect(mlconfig.isEnabled('jobs')).resolves.toBe(false);
    }
  });
});

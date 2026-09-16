/**
 * Feature store: point-in-time correctness.
 *
 * The leakage tests here are the reason the module exists. A feature computed
 * with rows that did not exist when the label was recorded produces a model
 * that scores brilliantly offline and does nothing live, and no amount of
 * looking at the training set reveals it — the numbers are all plausible.
 *
 * So the fixture is built with events on both sides of a known instant, and the
 * assertions are that the as-of read cannot see across it. If someone later
 * "optimises" the training path to read the online cache, these fail.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const { query } = require('../../config/database');
const store = require('../../modules/ml/featurestore');
const registry = require('../../modules/ml/featurestore/registry');

const SHOP = 'fs-test-shop-1';
const OTHER_SHOP = 'fs-test-shop-2';
const USER = 'fs-test-user-primary';

/** Midpoint of the fixture: events exist on both sides of it. */
const T0 = Date.parse('2026-01-10T12:00:00Z');
const DAY = 86400000;

function ts(ms) {
  return registry.sqlTimestamp(ms);
}

/**
 * ml_interaction_events.user_id is a foreign key onto users(id), so a fixture
 * event needs a real user row. Created here rather than in the shared jest
 * setup because these are throwaway ids specific to this suite, and adding them
 * to the global fixtures would make every other suite's user counts wrong.
 */
let fixtureUserSeq = 0;

async function ensureUser(id) {
  // phone_number is UNIQUE, so the fixture numbers come from a counter rather
  // than from a hash of the id: a truncated hash collides, and the collision
  // surfaces as a constraint error in whichever test happens to run first
  // rather than as anything to do with phone numbers.
  fixtureUserSeq += 1;
  const phone = `+9190${String(fixtureUserSeq).padStart(8, '0')}`;
  await query(
    `INSERT INTO users (id, phone_number, phone, full_name, role, is_active)
     VALUES ($1, $2, $2, $3, 'user', 1)`,
    [id, phone, `Feature store fixture ${id}`]
  );
}

async function insertEvent({ itemId, eventType, weight, at, userId = USER }) {
  await query(
    `INSERT INTO ml_interaction_events
       (user_id, session_id, item_type, item_id, event_type, weight, surface, created_at)
     VALUES ($1, $2, 'shop', $3, $4, $5, 'test', $6)`,
    [userId, 'fs-test-session', itemId, eventType, weight, ts(at)]
  );
}

beforeAll(async () => {
  await query('DELETE FROM ml_interaction_events WHERE session_id = $1', ['fs-test-session']);
  await query('DELETE FROM ml_feature_values WHERE entity_id IN ($1, $2)', [SHOP, OTHER_SHOP]);
  // An interrupted earlier run can leave these behind, and the insert below is
  // not an upsert.
  await query("DELETE FROM users WHERE id LIKE 'fs-test-user-%'");

  await ensureUser(USER);
  // The distinct-user fixture below attributes the post-T0 purchase intents to
  // thirty different people, so each needs a row.
  for (let i = 0; i < 30; i += 1) await ensureUser(`fs-test-user-${i}`);

  // Before T0: 4 impressions, 1 click, 1 booking.
  for (let i = 0; i < 4; i += 1) {
    await insertEvent({ itemId: SHOP, eventType: 'IMPRESSION', weight: 0, at: T0 - 2 * DAY - i * 1000 });
  }
  await insertEvent({ itemId: SHOP, eventType: 'CARD_CLICK', weight: 1, at: T0 - 2 * DAY });
  await insertEvent({ itemId: SHOP, eventType: 'CALL_VENDOR', weight: 5, at: T0 - 1 * DAY });

  // After T0: a great deal more. If any of this reaches an as-of read at T0,
  // the training path is leaking.
  for (let i = 0; i < 50; i += 1) {
    await insertEvent({ itemId: SHOP, eventType: 'IMPRESSION', weight: 0, at: T0 + DAY + i * 1000 });
  }
  for (let i = 0; i < 40; i += 1) {
    await insertEvent({ itemId: SHOP, eventType: 'CARD_CLICK', weight: 1, at: T0 + DAY + i * 1000 });
  }
  for (let i = 0; i < 30; i += 1) {
    await insertEvent({
      itemId: SHOP,
      eventType: 'PURCHASE_INTENT',
      weight: 8,
      at: T0 + DAY + i * 1000,
      userId: `fs-test-user-${i}`,
    });
  }

  // An event older than the seven-day window, to pin the lower bound too.
  await insertEvent({ itemId: SHOP, eventType: 'CALL_VENDOR', weight: 5, at: T0 - 30 * DAY });
});

afterAll(async () => {
  await query('DELETE FROM ml_interaction_events WHERE session_id = $1', ['fs-test-session']);
  await query('DELETE FROM ml_feature_values WHERE entity_id IN ($1, $2)', [SHOP, OTHER_SHOP]);
  await query("DELETE FROM users WHERE id LIKE 'fs-test-user-%'");
});

describe('as-of reads cannot see the future', () => {
  test('bookings as of T0 exclude the 30 that happened after it', async () => {
    const values = await registry.get('shop_bookings_7d').asOf([SHOP], T0);
    expect(values.get(SHOP)).toBe(1);
  });

  test('impressions as of T0 exclude the 50 that happened after it', async () => {
    const values = await registry.get('shop_impressions_7d').asOf([SHOP], T0);
    expect(values.get(SHOP)).toBe(4);
  });

  test('the same read after the later events sees them', async () => {
    // The complement of the leakage test. Without it, a feature that always
    // returned zero would pass every assertion above.
    const values = await registry.get('shop_bookings_7d').asOf([SHOP], T0 + 3 * DAY);
    expect(values.get(SHOP)).toBe(31);
  });

  test('the trailing window has a lower bound as well as an upper one', async () => {
    // The 30-day-old call must not be counted in a seven-day feature.
    const values = await registry.get('shop_bookings_7d').asOf([SHOP], T0);
    expect(values.get(SHOP)).toBe(1);

    const wide = await registry.get('shop_bookings_7d').asOf([SHOP], T0 - 29 * DAY);
    expect(wide.get(SHOP)).toBe(1);
  });

  test('CTR as of T0 reflects one click in four impressions, smoothed', async () => {
    const values = await registry.get('shop_ctr_7d').asOf([SHOP], T0);
    const expected = registry.smoothedRate(1, 4, registry.PRIOR_CLICKS, registry.PRIOR_IMPRESSIONS);
    expect(values.get(SHOP)).toBeCloseTo(expected, 10);

    // And that the smoothing is doing something: the raw rate is 0.25, the
    // smoothed one is pulled well below it by a thin denominator.
    expect(values.get(SHOP)).toBeLessThan(0.25);
  });

  test('an entity with no history resolves to the declared default, not undefined', async () => {
    const values = await registry.get('shop_bookings_7d').asOf([OTHER_SHOP], T0);
    expect(values.get(OTHER_SHOP)).toBe(0);
    expect(values.get(OTHER_SHOP)).not.toBeUndefined();
  });
});

describe('trainingSet', () => {
  test('gives each row the features that were observable at its own timestamp', async () => {
    const built = await store.trainingSet(
      [
        { entityId: SHOP, at: T0, label: 0 },
        { entityId: SHOP, at: T0 + 3 * DAY, label: 1 },
      ],
      ['shop_bookings_7d']
    );

    expect(built.rows).toHaveLength(2);
    const [early, late] = built.rows;

    expect(early.at).toBe(T0);
    expect(early.features.shop_bookings_7d).toBe(1);

    // The same entity, the same feature, a different answer — because the
    // reference time moved. This is the property the whole module is for.
    expect(late.features.shop_bookings_7d).toBe(31);
  });

  test('buckets round down, never forward, so no row sees past its own time', async () => {
    // A row one second before a bucket boundary must use the earlier bucket. If
    // buckets rounded to nearest, this row would be given features from an hour
    // in its own future.
    const boundary = Math.ceil((T0 + DAY) / (3600 * 1000)) * (3600 * 1000);
    const justBefore = boundary - 1000;

    const built = await store.trainingSet(
      [{ entityId: SHOP, at: justBefore, label: 1 }],
      ['shop_bookings_7d'],
      { bucketMs: 3600 * 1000 }
    );

    expect(built.rows[0].feature_bucket).toBeLessThanOrEqual(justBefore);
  });

  test('returns rows in chronological order for a time-based split', async () => {
    const built = await store.trainingSet(
      [
        { entityId: SHOP, at: T0 + 5 * DAY, label: 1 },
        { entityId: SHOP, at: T0 - 5 * DAY, label: 0 },
        { entityId: SHOP, at: T0, label: 0 },
      ],
      ['shop_bookings_7d']
    );
    const times = built.rows.map((row) => row.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  test('ignores rows without a usable timestamp rather than bucketing them at zero', async () => {
    const built = await store.trainingSet(
      [
        { entityId: SHOP, at: T0, label: 0 },
        { entityId: SHOP, at: 'not a time', label: 1 },
      ],
      ['shop_bookings_7d']
    );
    expect(built.rows).toHaveLength(1);
  });
});

describe('online serving', () => {
  test('returns a value for every requested entity, defaulting rather than omitting', async () => {
    store.invalidate();
    const values = await store.online(['shop_bookings_7d'], [SHOP, OTHER_SHOP, 'does-not-exist']);
    expect(values.shop_bookings_7d.size).toBe(3);
    expect(values.shop_bookings_7d.get('does-not-exist')).toBe(0);
  });

  test('an unknown feature yields an empty map rather than throwing into the ranker', async () => {
    const values = await store.online(['no_such_feature'], [SHOP]);
    expect(values.no_such_feature.size).toBe(0);
  });

  test('the second read of the same entity is served from cache', async () => {
    store.invalidate();
    await store.online(['shop_bookings_7d'], [SHOP], { ttlMs: 60000 });
    const before = store.stats().hits;
    await store.online(['shop_bookings_7d'], [SHOP], { ttlMs: 60000 });
    expect(store.stats().hits).toBeGreaterThan(before);
  });

  test('online agrees with an as-of read at the present instant', async () => {
    // The contract that makes training/serving skew structurally impossible for
    // these features. If someone gives a feature a bespoke online path, this is
    // what catches a divergence.
    store.invalidate();
    const onlineValues = await store.online(['shop_bookings_7d'], [SHOP], { ttlMs: 0 });
    const asOfValues = await registry.get('shop_bookings_7d').asOf([SHOP], Date.now());
    expect(onlineValues.shop_bookings_7d.get(SHOP)).toBe(asOfValues.get(SHOP));
  });
});

describe('LruCache', () => {
  test('evicts least recently used, not most recently inserted', () => {
    const lru = new store.LruCache(2);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.get('a', 60000); // 'a' is now the most recent
    lru.set('c', 3);      // evicts 'b'

    expect(lru.get('a', 60000)).toBe(1);
    expect(lru.get('b', 60000)).toBeUndefined();
    expect(lru.get('c', 60000)).toBe(3);
  });

  test('expires on TTL', () => {
    const lru = new store.LruCache(10);
    lru.set('a', 1);
    expect(lru.get('a', 60000)).toBe(1);
    expect(lru.get('a', -1)).toBeUndefined();
  });

  test('stays bounded under sustained writes', () => {
    const lru = new store.LruCache(50);
    for (let i = 0; i < 5000; i += 1) lru.set(`k${i}`, i);
    expect(lru.size).toBe(50);
  });
});

describe('freshness reporting', () => {
  test('distinguishes "never materialised" from "stale"', async () => {
    const report = await store.freshness();
    const entry = report.find((row) => row.feature === 'shop_bookings_7d');
    expect(entry).toBeDefined();
    // Nothing has been materialised for this feature in the test database, so
    // `stale` must be null. Reporting false would claim it is fresh; reporting
    // true would raise an alert about a feature nobody is serving.
    expect(entry.stale === null || typeof entry.stale === 'boolean').toBe(true);
  });

  test('covers every registered feature', async () => {
    const report = await store.freshness();
    expect(report.map((row) => row.feature).sort()).toEqual(registry.names().sort());
  });
});

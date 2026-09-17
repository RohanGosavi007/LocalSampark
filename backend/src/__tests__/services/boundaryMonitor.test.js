/**
 * Boundary crossing detection, and why it is mostly about *not* firing.
 *
 * The naive implementation — resolve every ping, emit on every change — is
 * unusable: consumer GPS wanders tens of metres while a phone sits still, so a
 * rider parked on a boundary flips state every few seconds. The result is an
 * alert storm, and an alert storm is indistinguishable from no alerting at all
 * once people start ignoring it.
 *
 * So most of these tests assert that nothing happens. The one that asserts an
 * alert does fire is the easy case; the valuable ones are the jitter, the
 * corner-cut, the cooldown and the spoofed fix.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const { query, queryOne } = require('../../config/database');
const monitor = require('../../services/boundaryMonitor.service');

const TERRITORY = 'bm-territory';
const RIDER = 'bm-rider';

/** A square over central Pune. Roughly 6.3 km x 6.7 km. */
const SQUARE = {
  type: 'Polygon',
  coordinates: [[
    [73.84, 18.50],
    [73.90, 18.50],
    [73.90, 18.56],
    [73.84, 18.56],
    [73.84, 18.50],
  ]],
};

/** Comfortably inside. */
const INSIDE = { lat: 18.53, lng: 73.87 };

/** ~1.1 km east of the eastern edge — unambiguously outside. */
const FAR_OUTSIDE = { lat: 18.53, lng: 73.91 };

/** ~50 m outside the eastern edge: inside the buffer band, where jitter lives. */
const JUST_OUTSIDE = { lat: 18.53, lng: 73.90047 };

let talukaId;

beforeAll(async () => {
  await query("DELETE FROM territories WHERE id LIKE 'bm-%'");
  await query("DELETE FROM location_talukas WHERE id LIKE 'bm-%'");
  await query("DELETE FROM location_districts WHERE id LIKE 'bm-%'");
  await query("DELETE FROM location_states WHERE id LIKE 'bm-%'");

  const existing = await queryOne('SELECT id FROM location_talukas LIMIT 1');
  if (existing) {
    talukaId = existing.id;
  } else {
    talukaId = 'bm-taluka';
    await query('INSERT INTO location_states (id, name, code) VALUES ($1, $2, $3)',
      ['bm-state', 'BM State', 'BMS']);
    await query('INSERT INTO location_districts (id, state_id, name) VALUES ($1, $2, $3)',
      ['bm-district', 'bm-state', 'BM District']);
    await query('INSERT INTO location_talukas (id, district_id, name) VALUES ($1, $2, $3)',
      [talukaId, 'bm-district', 'BM Taluka']);
  }

  // A VERIFIED boundary. The monitor refuses to evaluate quarantined ones, so
  // without this flag every test here would correctly report "cannot tell".
  await query(
    `INSERT INTO territories
       (id, taluka_id, name, pincode, centroid_lat, centroid_lng, boundary_geojson,
        is_active, boundary_verified)
     VALUES ($1, $2, 'BM Territory', '415001', 18.53, 73.87, $3, 1, 1)`,
    [TERRITORY, talukaId, JSON.stringify(SQUARE)]
  );
});

afterAll(async () => {
  await query("DELETE FROM territories WHERE id LIKE 'bm-%'");
  await query("DELETE FROM location_talukas WHERE id LIKE 'bm-%'");
  await query("DELETE FROM location_districts WHERE id LIKE 'bm-%'");
  await query("DELETE FROM location_states WHERE id LIKE 'bm-%'");
});

beforeEach(() => {
  monitor.reset();
});

const ping = (point, overrides = {}) => monitor.observe({
  riderId: RIDER,
  assignedTerritoryId: TERRITORY,
  lat: point.lat,
  lng: point.lng,
  ...overrides,
});

describe('geometry', () => {
  test('recognises a point inside the territory', async () => {
    const verdict = await monitor.outsideAssigned(TERRITORY, INSIDE.lat, INSIDE.lng);
    expect(verdict.outside).toBe(false);
  });

  test('recognises a point well outside it', async () => {
    const verdict = await monitor.outsideAssigned(TERRITORY, FAR_OUTSIDE.lat, FAR_OUTSIDE.lng);
    expect(verdict.outside).toBe(true);
    expect(verdict.marginMetres).toBeGreaterThan(monitor.EXIT_BUFFER_METRES);
  });

  test('a point just outside is not yet "outside"', async () => {
    // Inside the buffer band. This is the single most important behaviour here:
    // it is where a stationary phone's GPS noise puts a rider standing on the
    // boundary.
    const verdict = await monitor.outsideAssigned(TERRITORY, JUST_OUTSIDE.lat, JUST_OUTSIDE.lng);
    expect(verdict.outside).toBe(false);
  });

  test('an unverified boundary yields no verdict at all', async () => {
    // Accusing a rider of leaving a zone whose shape is one of the fabricated
    // circles would be an alert generated entirely by missing data.
    const unverified = 'bm-territory-unverified';
    await query(
      `INSERT INTO territories
         (id, taluka_id, name, pincode, centroid_lat, centroid_lng, boundary_geojson,
          is_active, boundary_verified)
       VALUES ($1, $2, 'BM Unverified', '415002', 18.53, 73.87, $3, 1, 0)`,
      [unverified, talukaId, JSON.stringify(SQUARE)]
    );

    try {
      const verdict = await monitor.outsideAssigned(unverified, FAR_OUTSIDE.lat, FAR_OUTSIDE.lng);
      expect(verdict.outside).toBeNull();
    } finally {
      await query('DELETE FROM territories WHERE id = $1', [unverified]);
    }
  });
});

describe('hysteresis', () => {
  test('a single ping outside does not alert', async () => {
    // One wild fix is not a departure.
    expect(await ping(FAR_OUTSIDE)).toBeNull();
  });

  test('an alert fires only after the dwell time has elapsed', async () => {
    const t0 = 1_700_000_000_000;

    expect(await ping(FAR_OUTSIDE, { now: t0 })).toBeNull();
    // Still inside the dwell window.
    expect(await ping(FAR_OUTSIDE, { now: t0 + monitor.MIN_DWELL_MS - 1000 })).toBeNull();

    const event = await ping(FAR_OUTSIDE, { now: t0 + monitor.MIN_DWELL_MS + 1000 });
    expect(event).not.toBeNull();
    expect(event.type).toBe('BOUNDARY_EXIT');
    expect(event.rider_id).toBe(RIDER);
    expect(event.metres_outside).toBeGreaterThan(monitor.EXIT_BUFFER_METRES);
  });

  test('jitter on the boundary never alerts, however long it goes on', async () => {
    // The scenario that makes the naive version useless: a rider parked at the
    // edge while GPS wanders either side of the line for ten minutes.
    let t = 1_700_000_000_000;
    const events = [];

    for (let i = 0; i < 120; i++) {
      const point = i % 2 === 0 ? JUST_OUTSIDE : INSIDE;
      const event = await ping(point, { now: t });
      if (event) events.push(event);
      t += 5000;
    }

    expect(events).toHaveLength(0);
  });

  test('cutting a corner does not count as leaving', async () => {
    const t0 = 1_700_000_000_000;

    // Briefly well outside, then back — the shape of a rider taking a shortcut
    // across a corner of the zone.
    expect(await ping(FAR_OUTSIDE, { now: t0 })).toBeNull();
    expect(await ping(FAR_OUTSIDE, { now: t0 + 30_000 })).toBeNull();
    expect(await ping(INSIDE, { now: t0 + 45_000 })).toBeNull();

    // And the state has genuinely reset: a later brief excursion is also quiet.
    expect(await ping(FAR_OUTSIDE, { now: t0 + 60_000 })).toBeNull();
  });

  test('one alert per cooldown, not one per ping', async () => {
    let t = 1_700_000_000_000;
    const events = [];

    // Twenty minutes of continuous pings from well outside the zone.
    for (let i = 0; i < 240; i++) {
      const event = await ping(FAR_OUTSIDE, { now: t });
      if (event) events.push(event);
      t += 5000;
    }

    // Twenty minutes at a ten-minute cooldown is two alerts, not 240.
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.length).toBeLessThanOrEqual(2);
  });

  test('a return is announced only when the departure was', async () => {
    const t0 = 1_700_000_000_000;

    await ping(FAR_OUTSIDE, { now: t0 });
    const exit = await ping(FAR_OUTSIDE, { now: t0 + monitor.MIN_DWELL_MS + 1000 });
    expect(exit.type).toBe('BOUNDARY_EXIT');

    const ret = await ping(INSIDE, { now: t0 + monitor.MIN_DWELL_MS + 30_000 });
    expect(ret.type).toBe('BOUNDARY_RETURN');
  });

  test('a return with no announced departure is silent', async () => {
    // Otherwise the dashboard shows re-entries for exits nobody was told about.
    expect(await ping(INSIDE)).toBeNull();
  });
});

describe('spoofed fixes', () => {
  test('a mocked fix never raises an alert', async () => {
    let t = 1_700_000_000_000;
    for (let i = 0; i < 60; i++) {
      expect(await ping(FAR_OUTSIDE, { now: t, mocked: true })).toBeNull();
      t += 5000;
    }
  });

  test('a mocked fix cannot clear a real departure', async () => {
    // The attack this closes: if a spoofed "I am inside" reset the state, the
    // documented way to silence a zone-exit alert would be to switch on a GPS
    // spoofer. The anti-fraud signal would become a fraud instruction.
    const t0 = 1_700_000_000_000;

    await ping(FAR_OUTSIDE, { now: t0 });
    // A spoofed fix claiming to be back inside, mid-dwell.
    expect(await ping(INSIDE, { now: t0 + 30_000, mocked: true })).toBeNull();

    // The genuine departure still completes.
    const event = await ping(FAR_OUTSIDE, { now: t0 + monitor.MIN_DWELL_MS + 1000 });
    expect(event).not.toBeNull();
    expect(event.type).toBe('BOUNDARY_EXIT');
  });
});

describe('input handling', () => {
  test('ignores a ping with no usable coordinates', async () => {
    expect(await monitor.observe({ riderId: RIDER, assignedTerritoryId: TERRITORY, lat: NaN, lng: 73.8 })).toBeNull();
    expect(await monitor.observe({ riderId: RIDER, assignedTerritoryId: TERRITORY, lat: null, lng: null })).toBeNull();
  });

  test('ignores a rider with no assigned territory', async () => {
    expect(await monitor.observe({ riderId: RIDER, assignedTerritoryId: null, lat: 18.53, lng: 73.87 })).toBeNull();
  });

  test('a database failure does not raise a spurious alert', async () => {
    // Unknown is not "outside". This asks about a territory that does not
    // exist, which is the same shape as a lookup that failed.
    const event = await monitor.observe({
      riderId: RIDER,
      assignedTerritoryId: `bm-missing-${crypto.randomUUID()}`,
      lat: FAR_OUTSIDE.lat,
      lng: FAR_OUTSIDE.lng,
    });
    expect(event).toBeNull();
  });

  test('riders are tracked independently', async () => {
    const t0 = 1_700_000_000_000;

    await monitor.observe({ riderId: 'rider-a', assignedTerritoryId: TERRITORY, ...FAR_OUTSIDE, now: t0 });
    // A second rider's first ping must not inherit the first's dwell clock.
    const event = await monitor.observe({
      riderId: 'rider-b', assignedTerritoryId: TERRITORY, ...FAR_OUTSIDE, now: t0 + monitor.MIN_DWELL_MS + 1000,
    });
    expect(event).toBeNull();
  });
});

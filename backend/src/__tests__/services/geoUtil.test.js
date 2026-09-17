/**
 * The shared geodesic helpers.
 *
 * This file replaced eight separate copies of the haversine formula. The
 * formulas agreed; the guards did not, and the guard is what these tests are
 * mostly about — a distance function that is right for every input except the
 * ones nobody tried is the failure mode duplication produces.
 */

const geo = require('../../utils/geo');

describe('distanceKm', () => {
  test('measures a known long distance to within a kilometre', () => {
    // Pune to Mumbai, ~120 km. A real pair rather than synthetic points, so a
    // unit or radius mistake shows up as an obviously wrong number.
    const d = geo.distanceKm(18.5204, 73.8567, 19.076, 72.8777);
    expect(d).toBeGreaterThan(118);
    expect(d).toBeLessThan(122);
  });

  test('measures a short distance accurately', () => {
    // ~111 m of latitude at the equator's scale: 0.001°.
    const d = geo.distanceKm(18.5204, 73.8567, 18.5214, 73.8567);
    expect(d * 1000).toBeGreaterThan(105);
    expect(d * 1000).toBeLessThan(118);
  });

  test('is zero for a point against itself', () => {
    expect(geo.distanceKm(18.52, 73.85, 18.52, 73.85)).toBe(0);
  });

  test('is symmetric', () => {
    const ab = geo.distanceKm(18.52, 73.85, 19.07, 72.87);
    const ba = geo.distanceKm(19.07, 72.87, 18.52, 73.85);
    expect(ab).toBeCloseTo(ba, 9);
  });

  test('treats a coordinate of exactly zero as a location, not as missing', () => {
    // The bug in the copy this replaced: `if (!lat1 || !lon1) return Infinity`.
    // A shop at longitude 0 became infinitely far from everything and silently
    // dropped out of every proximity search.
    expect(geo.distanceKm(0, 0, 0, 1)).toBeGreaterThan(110);
    expect(geo.distanceKm(0, 0, 0, 1)).toBeLessThan(112);
    expect(geo.distanceKm(0, 0, 0, 0)).toBe(0);
  });

  test('returns Infinity for an absent coordinate, so bad rows sort last', () => {
    expect(geo.distanceKm(null, 73.85, 18.52, 73.85)).toBe(Infinity);
    expect(geo.distanceKm(18.52, undefined, 18.52, 73.85)).toBe(Infinity);
    expect(geo.distanceKm(18.52, '', 18.52, 73.85)).toBe(Infinity);
    expect(geo.distanceKm(18.52, 'abc', 18.52, 73.85)).toBe(Infinity);
  });

  test('accepts numeric strings, as database drivers hand them back', () => {
    expect(geo.distanceKm('18.52', '73.85', '18.52', '73.85')).toBe(0);
  });
});

describe('boundingBox', () => {
  test('contains every point inside the radius', () => {
    const box = geo.boundingBox(18.52, 73.85, 5);

    // A point 4 km due north must be inside the envelope, or the pre-filter
    // discards results the exact measure would have kept.
    const north = 18.52 + 4 / 111.32;
    expect(north).toBeGreaterThan(box.minLat);
    expect(north).toBeLessThan(box.maxLat);
  });

  test('widens the longitude span with latitude', () => {
    // Longitude degrees shrink towards the poles. A box that ignores this is
    // too narrow and drops real results — the usual hand-rolled mistake.
    const equator = geo.boundingBox(0, 73.85, 5);
    const north = geo.boundingBox(60, 73.85, 5);

    const equatorSpan = equator.maxLng - equator.minLng;
    const northSpan = north.maxLng - north.minLng;

    expect(northSpan).toBeGreaterThan(equatorSpan * 1.9);
  });

  test('does not explode at the pole', () => {
    const box = geo.boundingBox(90, 0, 5);
    expect(Number.isFinite(box.minLng)).toBe(true);
    expect(Number.isFinite(box.maxLng)).toBe(true);
  });

  test('is a superset of the circle, never a subset', () => {
    // The box admits corner points further than the radius; that is expected
    // and why callers must still measure exactly. What must never happen is the
    // reverse — a point within the radius falling outside the box.
    const [lat, lng, r] = [18.52, 73.85, 3];
    const box = geo.boundingBox(lat, lng, r);

    for (let bearing = 0; bearing < 360; bearing += 15) {
      const rad = (bearing * Math.PI) / 180;
      const dLat = (r * Math.cos(rad)) / 111.32;
      const dLng = (r * Math.sin(rad)) / (111.32 * Math.cos((lat * Math.PI) / 180));
      const pLat = lat + dLat;
      const pLng = lng + dLng;

      expect(pLat).toBeGreaterThanOrEqual(box.minLat - 1e-9);
      expect(pLat).toBeLessThanOrEqual(box.maxLat + 1e-9);
      expect(pLng).toBeGreaterThanOrEqual(box.minLng - 1e-9);
      expect(pLng).toBeLessThanOrEqual(box.maxLng + 1e-9);
    }
  });
});

describe('isWithinMetres', () => {
  test('answers the 50 m boundary question', () => {
    const a = { lat: 18.5204, lng: 73.8567 };
    // ~33 m north.
    const near = { lat: 18.5207, lng: 73.8567 };
    // ~333 m north.
    const far = { lat: 18.5234, lng: 73.8567 };

    expect(geo.isWithinMetres(a.lat, a.lng, near.lat, near.lng, 50)).toBe(true);
    expect(geo.isWithinMetres(a.lat, a.lng, far.lat, far.lng, 50)).toBe(false);
  });

  test('an unusable coordinate is not "within" anything', () => {
    expect(geo.isWithinMetres(null, 73.85, 18.52, 73.85, 1000000)).toBe(false);
  });
});

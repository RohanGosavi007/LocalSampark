/**
 * Topological integrity of drawn boundaries.
 *
 * The module under test is shared: the admin portal runs it in the browser so
 * an operator sees a problem while drawing, and the server runs it on save
 * because a browser is not an authority. Testing it here, in the backend suite,
 * tests the same code both of them execute.
 *
 * What these guard against, in order of how expensive the mistake is:
 *
 *  - **Overlap.** Two franchises claiming the same ground is double commission
 *    on every order in the overlap, and nothing errors.
 *  - **Micro-gaps.** A sliver between two boundaries is a black hole where no
 *    franchise is assigned; orders inside it resolve to nothing, and nobody
 *    notices because there is no failure to see. Snapping exists for this.
 *  - **Self-intersection.** A figure eight has no coherent interior, so
 *    point-in-polygon on it is undefined rather than merely wrong.
 *  - **A shared edge read as a collision.** The false positive that would make
 *    every correctly-drawn neighbouring boundary look like a conflict, and
 *    train operators to ignore the warning.
 */

const topo = require('@localsampark/shared/territoryTopology');

/** A square over central Pune, in GeoJSON [lng, lat] order. */
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

/** Shares SQUARE's eastern edge exactly. Adjacent, not overlapping. */
const ADJACENT = {
  type: 'Polygon',
  coordinates: [[
    [73.90, 18.50],
    [73.96, 18.50],
    [73.96, 18.56],
    [73.90, 18.56],
    [73.90, 18.50],
  ]],
};

/** Overlaps SQUARE by half. */
const OVERLAPPING = {
  type: 'Polygon',
  coordinates: [[
    [73.87, 18.50],
    [73.93, 18.50],
    [73.93, 18.56],
    [73.87, 18.56],
    [73.87, 18.50],
  ]],
};

const existing = [
  { id: 't-square', name: 'Square', pincode: '411001', geojson: SQUARE },
];

describe('shape validation', () => {
  test('accepts a well-formed square', () => {
    const result = topo.validateShape(SQUARE);
    expect(result.valid).toBe(true);
    expect(result.areaKm2).toBeGreaterThan(0);
  });

  test('rejects a self-intersecting ring and says where it crosses', () => {
    // A bow tie: the classic figure eight. turf will happily answer
    // point-in-polygon on this, and the answer depends on the winding rule.
    const bowtie = {
      type: 'Polygon',
      coordinates: [[
        [73.84, 18.50],
        [73.90, 18.56],
        [73.90, 18.50],
        [73.84, 18.56],
        [73.84, 18.50],
      ]],
    };

    const result = topo.validateShape(bowtie);
    expect(result.valid).toBe(false);

    const error = result.errors.find((e) => e.code === 'self_intersecting');
    expect(error).toBeDefined();
    // An operator told only "invalid" has to redraw the whole thing.
    expect(error.at.length).toBeGreaterThan(0);
  });

  test('rejects an unclosed ring rather than silently closing it', () => {
    // Most libraries close it for you, which makes the stored geometry differ
    // from the drawn one with nobody the wiser.
    const open = {
      type: 'Polygon',
      coordinates: [[
        [73.84, 18.50],
        [73.90, 18.50],
        [73.90, 18.56],
        [73.84, 18.56],
      ]],
    };

    const result = topo.validateShape(open);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'unclosed_ring')).toBe(true);
  });

  test('rejects a zero-area ring of collinear points', () => {
    const line = {
      type: 'Polygon',
      coordinates: [[
        [73.84, 18.50],
        [73.86, 18.50],
        [73.88, 18.50],
        [73.84, 18.50],
      ]],
    };

    const result = topo.validateShape(line);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'zero_area')).toBe(true);
  });

  test('rejects a ring with too few corners', () => {
    const sliver = { type: 'Polygon', coordinates: [[[73.84, 18.50], [73.84, 18.50]]] };
    const result = topo.validateShape(sliver);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'too_few_points')).toBe(true);
  });

  test('rejects unparseable input rather than throwing', () => {
    for (const bad of [null, undefined, 'not json', {}, { type: 'Point', coordinates: [1, 2] }]) {
      const result = topo.validateShape(bad);
      expect(result.valid).toBe(false);
    }
  });

  test('accepts a Feature wrapper and a raw ring array, as exports produce', () => {
    expect(topo.validateShape({ type: 'Feature', geometry: SQUARE, properties: {} }).valid).toBe(true);
    expect(topo.validateShape(SQUARE.coordinates).valid).toBe(true);
    expect(topo.validateShape(JSON.stringify(SQUARE)).valid).toBe(true);
  });
});

describe('overlap detection', () => {
  test('a territory sharing an edge is not a conflict', () => {
    // The false positive that matters most: adjacent territories are supposed
    // to touch. Flagging them trains operators to ignore the warning.
    expect(topo.findOverlaps(ADJACENT, existing)).toHaveLength(0);
  });

  test('a genuine overlap is reported with its area quantified', () => {
    const conflicts = topo.findOverlaps(OVERLAPPING, existing);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].territory_id).toBe('t-square');
    expect(conflicts[0].code).toBe('overlap');
    // Half of a ~0.06° x 0.06° box over Pune — tens of square kilometres.
    expect(conflicts[0].overlap_km2).toBeGreaterThan(10);
  });

  test('a territory can be edited without colliding with itself', () => {
    const conflicts = topo.findOverlaps(SQUARE, existing, { excludeId: 't-square' });
    expect(conflicts).toHaveLength(0);
  });

  test('an unreadable existing geometry is reported, not skipped', () => {
    // Skipping it would let the validator promise no overlap against a
    // territory it could not read.
    const broken = [{ id: 't-broken', name: 'Broken', geojson: 'garbage' }];
    const conflicts = topo.findOverlaps(SQUARE, broken);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].code).toBe('unreadable_geometry');
  });

  test('validateBoundary combines shape and collision checks', () => {
    const invalidShape = topo.validateBoundary({ type: 'Polygon', coordinates: [[[0, 0], [0, 0]]] }, existing);
    expect(invalidShape.valid).toBe(false);

    const collides = topo.validateBoundary(OVERLAPPING, existing);
    expect(collides.valid).toBe(false);
    expect(collides.conflicts).toHaveLength(1);

    const fine = topo.validateBoundary(ADJACENT, existing);
    expect(fine.valid).toBe(true);
  });
});

describe('snapping', () => {
  test('pulls a near-miss corner onto an existing vertex', () => {
    // ~10 m short of the square's north-east corner: by eye it looks aligned,
    // and it leaves a sliver where no franchise is assigned.
    const nearMiss = { lng: 73.90009, lat: 18.55993 };

    const snapped = topo.snapPoint(nearMiss, existing, { toleranceMetres: 25 });

    expect(snapped.snapped).toBe(true);
    expect(snapped.to.kind).toBe('vertex');
    expect(snapped.lng).toBe(73.90);
    expect(snapped.lat).toBe(18.56);
  });

  test('falls back to the nearest point on an edge when no vertex is close', () => {
    // Mid-way along the eastern edge, 10 m off it. No corner is nearby, but the
    // edge is, and landing exactly on it still closes the gap.
    const offEdge = { lng: 73.90009, lat: 18.53 };

    const snapped = topo.snapPoint(offEdge, existing, { toleranceMetres: 25 });

    expect(snapped.snapped).toBe(true);
    expect(snapped.to.kind).toBe('edge');
    expect(snapped.lng).toBeCloseTo(73.90, 5);
  });

  test('prefers a vertex over an edge when both are in range', () => {
    // Snapping corner to corner is what actually makes two boundaries share
    // geometry; landing on the edge leaves the neighbour's corner unmatched.
    const nearCorner = { lng: 73.9001, lat: 18.5599 };
    const snapped = topo.snapPoint(nearCorner, existing, { toleranceMetres: 50 });
    expect(snapped.to.kind).toBe('vertex');
  });

  test('leaves a point alone when nothing is within tolerance', () => {
    const far = { lng: 74.50, lat: 19.20 };
    const result = topo.snapPoint(far, existing, { toleranceMetres: 25 });

    expect(result.snapped).toBe(false);
    // Returned unchanged, so a caller can use the result unconditionally.
    expect(result.lng).toBe(74.50);
    expect(result.lat).toBe(19.20);
  });

  test('ignores the territory being edited', () => {
    const nearOwnCorner = { lng: 73.90009, lat: 18.55993 };
    const result = topo.snapPoint(nearOwnCorner, existing, { toleranceMetres: 25, excludeId: 't-square' });
    expect(result.snapped).toBe(false);
  });

  test('snapping a near-miss ring removes the gap entirely', () => {
    // The end-to-end point of snapping: a hand-drawn neighbour that misses by a
    // few metres becomes one that shares the edge exactly, so validation stops
    // seeing either a gap or an overlap.
    const handDrawn = [
      [73.90008, 18.50002],
      [73.96, 18.50],
      [73.96, 18.56],
      [73.90011, 18.55994],
      [73.90008, 18.50002],
    ];

    const snapped = topo.snapRing(handDrawn, existing, { toleranceMetres: 25 });

    expect(snapped[0]).toEqual([73.90, 18.50]);
    expect(snapped[3]).toEqual([73.90, 18.56]);

    const result = topo.validateBoundary({ type: 'Polygon', coordinates: [snapped] }, existing);
    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  test('a malformed point is returned unchanged rather than throwing', () => {
    const result = topo.snapPoint({ lng: NaN, lat: 18.5 }, existing);
    expect(result.snapped).toBe(false);
  });
});

describe('ring helpers', () => {
  test('closeRing closes an open ring and leaves a closed one alone', () => {
    const open = [[73.84, 18.50], [73.90, 18.50], [73.90, 18.56]];
    const closed = topo.closeRing(open);

    expect(closed).toHaveLength(4);
    expect(closed[3]).toEqual(closed[0]);
    expect(topo.closeRing(closed)).toHaveLength(4);
  });

  test('isClosed recognises a genuinely closed ring', () => {
    expect(topo.isClosed(SQUARE.coordinates[0])).toBe(true);
    expect(topo.isClosed([[0, 0], [1, 0], [1, 1]])).toBe(false);
  });
});

describe('agreement with the server implementation', () => {
  /**
   * The admin runs the shared module in the browser; the server runs its own
   * validateNoOverlap on save. Both are kept because the browser is not an
   * authority and the server should not depend on one — but if they disagree,
   * an operator is told a boundary is fine and then refused on save, with no
   * explanation matching what they saw.
   *
   * This pins the verdicts together on the cases that matter. It compares the
   * boolean outcome rather than the wording, because the two deliberately
   * phrase their reasons differently.
   */
  const spatial = require('../../repositories/spatial.repository');

  const cases = [
    ['a valid square', SQUARE, true],
    ['an edge-sharing neighbour', ADJACENT, true],
    ['a self-intersecting bow tie', {
      type: 'Polygon',
      coordinates: [[
        [73.84, 18.50], [73.90, 18.56], [73.90, 18.50], [73.84, 18.56], [73.84, 18.50],
      ]],
    }, false],
    ['a zero-area line', {
      type: 'Polygon',
      coordinates: [[[73.84, 18.50], [73.86, 18.50], [73.88, 18.50], [73.84, 18.50]]],
    }, false],
  ];

  test.each(cases)('%s: both implementations agree on the shape', (_name, geometry, expected) => {
    // The shared module's own verdict on shape alone.
    expect(topo.validateShape(geometry).valid).toBe(expected);

    // The server's building blocks, reached directly so this does not need a
    // database: the same parse, the same kinks check, the same area floor.
    const parsed = spatial.parseBoundary(geometry);
    const serverValid = Boolean(parsed)
      && require('@turf/turf').kinks(parsed).features.length === 0
      && require('@turf/turf').area(parsed) / 1e6 > 0;

    expect(serverValid).toBe(expected);
  });

  test('both use the same shared-edge tolerance', () => {
    // If these drift, an edge-sharing neighbour becomes a conflict in one place
    // and not the other — the exact false positive that trains operators to
    // ignore the warning.
    const repoSource = require('fs').readFileSync(
      require('path').join(__dirname, '../../repositories/spatial.repository.js'),
      'utf8'
    );
    expect(repoSource).toContain('1e-6');
    expect(topo.OVERLAP_TOLERANCE_KM2).toBe(1e-6);
  });
});

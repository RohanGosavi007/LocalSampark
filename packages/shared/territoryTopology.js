/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Territory topology — validation and snapping, shared by admin and server
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This lives in the shared package rather than in either app because both need
 * the same answers and they must not be able to disagree. The admin portal runs
 * it in the browser so an operator sees a self-intersection or a collision
 * while they are still drawing; the server runs it on save because the browser
 * is not an authority on anything. Two implementations of "is this polygon
 * valid" drift, and when they drift the operator is told a boundary is fine and
 * then refused on save, with no explanation that matches what they saw.
 *
 * ── What counts as invalid ─────────────────────────────────────────────────
 *
 * A **self-intersecting** ring — a figure eight — has no coherent interior, so
 * point-in-polygon on it is undefined rather than wrong: turf will answer, and
 * the answer depends on the winding rule, which is not something franchise
 * attribution should rest on.
 *
 * An **unclosed ring** is not GeoJSON. Most libraries quietly close it for you,
 * which means the stored geometry differs from the drawn one and nobody knows.
 *
 * A **zero-area** ring — three collinear points, or a doubled vertex — draws as
 * a line and contains nothing, so the territory silently matches no one.
 *
 * An **overlap with an active territory** is the expensive one: two franchises
 * claiming the same ground is double commission on every order in the overlap.
 * Note that sharing an edge is not an overlap — adjacent territories are
 * supposed to touch, and floating-point noise on a shared boundary produces
 * slivers of area around 1e-12 km² that must not be reported as conflicts.
 *
 * ── Snapping ───────────────────────────────────────────────────────────────
 *
 * Drawing a boundary next to an existing one by eye leaves either a sliver of
 * overlap or a sliver of gap. The gap is worse: it is a black hole where no
 * franchise is assigned, nobody notices because nothing errors, and orders from
 * inside it resolve to nothing. `snapPoint` pulls a vertex onto a nearby
 * existing vertex or edge so the two boundaries share geometry exactly.
 */

const turf = require('@turf/turf');

/** Shared-edge tolerance, km². Matches the backend repository's constant. */
const OVERLAP_TOLERANCE_KM2 = 1e-6;

/** Default snapping radius in metres. About a building's width. */
const DEFAULT_SNAP_METRES = 25;

/**
 * Coerces whatever shape a boundary arrives in into a turf geometry.
 *
 * Accepts a Feature, a bare geometry, or a raw coordinate array, because the
 * three arrive from the map, the database and GIS exports respectively.
 * Returns null rather than throwing: an unparseable boundary is a validation
 * result, not an exception.
 */
function toGeometry(input) {
  if (!input) return null;

  try {
    if (typeof input === 'string') return toGeometry(JSON.parse(input));

    if (input.type === 'Feature') return toGeometry(input.geometry);

    if (input.type === 'Polygon') return turf.polygon(input.coordinates);
    if (input.type === 'MultiPolygon') return turf.multiPolygon(input.coordinates);

    if (Array.isArray(input)) return turf.polygon(input);
    if (Array.isArray(input.coordinates)) return turf.polygon(input.coordinates);

    return null;
  } catch {
    return null;
  }
}

/**
 * The raw rings of an input, without building a turf geometry first.
 *
 * turf.polygon() throws on a ring that is unclosed or has too few positions —
 * exactly the two problems most worth naming precisely. Going through turf
 * first collapses both into "unparseable", which tells an operator nothing
 * about what to fix, so the structural checks read the coordinates directly.
 */
function rawRings(input) {
  if (!input) return null;
  try {
    if (typeof input === 'string') return rawRings(JSON.parse(input));
    if (input.type === 'Feature') return rawRings(input.geometry);
    if (input.type === 'Polygon') return input.coordinates;
    if (input.type === 'MultiPolygon') return input.coordinates.flat();
    if (Array.isArray(input) && Array.isArray(input[0]) && Array.isArray(input[0][0])) return input;
    if (Array.isArray(input && input.coordinates)) return input.coordinates;
    return null;
  } catch {
    return null;
  }
}

/** Every linear ring in a polygon or multipolygon, as coordinate arrays. */
function ringsOf(geometry) {
  const geom = geometry.geometry || geometry;
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
  return [];
}

/** Whether a ring's first and last positions are the same point. */
function isClosed(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

/**
 * Closes a ring if the caller left it open.
 *
 * Used when building geometry from a drawing, where the operator places
 * vertices and never explicitly closes the loop.
 */
function closeRing(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return ring;
  return isClosed(ring) ? ring : [...ring, ring[0]];
}

/**
 * Whether a ring crosses itself.
 *
 * turf.kinks reports self-intersection points. A closed ring's start and end
 * coincide, which is not a kink — turf already accounts for that, so any kink
 * reported here is a genuine crossing.
 */
function selfIntersections(geometry) {
  try {
    const kinks = turf.kinks(geometry);
    return kinks.features.map((f) => ({
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));
  } catch {
    return [];
  }
}

/**
 * Validates a boundary's own shape, ignoring other territories.
 *
 * Returns `{ valid, errors[] }`, where each error names the problem and, where
 * it can, where it is — an operator who is told "this polygon is invalid" and
 * not where has to redraw the whole thing.
 */
function validateShape(input) {
  const errors = [];

  // Structure first, from the raw coordinates. turf refuses to build a polygon
  // from an unclosed or too-short ring, so asking turf first would lose the
  // ability to say which of the two is wrong.
  const rings = rawRings(input);
  if (!rings) {
    return { valid: false, errors: [{ code: 'unparseable', message: 'This is not a valid GeoJSON polygon.' }] };
  }

  if (rings.length === 0) {
    return { valid: false, errors: [{ code: 'no_rings', message: 'The boundary has no rings.' }] };
  }

  for (const ring of rings) {
    // A closed triangle is four positions: three corners plus the repeat.
    if (!Array.isArray(ring) || ring.length < 4) {
      errors.push({
        code: 'too_few_points',
        message: 'A boundary needs at least three distinct corners.',
      });
      continue;
    }

    if (!isClosed(ring)) {
      errors.push({
        code: 'unclosed_ring',
        message: 'The boundary does not close — its last corner must repeat its first.',
      });
    }
  }

  // Anything structural already found means turf cannot build the geometry, so
  // the geometric checks below have nothing to run on. Report what is known.
  const geometry = errors.length === 0 ? toGeometry(input) : null;
  if (!geometry) {
    if (errors.length === 0) {
      errors.push({ code: 'unparseable', message: 'This is not a valid GeoJSON polygon.' });
    }
    return { valid: false, errors, areaKm2: 0 };
  }

  const kinks = selfIntersections(geometry);
  if (kinks.length > 0) {
    errors.push({
      code: 'self_intersecting',
      message: 'The boundary crosses itself, so it has no clear inside.',
      at: kinks,
    });
  }

  let areaKm2 = 0;
  try {
    areaKm2 = turf.area(geometry) / 1e6;
  } catch {
    areaKm2 = 0;
  }

  if (areaKm2 <= OVERLAP_TOLERANCE_KM2) {
    errors.push({
      code: 'zero_area',
      message: 'The boundary encloses no area — its corners are in a line or on top of each other.',
    });
  }

  return { valid: errors.length === 0, errors, areaKm2 };
}

/**
 * Finds overlaps between a candidate boundary and existing territories.
 *
 * `existing` is a list of `{ id, name, pincode, geojson }`. An entry whose
 * geometry will not parse is reported rather than skipped: a territory the
 * validator cannot read is a territory it cannot promise you do not overlap.
 */
function findOverlaps(input, existing = [], { excludeId = null } = {}) {
  const candidate = toGeometry(input);
  if (!candidate) return [];

  const conflicts = [];

  for (const territory of existing) {
    if (!territory) continue;
    if (excludeId && String(territory.id) === String(excludeId)) continue;

    const other = toGeometry(territory.geojson || territory.boundary_geojson);
    if (!other) {
      conflicts.push({
        territory_id: territory.id,
        name: territory.name,
        pincode: territory.pincode,
        code: 'unreadable_geometry',
        overlap_km2: null,
      });
      continue;
    }

    try {
      const intersection = turf.intersect(turf.featureCollection([candidate, other]));
      if (!intersection) continue;

      const overlapKm2 = turf.area(intersection) / 1e6;

      // Adjacent territories share an edge, and a shared edge intersects in a
      // sliver whose area is floating-point noise rather than exactly zero.
      // Reporting those as conflicts would make every correctly-drawn
      // neighbouring boundary look like a collision.
      if (overlapKm2 <= OVERLAP_TOLERANCE_KM2) continue;

      conflicts.push({
        territory_id: territory.id,
        name: territory.name,
        pincode: territory.pincode,
        code: 'overlap',
        overlap_km2: Number(overlapKm2.toFixed(6)),
      });
    } catch {
      conflicts.push({
        territory_id: territory.id,
        name: territory.name,
        pincode: territory.pincode,
        code: 'intersection_failed',
        overlap_km2: null,
      });
    }
  }

  return conflicts;
}

/**
 * The whole check: shape plus collisions.
 *
 * This is what the admin calls on every vertex and the server calls on save.
 */
function validateBoundary(input, existing = [], { excludeId = null } = {}) {
  const shape = validateShape(input);
  if (!shape.valid) {
    return { valid: false, errors: shape.errors, conflicts: [], areaKm2: shape.areaKm2 };
  }

  const conflicts = findOverlaps(input, existing, { excludeId });

  return {
    valid: conflicts.length === 0,
    errors: shape.errors,
    conflicts,
    areaKm2: shape.areaKm2,
  };
}

/**
 * Pulls a point onto nearby existing geometry.
 *
 * Prefers an existing **vertex** over a point on an **edge**: snapping corner
 * to corner makes two boundaries share an exact position, which is what
 * actually eliminates slivers. Snapping only to the edge leaves the new corner
 * somewhere along the neighbour's line, which is still gapless but leaves the
 * neighbour's own vertices unmatched.
 *
 * Returns `{ lng, lat, snapped, to, distanceMetres }`. When nothing is within
 * tolerance the original point comes back with `snapped: false`, so a caller
 * can use the result unconditionally.
 */
function snapPoint(point, existing = [], { toleranceMetres = DEFAULT_SNAP_METRES, excludeId = null } = {}) {
  const lng = Array.isArray(point) ? point[0] : point.lng;
  const lat = Array.isArray(point) ? point[1] : point.lat;

  const original = { lng, lat, snapped: false, to: null, distanceMetres: null };
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return original;

  const target = turf.point([lng, lat]);

  let bestVertex = null;
  let bestEdge = null;

  for (const territory of existing) {
    if (!territory) continue;
    if (excludeId && String(territory.id) === String(excludeId)) continue;

    const geometry = toGeometry(territory.geojson || territory.boundary_geojson);
    if (!geometry) continue;

    for (const ring of ringsOf(geometry)) {
      for (const position of ring) {
        const d = turf.distance(target, turf.point(position), { units: 'meters' });
        if (d <= toleranceMetres && (!bestVertex || d < bestVertex.distanceMetres)) {
          bestVertex = {
            lng: position[0],
            lat: position[1],
            snapped: true,
            to: { territory_id: territory.id, kind: 'vertex' },
            distanceMetres: d,
          };
        }
      }

      if (bestVertex) continue;

      try {
        const line = turf.lineString(ring);
        const nearest = turf.nearestPointOnLine(line, target, { units: 'meters' });
        const d = nearest.properties.dist;

        if (d <= toleranceMetres && (!bestEdge || d < bestEdge.distanceMetres)) {
          bestEdge = {
            lng: nearest.geometry.coordinates[0],
            lat: nearest.geometry.coordinates[1],
            snapped: true,
            to: { territory_id: territory.id, kind: 'edge' },
            distanceMetres: d,
          };
        }
      } catch {
        // A ring too degenerate to build a line from simply offers nothing to
        // snap to.
      }
    }
  }

  return bestVertex || bestEdge || original;
}

/**
 * Snaps every vertex of a drawing in one pass.
 *
 * Applied when a drawing is closed rather than per click, so an operator can
 * place a point, see where it landed, and undo it without the snap having
 * already rewritten earlier vertices.
 */
function snapRing(points, existing = [], options = {}) {
  return points.map((p) => {
    const snapped = snapPoint(p, existing, options);
    return Array.isArray(p) ? [snapped.lng, snapped.lat] : { lng: snapped.lng, lat: snapped.lat };
  });
}

module.exports = {
  OVERLAP_TOLERANCE_KM2,
  DEFAULT_SNAP_METRES,
  toGeometry,
  rawRings,
  ringsOf,
  isClosed,
  closeRing,
  selfIntersections,
  validateShape,
  findOverlaps,
  validateBoundary,
  snapPoint,
  snapRing,
};

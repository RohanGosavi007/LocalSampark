/**
 * Territory and franchise resolution.
 *
 * One question, asked from a dozen places: given a user, an order, a shop or a
 * lead, which territory is this and which franchise earns from it? Before this
 * module each caller answered it differently — some by `WHERE pincode = $1`
 * against un-normalised input, some by nearest centroid, some not at all — and
 * the answers disagreed.
 *
 * ── Precedence, and why it is the reverse of the obvious design ─────────────
 *
 * The industry default is that GPS position wins for real-time service and the
 * billing address decides invoice taxation. That is the right design and it is
 * not the design running here, because it cannot be: every territory boundary
 * in this database is a 5 km circle generated around a fabricated centroid, and
 * territories sharing a pincode prefix are scattered over ~900 km. Attributing
 * revenue from that geometry would hand franchise commission to whoever
 * happened to win a coin toss made of random numbers.
 *
 * So the order here is:
 *
 *   1. A **verified** boundary containing the point. Real geometry, real
 *      answer — this is the GPS precedence the design wants, and it switches on
 *      by itself for any territory whose boundary has been verified.
 *   2. The **pincode**, which is genuine data: all 1578 rows valid, unique and
 *      non-null, attached to real place names.
 *   3. A **verified** centroid within range.
 *   4. Nothing, reported as `unresolved` with the reason.
 *
 * Every result carries `method` and `confidence`, so a caller can tell a
 * lookup from an inference, and so the admin console can show how much of the
 * platform's attribution currently rests on each.
 *
 * As real boundaries are imported and flagged, step 1 begins answering and the
 * platform moves to GPS precedence without a line of code changing. That is the
 * whole reason the quarantine is a data flag rather than a deleted code path.
 */

const crypto = require('crypto');
const turf = require('@turf/turf');

const spatial = require('../repositories/spatial.repository');
const spatialCache = require('./spatialCache.service');
const pincodeUtil = require('../utils/pincode');
const { query, queryOne } = require('../config/database');
const logger = require('../config/logger');

/** How each resolution method is ranked when several could answer. */
const METHOD_CONFIDENCE = Object.freeze({
  boundary: 1.0,    // a verified polygon containing the point
  pincode: 0.9,     // genuine data, but an area rather than a point
  centroid: 0.5,    // a verified centroid within range — an inference
  buffer: 0.4,      // inside a franchise's service buffer, not its territory
  unresolved: 0,
});

/**
 * Cache for the verified-boundary set.
 *
 * Point-in-polygon is a linear scan over every verified territory, and the set
 * changes when an import runs, not per request. Today it is empty and the scan
 * costs nothing; this exists so that stays true after boundaries land.
 */
const BOUNDARY_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * How close to a boundary line counts as "on the border", in metres.
 *
 * Consumer GPS on a phone is routinely off by more than the width of a street,
 * so within this distance the inside/outside answer is not meaningfully better
 * than a coin flip. Resolutions this close are flagged borderline so the
 * deterministic tie-breaker decides rather than the last fix's error.
 */
const BOUNDARY_EDGE_METRES = 50;
let boundaryCache = null;

async function verifiedBoundaries() {
  if (boundaryCache && Date.now() - boundaryCache.loadedAt < BOUNDARY_CACHE_TTL_MS) {
    return boundaryCache.rows;
  }
  let rows = [];
  try {
    const res = await query(`
      SELECT id, name, pincode, boundary_geojson, centroid_lat, centroid_lng
        FROM territories
       WHERE is_active = true
         AND COALESCE(boundary_verified, 0) = 1
         AND boundary_geojson IS NOT NULL
    `);
    rows = res.rows || res || [];
  } catch (err) {
    logger.warn('Territory resolution: verified boundary load failed: ' + err.message);
    rows = [];
  }
  boundaryCache = { rows, loadedAt: Date.now() };
  return rows;
}

function invalidate() {
  boundaryCache = null;
  // A territory changing hands is exactly when a cached answer becomes a
  // payment to the wrong partner, so the two caches are cleared together and
  // never independently.
  spatialCache.invalidate();
}

/**
 * Every verified territory whose boundary contains the point.
 *
 * Returns all of them rather than the first. With exclusive territories there
 * should only ever be one — the overlap validator enforces it — but "should"
 * is doing a lot of work in a system where boundaries can be imported in bulk,
 * and silently taking the first match is how a topology error becomes a revenue
 * dispute nobody can reconstruct.
 */
async function containingTerritories(lat, lng) {
  const rows = await verifiedBoundaries();
  if (rows.length === 0) return [];

  const point = turf.point([lng, lat]);
  const hits = [];

  for (const row of rows) {
    const geometry = spatial.parseBoundary(row.boundary_geojson);
    if (!geometry) continue;
    try {
      if (turf.booleanPointInPolygon(point, geometry)) hits.push({ row, geometry });
    } catch {
      // A malformed boundary is skipped rather than aborting the scan: one bad
      // import row must not make every lookup in the country fail.
    }
  }
  return hits;
}

/**
 * Picks one territory when a point falls inside several.
 *
 * Phase 6's borderline case: a user standing on the street that separates two
 * franchises. Whatever is chosen must be *deterministic* — the same coordinate
 * resolving to a different franchise on two requests would split one order's
 * attribution from its own commission record.
 *
 * Distance to the boundary edge decides: the territory whose interior the point
 * sits furthest inside wins, because that is the one it is least marginally
 * within. Ties — a point exactly equidistant, which a shared edge produces —
 * fall through to territory id, which is arbitrary but stable, and the result
 * is flagged so the admin console can surface a topology problem rather than
 * letting it hide behind a working-looking answer.
 */
function breakBorderlineTie(hits, lat, lng) {
  if (hits.length === 1) return { row: hits[0].row, ambiguous: false };

  const point = turf.point([lng, lat]);

  const scored = hits.map(({ row, geometry }) => {
    let edgeDistanceKm = 0;
    try {
      // The polygon's outline as a line, so distance-to-edge is measurable.
      const outline = turf.polygonToLine(geometry);
      edgeDistanceKm = turf.pointToLineDistance(point, outline.features ? outline.features[0] : outline, {
        units: 'kilometers',
      });
    } catch {
      edgeDistanceKm = 0;
    }
    return { row, edgeDistanceKm };
  });

  scored.sort((a, b) => {
    if (Math.abs(a.edgeDistanceKm - b.edgeDistanceKm) > 1e-9) {
      return b.edgeDistanceKm - a.edgeDistanceKm;
    }
    return String(a.row.id).localeCompare(String(b.row.id));
  });

  return {
    row: scored[0].row,
    ambiguous: true,
    candidates: scored.map((s) => ({
      territory_id: s.row.id,
      name: s.row.name,
      edge_distance_km: Math.round(s.edgeDistanceKm * 1000) / 1000,
    })),
  };
}

/** The active franchise holding a territory, or null. */
async function franchiseForTerritory(territoryId) {
  if (!territoryId) return null;
  try {
    return await queryOne(
      `SELECT ft.id            AS assignment_id,
              ft.franchise_partner_id,
              ft.pincode,
              ft.commission_rate AS territory_commission_rate,
              ft.buffer_radius_km,
              fp.user_id,
              fp.status          AS partner_status,
              fp.commission_rate AS partner_commission_rate,
              fp.territory_name
         FROM franchise_territories ft
         JOIN franchise_partners fp ON fp.id = ft.franchise_partner_id
        WHERE ft.territory_id = $1 AND ft.status = 'ACTIVE'
        LIMIT 1`,
      [territoryId]
    );
  } catch (err) {
    // The join table may not exist on an older deployment. Resolution still
    // returns the territory; it simply cannot name a franchise.
    logger.warn('Territory resolution: franchise lookup failed: ' + err.message);
    return null;
  }
}

/**
 * The rate that actually applies, and where it came from.
 *
 * A territory-level override of 0 is a real setting meaning "this territory
 * earns nothing", and is not the same as null meaning "use the partner's rate".
 * Collapsing the two with `||` would quietly start paying commission on a
 * territory an operator had deliberately zeroed.
 */
function effectiveCommission(franchise) {
  if (!franchise) return null;
  const territoryRate = franchise.territory_commission_rate;
  if (territoryRate !== null && territoryRate !== undefined && Number.isFinite(Number(territoryRate))) {
    return { rate: Number(territoryRate), source: 'territory' };
  }
  const partnerRate = Number(franchise.partner_commission_rate);
  if (Number.isFinite(partnerRate)) return { rate: partnerRate, source: 'partner' };
  return null;
}

/** Shapes a resolution result consistently, whichever path produced it. */
async function shape(territory, method, extra = {}) {
  if (!territory) {
    return {
      resolved: false,
      method: 'unresolved',
      confidence: 0,
      territory: null,
      franchise: null,
      commission: null,
      ...extra,
    };
  }

  const franchise = await franchiseForTerritory(territory.id);

  return {
    resolved: true,
    method,
    confidence: METHOD_CONFIDENCE[method] ?? 0,
    territory: {
      id: territory.id,
      name: territory.name,
      pincode: territory.pincode,
      taluka_name: territory.taluka_name || null,
      district_name: territory.district_name || null,
      state_name: territory.state_name || null,
    },
    franchise: franchise
      ? {
        franchise_partner_id: franchise.franchise_partner_id,
        user_id: franchise.user_id,
        status: franchise.partner_status,
        territory_name: franchise.territory_name,
        buffer_radius_km: Number(franchise.buffer_radius_km) || 0,
      }
      : null,
    commission: effectiveCommission(franchise),
    ...extra,
  };
}

/**
 * Resolves by coordinates.
 *
 * Returns `unresolved` with `reason: 'no_verified_boundaries'` rather than
 * guessing, which is the state the platform is in today. A caller that also has
 * a pincode should use `resolve()`, which tries both in the right order.
 */
async function resolveByCoordinates(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return shape(null, 'unresolved', { reason: 'invalid_coordinates' });
  }
  // A plausible-range check, because [0,0] in the Gulf of Guinea is what an
  // uninitialised location object looks like and it is inside no territory
  // anywhere — but a swapped lat/lng pair is not, and that one resolves
  // somewhere wrong instead of nowhere.
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return shape(null, 'unresolved', { reason: 'coordinates_out_of_range' });
  }

  // A cached cell answer is only ever written for points provably interior to
  // their territory (see spatialCache.setCoordinate), so a hit here is safe to
  // return without re-testing the geometry.
  const cached = await spatialCache.getCoordinate(latitude, longitude);
  if (cached) return { ...cached, cached: true };

  const hits = await containingTerritories(latitude, longitude);
  if (hits.length > 0) {
    const decision = breakBorderlineTie(hits, latitude, longitude);

    // How far the point sits from the edge decides two things: whether this is
    // the 50 m street-boundary case, and whether the answer may be shared with
    // the rest of the geohash cell.
    const marginKm = spatial.distanceToBoundaryKm(decision.row, latitude, longitude);
    const nearEdge = marginKm !== null && marginKm * 1000 <= BOUNDARY_EDGE_METRES;

    const result = shape(decision.row, 'boundary', {
      borderline: decision.ambiguous || nearEdge || false,
      borderline_candidates: decision.candidates || undefined,
      boundary_margin_km: marginKm,
    });

    // Deliberately not awaited on the critical path — a slow cache write must
    // not slow the answer the user is waiting for, and a failed one is a miss
    // next time rather than an error now.
    spatialCache.setCoordinate(latitude, longitude, result, marginKm).catch(() => {});

    return result;
  }

  const nearest = await spatial.nearestTerritory(latitude, longitude);
  if (nearest) {
    return shape(nearest, 'centroid', { distance_km: nearest.distance_km ?? null });
  }

  const verified = await verifiedBoundaries();
  return shape(null, 'unresolved', {
    reason: verified.length === 0 ? 'no_verified_boundaries' : 'outside_all_territories',
  });
}

/** Resolves by pincode. The authoritative path while boundaries are quarantined. */
async function resolveByPincode(pincode) {
  const normalized = pincodeUtil.normalize(pincode);
  if (!normalized) {
    return shape(null, 'unresolved', {
      reason: 'invalid_pincode',
      detail: pincodeUtil.describeFailure(pincode),
    });
  }

  // A pincode is an exact key — it belongs to one territory or to none — so
  // unlike a coordinate there is no cell to straddle and no margin to check.
  const cached = await spatialCache.getPincode(normalized);
  if (cached) return { ...cached, cached: true };

  const territory = await spatial.territoryByPincode(normalized);
  if (!territory) {
    // A valid pincode nobody serves is a franchise opportunity, not an error.
    //
    // Deliberately not cached. The gap counter below is how an operator sees
    // demand for an unserved area, and caching the negative would swallow every
    // repeat request — the signal is the whole point of the miss.
    await recordCoverageGap(normalized);
    return shape(null, 'unresolved', { reason: 'no_territory_for_pincode', pincode: normalized });
  }

  const result = shape(territory, 'pincode', { pincode: normalized });
  spatialCache.setPincode(normalized, result).catch(() => {});
  return result;
}

/**
 * The unified entry point, honouring the precedence described at the top.
 *
 * `pincode` is tried before coordinates whenever coordinates cannot produce a
 * verified-boundary answer, which today is always.
 */
async function resolve({ lat = null, lng = null, pincode = null } = {}) {
  if (lat != null && lng != null) {
    const byCoordinates = await resolveByCoordinates(lat, lng);
    // Only a real polygon answer outranks the pincode. A centroid inference
    // does not, because a pincode is data and a centroid guess is not.
    if (byCoordinates.resolved && byCoordinates.method === 'boundary') {
      return byCoordinates;
    }

    if (pincode) {
      const byPincode = await resolveByPincode(pincode);
      if (byPincode.resolved) return byPincode;
    }

    if (byCoordinates.resolved) return byCoordinates;
    return byCoordinates;
  }

  if (pincode) return resolveByPincode(pincode);

  return shape(null, 'unresolved', { reason: 'no_location_signal' });
}

/**
 * Validates that a proposed boundary does not overlap an existing one.
 *
 * Checked against every *active* territory that has a boundary, verified or
 * not. That is deliberate: an operator drawing a new territory needs to be
 * warned about a collision with an existing shape whatever its verification
 * status, because the collision is a fact about the two drawings. What
 * verification gates is whether a boundary may *attribute revenue*, which is a
 * different question.
 */
async function validateNoOverlap(geojson, { excludeTerritoryId = null } = {}) {
  const candidate = spatial.parseBoundary(geojson);
  if (!candidate) {
    return { valid: false, reason: 'invalid_geometry', conflicts: [] };
  }

  // A self-intersecting ring — a figure-eight drawn by dragging a vertex across
  // the shape — has no well-defined interior, so containment and area are both
  // meaningless. Rejecting it here is what stops it becoming a territory that
  // behaves differently on every query.
  const kinks = (() => {
    try {
      return turf.kinks(candidate).features.length;
    } catch {
      return 0;
    }
  })();
  if (kinks > 0) {
    return { valid: false, reason: 'self_intersecting_boundary', self_intersections: kinks, conflicts: [] };
  }

  let areaKm2 = 0;
  try {
    areaKm2 = turf.area(candidate) / 1e6;
  } catch {
    areaKm2 = 0;
  }
  if (areaKm2 <= 0) {
    return { valid: false, reason: 'zero_area_boundary', conflicts: [] };
  }

  const params = [];
  let clause = 'is_active = true AND boundary_geojson IS NOT NULL';
  if (excludeTerritoryId) {
    params.push(excludeTerritoryId);
    clause += ` AND id <> $${params.length}`;
  }

  let rows = [];
  try {
    const res = await query(
      `SELECT id, name, pincode, boundary_geojson FROM territories WHERE ${clause}`,
      params
    );
    rows = res.rows || res || [];
  } catch (err) {
    // Unknown is treated as unsafe. Returning "valid" on a failed query is how
    // a conflicting territory gets created during a database hiccup.
    return { valid: false, reason: 'overlap_check_failed', error: err.message, conflicts: [] };
  }

  const conflicts = [];
  for (const row of rows) {
    const other = spatial.parseBoundary(row.boundary_geojson);
    if (!other) continue;
    const overlapKm2 = spatial.overlapAreaKm2(candidate, other);
    if (overlapKm2 > 1e-6) {
      conflicts.push({
        territory_id: row.id,
        name: row.name,
        pincode: row.pincode,
        overlap_km2: Math.round(overlapKm2 * 1000) / 1000,
        // The share of the *new* shape that collides, which is what tells an
        // operator whether they drew slightly over a border or on top of
        // someone else's whole territory.
        overlap_pct_of_new: Math.round((overlapKm2 / areaKm2) * 10000) / 100,
      });
    }
  }

  conflicts.sort((a, b) => b.overlap_km2 - a.overlap_km2);

  return {
    valid: conflicts.length === 0,
    reason: conflicts.length === 0 ? null : 'overlaps_existing_territory',
    area_km2: Math.round(areaKm2 * 1000) / 1000,
    conflicts,
  };
}

/**
 * Assigns a territory to a franchise, exclusively.
 *
 * The unique partial index does the enforcing; this reports the conflict in
 * terms an operator can act on rather than surfacing a constraint violation.
 * Both are needed: the check below is the good error message, the index is the
 * guarantee under concurrency.
 */
async function assignTerritory({ franchisePartnerId, territoryId, actorId = null, commissionRate = null, bufferRadiusKm = 0, reason = null }) {
  if (!franchisePartnerId || !territoryId) {
    const err = new Error('franchisePartnerId and territoryId are both required.');
    err.status = 400;
    throw err;
  }

  const territory = await queryOne('SELECT id, pincode, name FROM territories WHERE id = $1', [territoryId]);
  if (!territory) {
    const err = new Error(`No territory with id ${territoryId}.`);
    err.status = 404;
    throw err;
  }

  const partner = await queryOne('SELECT id FROM franchise_partners WHERE id = $1', [franchisePartnerId]);
  if (!partner) {
    const err = new Error(`No franchise partner with id ${franchisePartnerId}.`);
    err.status = 404;
    throw err;
  }

  const existing = await franchiseForTerritory(territoryId);
  if (existing) {
    if (String(existing.franchise_partner_id) === String(franchisePartnerId)) {
      return { assigned: false, reason: 'already_held_by_this_partner', assignment_id: existing.assignment_id };
    }
    const err = new Error(
      `Territory "${territory.name}" (${territory.pincode}) is already held by another active franchise. ` +
      'Release or transfer it first — territories are exclusive.'
    );
    err.status = 409;
    err.conflict = { franchise_partner_id: existing.franchise_partner_id };
    throw err;
  }

  const id = crypto.randomUUID();
  try {
    await query(
      `INSERT INTO franchise_territories
         (id, franchise_partner_id, territory_id, pincode, status, commission_rate, buffer_radius_km, assigned_by)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7)`,
      [id, franchisePartnerId, territoryId, territory.pincode, commissionRate, Number(bufferRadiusKm) || 0, actorId]
    );
  } catch (err) {
    // The index fired, which means another request claimed it between the check
    // above and this insert. That is the race the index exists for.
    if (/unique|duplicate/i.test(err.message)) {
      const conflict = new Error(
        `Territory "${territory.name}" was claimed by another franchise while this request was in flight.`
      );
      conflict.status = 409;
      throw conflict;
    }
    throw err;
  }

  await logAssignment({
    territoryId,
    pincode: territory.pincode,
    fromFranchiseId: null,
    toFranchiseId: franchisePartnerId,
    action: 'ASSIGNED',
    reason,
    actorId,
  });

  return { assigned: true, assignment_id: id, territory_id: territoryId, pincode: territory.pincode };
}

/**
 * Moves a territory from one franchise to another.
 *
 * Release and claim happen in one transaction, because a gap between them is a
 * window in which the territory is unowned and any order landing in it is
 * attributed to nobody.
 *
 * Historical records are deliberately not rewritten. Orders attributed to the
 * previous holder stay attributed to them: that money has been earned and in
 * many cases already paid, and retro-attributing it would take it from someone
 * who did the work. `effective_from` on the log is what lets a revenue report
 * split a month across two holders correctly.
 */
async function transferTerritory({ territoryId, toFranchisePartnerId, actorId = null, reason = null, effectiveFrom = null }) {
  const territory = await queryOne('SELECT id, pincode, name FROM territories WHERE id = $1', [territoryId]);
  if (!territory) {
    const err = new Error(`No territory with id ${territoryId}.`);
    err.status = 404;
    throw err;
  }

  const current = await franchiseForTerritory(territoryId);
  const fromId = current ? current.franchise_partner_id : null;

  if (fromId && String(fromId) === String(toFranchisePartnerId)) {
    return { transferred: false, reason: 'already_held_by_this_partner' };
  }

  const { withTransaction } = require('../config/database');

  const assignmentId = crypto.randomUUID();
  await withTransaction(async (tx) => {
    const run = tx && typeof tx.query === 'function' ? tx.query.bind(tx) : query;

    if (current) {
      await run(
        `UPDATE franchise_territories
            SET status = 'RELEASED', released_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [current.assignment_id]
      );
    }

    await run(
      `INSERT INTO franchise_territories
         (id, franchise_partner_id, territory_id, pincode, status, assigned_by)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
      [assignmentId, toFranchisePartnerId, territoryId, territory.pincode, actorId]
    );
  });

  await logAssignment({
    territoryId,
    pincode: territory.pincode,
    fromFranchiseId: fromId,
    toFranchiseId: toFranchisePartnerId,
    action: 'TRANSFERRED',
    reason,
    actorId,
    effectiveFrom,
  });

  invalidate();
  return {
    transferred: true,
    assignment_id: assignmentId,
    from_franchise_id: fromId,
    to_franchise_id: toFranchisePartnerId,
    // Stated explicitly so a caller cannot assume past revenue moved with it.
    historical_attribution: 'unchanged',
  };
}

/** Releases a territory back to the platform pool. */
async function releaseTerritory({ territoryId, actorId = null, reason = null }) {
  const current = await franchiseForTerritory(territoryId);
  if (!current) return { released: false, reason: 'not_assigned' };

  const territory = await queryOne('SELECT pincode FROM territories WHERE id = $1', [territoryId]);

  await query(
    `UPDATE franchise_territories
        SET status = 'RELEASED', released_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    [current.assignment_id]
  );

  await logAssignment({
    territoryId,
    pincode: territory ? territory.pincode : '',
    fromFranchiseId: current.franchise_partner_id,
    toFranchiseId: null,
    action: 'RELEASED',
    reason,
    actorId,
  });

  invalidate();
  return { released: true, from_franchise_id: current.franchise_partner_id };
}

async function logAssignment({ territoryId, pincode, fromFranchiseId, toFranchiseId, action, reason, actorId, effectiveFrom = null }) {
  try {
    await query(
      `INSERT INTO territory_assignment_log
         (id, territory_id, pincode, from_franchise_id, to_franchise_id, action, reason, performed_by, effective_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, CURRENT_TIMESTAMP))`,
      [crypto.randomUUID(), territoryId, pincode || '', fromFranchiseId, toFranchiseId, action, reason, actorId, effectiveFrom]
    );
  } catch (err) {
    // The assignment itself has already happened and is the thing that matters.
    // A missing audit row is reported, not rolled back into a failed transfer.
    logger.error(`Territory assignment log write failed (${action} on ${territoryId}): ${err.message}`);
  }
}

/**
 * Who held a territory at a given instant.
 *
 * The question a revenue report has to answer when a territory changed hands
 * mid-month. Reconstructed from the log rather than from the current
 * assignment, which only knows about now.
 */
async function holderAt(territoryId, at) {
  const when = at instanceof Date ? at : new Date(at);
  const stamp = when.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  try {
    const row = await queryOne(
      `SELECT to_franchise_id, action, effective_from
         FROM territory_assignment_log
        WHERE territory_id = $1 AND effective_from <= $2
        ORDER BY effective_from DESC
        LIMIT 1`,
      [territoryId, stamp]
    );
    if (!row) return null;
    // A RELEASED entry means nobody held it after that instant.
    if (row.action === 'RELEASED') return null;
    return row.to_franchise_id;
  } catch (err) {
    logger.warn('Territory holder lookup failed: ' + err.message);
    return null;
  }
}

/**
 * Records that the platform was asked to serve an area nobody covers.
 *
 * Phase 6's "rural/unassigned pincode" case. The point is not to log an error —
 * an unserviced area is a normal state for an expanding platform — but to turn
 * the demand into the input for deciding where to sell the next franchise.
 */
async function recordCoverageGap(pincode) {
  const normalized = pincodeUtil.normalize(pincode);
  if (!normalized) return;

  try {
    const existing = await queryOne(
      'SELECT id FROM territory_coverage_gaps WHERE pincode = $1',
      [normalized]
    );
    if (existing) {
      await query(
        `UPDATE territory_coverage_gaps
            SET request_count = request_count + 1, last_requested_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [existing.id]
      );
    } else {
      await query(
        `INSERT INTO territory_coverage_gaps (id, pincode, request_count)
         VALUES ($1, $2, 1)`,
        [crypto.randomUUID(), normalized]
      );
    }
  } catch (err) {
    // Recording demand must never fail the request that revealed it.
    logger.warn('Coverage gap record failed: ' + err.message);
  }
}

/** Registers interest in becoming the partner for an uncovered area. */
async function recordCoverageInterest(pincode) {
  const normalized = pincodeUtil.normalize(pincode);
  if (!normalized) return { recorded: false, reason: 'invalid_pincode' };

  try {
    const existing = await queryOne(
      'SELECT id FROM territory_coverage_gaps WHERE pincode = $1',
      [normalized]
    );
    if (existing) {
      await query(
        'UPDATE territory_coverage_gaps SET interest_count = interest_count + 1 WHERE id = $1',
        [existing.id]
      );
    } else {
      await query(
        `INSERT INTO territory_coverage_gaps (id, pincode, request_count, interest_count)
         VALUES ($1, $2, 0, 1)`,
        [crypto.randomUUID(), normalized]
      );
    }
    return { recorded: true, pincode: normalized };
  } catch (err) {
    logger.warn('Coverage interest record failed: ' + err.message);
    return { recorded: false, reason: 'write_failed' };
  }
}

/** Every pincode an active franchise holds. Used by the scoping middleware. */
async function pincodesForFranchise(franchisePartnerId) {
  if (!franchisePartnerId) return [];
  try {
    const res = await query(
      `SELECT pincode FROM franchise_territories
        WHERE franchise_partner_id = $1 AND status = 'ACTIVE'`,
      [franchisePartnerId]
    );
    return (res.rows || res || []).map((row) => row.pincode).filter(Boolean);
  } catch (err) {
    logger.warn('Franchise pincode lookup failed: ' + err.message);
    return [];
  }
}

/** Coverage summary for the admin console. */
async function coverageStats() {
  const stats = {
    territories: 0,
    assigned: 0,
    unassigned: 0,
    boundaries_verified: 0,
    centroids_verified: 0,
    gaps: 0,
  };

  try {
    const t = await queryOne(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN COALESCE(boundary_verified, 0) = 1 THEN 1 ELSE 0 END) AS boundaries,
             SUM(CASE WHEN COALESCE(centroid_verified, 0) = 1 THEN 1 ELSE 0 END) AS centroids
        FROM territories WHERE is_active = true
    `);
    stats.territories = Number(t?.total) || 0;
    stats.boundaries_verified = Number(t?.boundaries) || 0;
    stats.centroids_verified = Number(t?.centroids) || 0;
  } catch { /* table shape differs on an older deployment */ }

  try {
    const a = await queryOne(
      "SELECT COUNT(*) AS c FROM franchise_territories WHERE status = 'ACTIVE'"
    );
    stats.assigned = Number(a?.c) || 0;
  } catch { /* not migrated yet */ }

  try {
    const g = await queryOne('SELECT COUNT(*) AS c FROM territory_coverage_gaps');
    stats.gaps = Number(g?.c) || 0;
  } catch { /* not migrated yet */ }

  stats.unassigned = Math.max(stats.territories - stats.assigned, 0);
  // The number that matters most right now: what share of attribution can come
  // from real geometry rather than from a pincode lookup.
  stats.boundary_coverage = stats.territories > 0
    ? stats.boundaries_verified / stats.territories
    : 0;

  return stats;
}

/**
 * The attribution to store on a domain row at write time.
 *
 * Callers that create a lead, order, job or shop use this once and persist the
 * result; they do not re-resolve on read. A stored attribution survives a
 * territory transfer, so a record created under one partner keeps pointing at
 * that partner after the area moves to another — re-deriving it on read would
 * quietly move last month's commission along with the transfer.
 *
 * Returns nulls rather than throwing when nothing resolves. An unattributed row
 * is visible only to administrators under the scoping rules, which is the safe
 * direction for a record whose owner is genuinely unknown.
 */
async function attributionFor({ lat = null, lng = null, pincode = null } = {}) {
  try {
    const result = await resolve({ lat, lng, pincode });
    if (!result || !result.resolved || !result.territory) {
      return { pincode: pincodeUtil.normalize(pincode), territory_id: null, franchise_partner_id: null, method: result?.method || 'unresolved' };
    }
    return {
      pincode: result.territory.pincode || pincodeUtil.normalize(pincode),
      territory_id: result.territory.id,
      franchise_partner_id: result.franchise ? result.franchise.franchise_partner_id : null,
      method: result.method,
    };
  } catch (err) {
    logger.warn('Attribution resolution failed, storing unattributed: ' + err.message);
    return { pincode: pincodeUtil.normalize(pincode), territory_id: null, franchise_partner_id: null, method: 'unresolved' };
  }
}

module.exports = {
  resolve,
  attributionFor,
  resolveByCoordinates,
  resolveByPincode,
  validateNoOverlap,
  assignTerritory,
  transferTerritory,
  releaseTerritory,
  franchiseForTerritory,
  pincodesForFranchise,
  effectiveCommission,
  holderAt,
  recordCoverageGap,
  recordCoverageInterest,
  coverageStats,
  containingTerritories,
  breakBorderlineTie,
  invalidate,
  METHOD_CONFIDENCE,
};

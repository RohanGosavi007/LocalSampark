/**
 * Territory resolution, franchise exclusivity, and the boundary quarantine.
 *
 * Three things are pinned here, and each one guards against a failure that
 * produces no error:
 *
 *  1. **The quarantine holds.** Unverified boundaries must never attribute a
 *     point to a territory. The stored geometry is a 5 km circle around a
 *     fabricated centroid, so an answer from it is a confident wrong answer —
 *     and franchise commission is paid on that answer. A regression here is a
 *     regression in who gets paid.
 *
 *  2. **Exclusivity is real.** Two franchises must not be able to hold one
 *     territory. Tested against the database constraint rather than only the
 *     service check, because the service check loses under concurrency and the
 *     index is what actually prevents a split commission.
 *
 *  3. **Scoping denies by default.** A franchise with no territories sees
 *     nothing, not everything. The difference between `1 = 0` and a missing
 *     filter is one character in a query and every row on the platform.
 */

process.env.USE_SQLITE = 'true';

const crypto = require('crypto');
const { query, queryOne } = require('../../config/database');
const svc = require('../../services/territoryResolution.service');
const spatial = require('../../repositories/spatial.repository');
const scope = require('../../middleware/franchiseScope.middleware');
const pincodeUtil = require('../../utils/pincode');

/**
 * A real polygon: a square roughly over central Pune, in GeoJSON [lng, lat].
 *
 * Deliberately real coordinates. The whole point of the fixture is to prove the
 * engine works on genuine geometry, so that when verified boundaries are
 * imported there is evidence the path they will travel is correct.
 */
const PUNE_SQUARE = {
  type: 'Polygon',
  coordinates: [[
    [73.84, 18.50],
    [73.90, 18.50],
    [73.90, 18.56],
    [73.84, 18.56],
    [73.84, 18.50],
  ]],
};

/** Shares the eastern edge of PUNE_SQUARE — adjacent, not overlapping. */
const ADJACENT_SQUARE = {
  type: 'Polygon',
  coordinates: [[
    [73.90, 18.50],
    [73.96, 18.50],
    [73.96, 18.56],
    [73.90, 18.56],
    [73.90, 18.50],
  ]],
};

/** Genuinely overlaps PUNE_SQUARE by half. */
const OVERLAPPING_SQUARE = {
  type: 'Polygon',
  coordinates: [[
    [73.87, 18.50],
    [73.93, 18.50],
    [73.93, 18.56],
    [73.87, 18.56],
    [73.87, 18.50],
  ]],
};

const T_VERIFIED = 'tr-test-territory-verified';
const T_ADJACENT = 'tr-test-territory-adjacent';
const T_UNVERIFIED = 'tr-test-territory-unverified';
const PARTNER_A = 'tr-test-partner-a';
const PARTNER_B = 'tr-test-partner-b';
const USER_A = 'tr-test-user-a';
const USER_B = 'tr-test-user-b';

let talukaId = null;

async function cleanup() {
  await query("DELETE FROM territory_assignment_log WHERE territory_id LIKE 'tr-test-%'");
  await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'tr-test-%'");
  await query("DELETE FROM territory_coverage_gaps WHERE pincode IN ('414001','999999','560001')");
  await query("DELETE FROM franchise_partners WHERE id LIKE 'tr-test-%'");
  await query("DELETE FROM territories WHERE id LIKE 'tr-test-%'");
  await query("DELETE FROM users WHERE id LIKE 'tr-test-user-%'");
  await query("DELETE FROM location_talukas WHERE id LIKE 'tr-test-%'");
  await query("DELETE FROM location_districts WHERE id LIKE 'tr-test-%'");
  await query("DELETE FROM location_states WHERE id LIKE 'tr-test-%'");
}

beforeAll(async () => {
  await cleanup();
  svc.invalidate();

  // territories.taluka_id is NOT NULL and every repository query joins the
  // full state → district → taluka chain, so a territory fixture without one
  // is both rejected on insert and invisible to every lookup. The shared jest
  // fixtures do not seed the location hierarchy, so this suite creates its own.
  const existing = await queryOne('SELECT id FROM location_talukas LIMIT 1');
  if (existing) {
    talukaId = existing.id;
  } else {
    talukaId = 'tr-test-taluka';
    await query(
      `INSERT INTO location_states (id, name, code) VALUES ($1, $2, $3)`,
      ['tr-test-state', 'TR Test State', 'TRT']
    );
    await query(
      `INSERT INTO location_districts (id, state_id, name) VALUES ($1, $2, $3)`,
      ['tr-test-district', 'tr-test-state', 'TR Test District']
    );
    await query(
      `INSERT INTO location_talukas (id, district_id, name) VALUES ($1, $2, $3)`,
      [talukaId, 'tr-test-district', 'TR Test Taluka']
    );
  }

  const insertTerritory = async (id, name, pincode, boundary, verified) => {
    await query(
      `INSERT INTO territories
         (id, taluka_id, name, pincode, centroid_lat, centroid_lng, boundary_geojson,
          radius_km, is_active, centroid_verified, boundary_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 5, 1, 0, $8)`,
      [id, talukaId, name, pincode, 18.53, 73.87, JSON.stringify(boundary), verified]
    );
  };

  await insertTerritory(T_VERIFIED, 'TR Test Verified', '411001', PUNE_SQUARE, 1);
  await insertTerritory(T_ADJACENT, 'TR Test Adjacent', '411002', ADJACENT_SQUARE, 1);
  await insertTerritory(T_UNVERIFIED, 'TR Test Unverified', '411003', PUNE_SQUARE, 0);

  for (const [userId, partnerId, n] of [[USER_A, PARTNER_A, 1], [USER_B, PARTNER_B, 2]]) {
    await query(
      `INSERT INTO users (id, phone_number, phone, full_name, role, is_active)
       VALUES ($1, $2, $2, $3, 'franchise_owner', 1)`,
      [userId, `+9198000000${n}`, `TR Test Partner ${n}`]
    );
    await query(
      `INSERT INTO franchise_partners (id, user_id, territory_name, territory_pincode, status, commission_rate)
       VALUES ($1, $2, $3, $4, 'ACTIVE', 10)`,
      [partnerId, userId, `TR Test Franchise ${n}`, n === 1 ? '411001' : '411002']
    );
  }

  svc.invalidate();
});

afterAll(cleanup);

describe('pincode normalisation', () => {
  test('accepts the formats real input actually arrives in', () => {
    for (const input of ['411001', ' 411001 ', '411 001', '411-001', 411001, 'PIN:411001', '411001,']) {
      expect(pincodeUtil.normalize(input)).toBe('411001');
    }
  });

  test('rejects what is not a pincode, with a reason an operator can act on', () => {
    expect(pincodeUtil.normalize('012345')).toBeNull();   // 0 is not an allocated zone
    expect(pincodeUtil.normalize('41100')).toBeNull();
    expect(pincodeUtil.normalize('4110011')).toBeNull();
    expect(pincodeUtil.normalize('abcdef')).toBeNull();
    expect(pincodeUtil.normalize('')).toBeNull();
    expect(pincodeUtil.normalize(null)).toBeNull();

    expect(pincodeUtil.describeFailure('41100')).toMatch(/only 5 digits/);
    expect(pincodeUtil.describeFailure('012345')).toMatch(/starts with 0/);
  });

  test('a non-breaking space does not survive as a distinct pincode', () => {
    // Autofill from a PDF produces these, and they look identical on screen.
    expect(pincodeUtil.normalize('411 001')).toBe('411001');
  });

  test('a float that arrived from JSON does not become "411001.0"', () => {
    expect(pincodeUtil.normalize(411001.0)).toBe('411001');
    expect(pincodeUtil.normalize(411001.5)).toBeNull();
  });

  test('partition reports which entries were rejected and why', () => {
    const result = pincodeUtil.partition(['411001', '411 002', '41100', '411001', '']);
    expect(result.accepted).toEqual(['411001', '411002']);
    expect(result.rejected).toHaveLength(3);
    expect(result.rejected.find((r) => r.value === '411001').reason).toMatch(/duplicate/);
  });

  test('district is the postal sorting prefix', () => {
    expect(pincodeUtil.district('411001')).toBe('411');
    expect(pincodeUtil.sameDistrict('411001', '411057')).toBe(true);
    expect(pincodeUtil.sameDistrict('411001', '431001')).toBe(false);
  });
});

describe('the boundary quarantine', () => {
  test('a verified boundary resolves a point inside it', () => {
    // Proof the engine is correct, so that importing real boundaries is a data
    // change rather than a leap of faith.
    return svc.resolveByCoordinates(18.53, 73.87).then((result) => {
      expect(result.resolved).toBe(true);
      expect(result.method).toBe('boundary');
      expect(result.confidence).toBe(1);
      expect(result.territory.id).toBe(T_VERIFIED);
    });
  });

  test('a point outside every boundary resolves to nothing, not to the nearest', () => {
    return svc.resolveByCoordinates(19.99, 72.10).then((result) => {
      expect(result.resolved).toBe(false);
      expect(result.method).toBe('unresolved');
      expect(result.reason).toBe('outside_all_territories');
    });
  });

  test('an UNVERIFIED boundary never attributes a point, however well it contains it', async () => {
    // The regression that matters most. T_UNVERIFIED holds the identical
    // polygon to T_VERIFIED; only the flag differs. If the quarantine were
    // dropped, this point would be ambiguous between the two.
    const result = await svc.resolveByCoordinates(18.53, 73.87);
    expect(result.territory.id).not.toBe(T_UNVERIFIED);

    const contains = await spatial.territoryContainsPoint(T_UNVERIFIED, 18.53, 73.87);
    expect(contains).toBe(false);
  });

  test('the repository filters on boundary_verified, in the source', () => {
    // Read as text, in the style of the existing geo trust test: an edit that
    // removes the filter to "make GPS attribution work" fails here with an
    // explanation rather than shipping.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'repositories', 'spatial.repository.js'),
      'utf8'
    );
    const matches = src.match(/COALESCE\(\s*t?\.?boundary_verified,\s*0\s*\)\s*=\s*1/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('coordinates outside the valid range are refused rather than searched', async () => {
    for (const [lat, lng] of [[91, 73], [18, 181], [NaN, 73]]) {
      const result = await svc.resolveByCoordinates(lat, lng);
      expect(result.resolved).toBe(false);
      expect(['invalid_coordinates', 'coordinates_out_of_range']).toContain(result.reason);
    }
  });
});

describe('resolution precedence', () => {
  test('a verified boundary outranks the pincode', async () => {
    // GPS precedence, which is the design the platform moves to as boundaries
    // are verified. The pincode given belongs to a different territory.
    const result = await svc.resolve({ lat: 18.53, lng: 73.87, pincode: '411002' });
    expect(result.method).toBe('boundary');
    expect(result.territory.id).toBe(T_VERIFIED);
  });

  test('the pincode answers when coordinates cannot', async () => {
    const result = await svc.resolve({ lat: 19.99, lng: 72.10, pincode: '411002' });
    expect(result.method).toBe('pincode');
    expect(result.territory.id).toBe(T_ADJACENT);
  });

  test('a normalised pincode matches a stored one', async () => {
    const result = await svc.resolveByPincode('411 001');
    expect(result.resolved).toBe(true);
    expect(result.territory.pincode).toBe('411001');
  });

  test('no signal at all is reported as such', async () => {
    const result = await svc.resolve({});
    expect(result.resolved).toBe(false);
    expect(result.reason).toBe('no_location_signal');
  });

  test('every result carries a method and a confidence', async () => {
    const results = await Promise.all([
      svc.resolve({ lat: 18.53, lng: 73.87 }),
      svc.resolve({ pincode: '411001' }),
      svc.resolve({}),
    ]);
    for (const result of results) {
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
    }
  });
});

describe('overlap validation', () => {
  test('an adjacent territory sharing an edge is not an overlap', async () => {
    // Without an area tolerance this reported a conflict for every pair of
    // neighbours, which makes a contiguous map impossible to draw.
    const result = await svc.validateNoOverlap(ADJACENT_SQUARE, { excludeTerritoryId: T_ADJACENT });
    const conflict = result.conflicts.find((c) => c.territory_id === T_VERIFIED);
    expect(conflict).toBeUndefined();
  });

  test('a genuinely overlapping polygon is rejected, with the area quantified', async () => {
    const result = await svc.validateNoOverlap(OVERLAPPING_SQUARE);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('overlaps_existing_territory');

    const conflict = result.conflicts.find((c) => c.territory_id === T_VERIFIED);
    expect(conflict).toBeDefined();
    expect(conflict.overlap_km2).toBeGreaterThan(0);
    expect(conflict.overlap_pct_of_new).toBeGreaterThan(10);
  });

  test('excluding a territory lets it be edited without colliding with itself', async () => {
    const result = await svc.validateNoOverlap(PUNE_SQUARE, { excludeTerritoryId: T_VERIFIED });
    const selfConflict = result.conflicts.find((c) => c.territory_id === T_VERIFIED);
    expect(selfConflict).toBeUndefined();
  });

  test('a self-intersecting boundary is rejected outright', async () => {
    // A figure-eight has no well-defined interior, so containment and area are
    // both meaningless and it would behave differently on every query.
    const bowtie = {
      type: 'Polygon',
      coordinates: [[[73.84, 18.50], [73.90, 18.56], [73.90, 18.50], [73.84, 18.56], [73.84, 18.50]]],
    };
    const result = await svc.validateNoOverlap(bowtie);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('self_intersecting_boundary');
  });

  test('a zero-area boundary is rejected', async () => {
    const line = {
      type: 'Polygon',
      coordinates: [[[73.84, 18.50], [73.90, 18.50], [73.84, 18.50]]],
    };
    const result = await svc.validateNoOverlap(line);
    expect(result.valid).toBe(false);
    expect(['zero_area_boundary', 'invalid_geometry']).toContain(result.reason);
  });

  test('unparseable geometry is rejected rather than treated as no conflict', async () => {
    const result = await svc.validateNoOverlap({ type: 'Polygon', coordinates: 'nonsense' });
    expect(result.valid).toBe(false);
  });

  test('MultiPolygon is supported, not silently skipped', () => {
    const multi = {
      type: 'MultiPolygon',
      coordinates: [PUNE_SQUARE.coordinates, ADJACENT_SQUARE.coordinates],
    };
    expect(spatial.parseBoundary(multi)).not.toBeNull();
    expect(spatial.parseBoundary(JSON.stringify(multi))).not.toBeNull();
  });

  test('a Feature wrapper is unwrapped, as GIS exports produce', () => {
    const feature = { type: 'Feature', properties: {}, geometry: PUNE_SQUARE };
    expect(spatial.parseBoundary(feature)).not.toBeNull();
  });
});

describe('franchise exclusivity', () => {
  beforeEach(async () => {
    await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'tr-test-%'");
    await query("DELETE FROM territory_assignment_log WHERE territory_id LIKE 'tr-test-%'");
  });

  test('a territory can be assigned to a franchise', async () => {
    const result = await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    expect(result.assigned).toBe(true);
    expect(result.pincode).toBe('411001');
  });

  test('a second franchise cannot claim the same territory', async () => {
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    await expect(
      svc.assignTerritory({ franchisePartnerId: PARTNER_B, territoryId: T_VERIFIED })
    ).rejects.toThrow(/exclusive|already held/i);
  });

  test('the database refuses a double claim even without the service check', async () => {
    // The service check loses a race; the partial unique index does not. This
    // is what stops two concurrent assignments both succeeding and splitting
    // one territory's commission between two partners.
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });

    await expect(
      query(
        `INSERT INTO franchise_territories
           (id, franchise_partner_id, territory_id, pincode, status)
         VALUES ($1, $2, $3, '411001', 'ACTIVE')`,
        [crypto.randomUUID(), PARTNER_B, T_VERIFIED]
      )
    ).rejects.toThrow();
  });

  test('re-assigning to the same partner is a no-op rather than an error', async () => {
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    const again = await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    expect(again.assigned).toBe(false);
    expect(again.reason).toBe('already_held_by_this_partner');
  });

  test('a released territory can be claimed by someone else', async () => {
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    await svc.releaseTerritory({ territoryId: T_VERIFIED });

    const result = await svc.assignTerritory({ franchisePartnerId: PARTNER_B, territoryId: T_VERIFIED });
    expect(result.assigned).toBe(true);
  });

  test('a transfer moves the territory and records both sides', async () => {
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    const result = await svc.transferTerritory({ territoryId: T_VERIFIED, toFranchisePartnerId: PARTNER_B });

    expect(result.transferred).toBe(true);
    expect(result.from_franchise_id).toBe(PARTNER_A);
    // Stated in the return value, because the caller's next question is always
    // whether past revenue moved too.
    expect(result.historical_attribution).toBe('unchanged');

    const holder = await svc.franchiseForTerritory(T_VERIFIED);
    expect(holder.franchise_partner_id).toBe(PARTNER_B);
  });

  test('a transfer leaves the previous holder attributable for past dates', async () => {
    // The Phase 6 reassignment case: last month's orders belong to whoever held
    // the territory then, and that money has in many cases already been paid.
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    await new Promise((resolve) => setTimeout(resolve, 1100)); // distinct timestamps
    await svc.transferTerritory({ territoryId: T_VERIFIED, toFranchisePartnerId: PARTNER_B });

    const now = await svc.holderAt(T_VERIFIED, Date.now() + 1000);
    expect(now).toBe(PARTNER_B);

    const earlier = await svc.holderAt(T_VERIFIED, Date.now() - 600000);
    // Either the previous holder or null, but never the new one: the new
    // partner must not be credited for a period they did not hold.
    expect(earlier).not.toBe(PARTNER_B);
  });

  test('assignment fails clearly for a territory that does not exist', async () => {
    await expect(
      svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: 'no-such-territory' })
    ).rejects.toThrow(/No territory with id/);
  });

  test('the effective commission prefers a territory override, including zero', async () => {
    // 0 means "this territory earns nothing" and must not collapse to the
    // partner rate the way `||` would make it.
    await svc.assignTerritory({
      franchisePartnerId: PARTNER_A,
      territoryId: T_VERIFIED,
      commissionRate: 0,
    });
    const resolved = await svc.resolveByPincode('411001');
    expect(resolved.commission.rate).toBe(0);
    expect(resolved.commission.source).toBe('territory');
  });

  test('a territory with no override falls back to the partner rate', async () => {
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    const resolved = await svc.resolveByPincode('411001');
    expect(resolved.commission.rate).toBe(10);
    expect(resolved.commission.source).toBe('partner');
  });
});

describe('unassigned areas', () => {
  test('a valid but unserved pincode is recorded as a coverage gap, not an error', async () => {
    await query("DELETE FROM territory_coverage_gaps WHERE pincode = '999999'");
    const result = await svc.resolveByPincode('999999');

    expect(result.resolved).toBe(false);
    expect(result.reason).toBe('no_territory_for_pincode');

    const gap = await queryOne('SELECT request_count FROM territory_coverage_gaps WHERE pincode = $1', ['999999']);
    expect(gap).toBeTruthy();
    expect(Number(gap.request_count)).toBeGreaterThanOrEqual(1);
  });

  test('repeat requests accumulate rather than duplicating the row', async () => {
    await query("DELETE FROM territory_coverage_gaps WHERE pincode = '999999'");
    await svc.resolveByPincode('999999');
    await svc.resolveByPincode('999999');

    const rows = await query('SELECT request_count FROM territory_coverage_gaps WHERE pincode = $1', ['999999']);
    const list = rows.rows || rows;
    expect(list).toHaveLength(1);
    expect(Number(list[0].request_count)).toBe(2);
  });

  test('partner interest is recorded separately from demand', async () => {
    await query("DELETE FROM territory_coverage_gaps WHERE pincode = '560001'");
    const result = await svc.recordCoverageInterest('560 001');
    expect(result.recorded).toBe(true);
    expect(result.pincode).toBe('560001');

    const gap = await queryOne('SELECT interest_count FROM territory_coverage_gaps WHERE pincode = $1', ['560001']);
    expect(Number(gap.interest_count)).toBe(1);
  });

  test('an invalid pincode is not recorded as a gap', async () => {
    // A typo is not a franchise opportunity, and recording it would pollute the
    // list an operator uses to decide where to sell next.
    const before = await queryOne('SELECT COUNT(*) AS c FROM territory_coverage_gaps');
    await svc.resolveByPincode('abc');
    const after = await queryOne('SELECT COUNT(*) AS c FROM territory_coverage_gaps');
    expect(Number(after.c)).toBe(Number(before.c));
  });
});

describe('franchise scoping', () => {
  const requestFor = (overrides) => ({ user: { id: USER_A, role: 'franchise_owner' }, ...overrides });

  test('an administrator is unscoped', async () => {
    const req = { user: { id: 'someone', role: 'super_admin' } };
    await scope.attachFranchiseScope(req, {}, () => {});
    expect(req.franchiseScope.scoped).toBe(false);
    expect(scope.scopeClause(req, 's.pincode').sql).toBe('1 = 1');
  });

  test('a partner is scoped to the pincodes they actually hold', async () => {
    await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'tr-test-%'");
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });

    const req = requestFor({});
    await scope.attachFranchiseScope(req, {}, () => {});

    expect(req.franchiseScope.scoped).toBe(true);
    expect(req.franchiseScope.pincodes).toEqual(['411001']);
  });

  test('a partner with no territories is denied everything, not granted everything', async () => {
    // The failure that leaks the whole platform: treating an empty scope as
    // "no restriction".
    await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'tr-test-%'");

    const req = requestFor({});
    await scope.attachFranchiseScope(req, {}, () => {});

    expect(req.franchiseScope.pincodes).toEqual([]);
    expect(scope.scopeClause(req, 's.pincode').sql).toBe('1 = 0');
  });

  test('scopeClause numbers its parameters from the given offset', async () => {
    await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'tr-test-%'");
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });

    const req = requestFor({});
    await scope.attachFranchiseScope(req, {}, () => {});

    const clause = scope.scopeClause(req, 's.pincode', 3);
    expect(clause.sql).toBe('s.pincode IN ($4)');
    expect(clause.params).toEqual(['411001']);
  });

  test('cross-franchise access is refused', async () => {
    // Partner A holds 411001. Partner B's territory must be invisible to them.
    await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'tr-test-%'");
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });
    await svc.assignTerritory({ franchisePartnerId: PARTNER_B, territoryId: T_ADJACENT });

    const req = requestFor({});
    await scope.attachFranchiseScope(req, {}, () => {});

    expect(scope.coversPincode(req, '411001')).toBe(true);
    expect(scope.coversPincode(req, '411002')).toBe(false);
  });

  test('coverage checks normalise before comparing', async () => {
    await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'tr-test-%'");
    await svc.assignTerritory({ franchisePartnerId: PARTNER_A, territoryId: T_VERIFIED });

    const req = requestFor({});
    await scope.attachFranchiseScope(req, {}, () => {});

    // A partner holding "411001" must not be refused because the request said
    // "411 001", nor allowed something by an unnormalised comparison passing.
    expect(scope.coversPincode(req, '411 001')).toBe(true);
    expect(scope.coversPincode(req, 'garbage')).toBe(false);
  });

  test('a non-partner account gets an empty scope with a stated reason', async () => {
    const req = { user: { id: 'tr-test-not-a-partner', role: 'user' } };
    await scope.attachFranchiseScope(req, {}, () => {});
    expect(req.franchiseScope.pincodes).toEqual([]);
    expect(req.franchiseScope.reason).toBe('not_a_franchise_partner');
  });

  test('an unauthenticated request is scoped to nothing', async () => {
    const req = {};
    await scope.attachFranchiseScope(req, {}, () => {});
    expect(req.franchiseScope.scoped).toBe(true);
    expect(scope.scopeClause(req, 's.pincode').sql).toBe('1 = 0');
  });

  test('requireFranchise rejects a partner with no territories', async () => {
    await query("DELETE FROM franchise_territories WHERE territory_id LIKE 'tr-test-%'");
    const req = requestFor({});
    await scope.attachFranchiseScope(req, {}, () => {});

    let status = null;
    let body = null;
    const res = {
      status(code) { status = code; return this; },
      json(payload) { body = payload; return this; },
    };
    let nexted = false;
    scope.requireFranchise(req, res, () => { nexted = true; });

    expect(nexted).toBe(false);
    expect(status).toBe(403);
    expect(body.reason).toBe('no_territories_assigned');
  });
});

describe('borderline coordinates', () => {
  test('a point in two territories resolves deterministically', () => {
    // The same coordinate must not resolve to a different franchise on two
    // requests: that splits an order from its own commission record.
    const hits = [
      { row: { id: 'b-territory', name: 'B' }, geometry: spatial.parseBoundary(PUNE_SQUARE) },
      { row: { id: 'a-territory', name: 'A' }, geometry: spatial.parseBoundary(OVERLAPPING_SQUARE) },
    ];

    const first = svc.breakBorderlineTie(hits, 18.53, 73.88);
    const second = svc.breakBorderlineTie(hits.slice().reverse(), 18.53, 73.88);

    expect(first.row.id).toBe(second.row.id);
    expect(first.ambiguous).toBe(true);
    expect(first.candidates.length).toBe(2);
  });

  test('the territory the point sits furthest inside wins', () => {
    const hits = [
      { row: { id: 'edge', name: 'edge' }, geometry: spatial.parseBoundary(ADJACENT_SQUARE) },
      { row: { id: 'deep', name: 'deep' }, geometry: spatial.parseBoundary(PUNE_SQUARE) },
    ];
    // 73.87 is well inside PUNE_SQUARE and outside ADJACENT_SQUARE's interior.
    const decision = svc.breakBorderlineTie(hits, 18.53, 73.87);
    expect(decision.row.id).toBe('deep');
  });

  test('a single containing territory is not flagged ambiguous', () => {
    const hits = [{ row: { id: 'only' }, geometry: spatial.parseBoundary(PUNE_SQUARE) }];
    const decision = svc.breakBorderlineTie(hits, 18.53, 73.87);
    expect(decision.ambiguous).toBe(false);
  });
});

describe('coverage reporting', () => {
  test('reports how much attribution can come from real geometry', async () => {
    const stats = await svc.coverageStats();
    expect(stats.territories).toBeGreaterThan(0);
    expect(stats).toHaveProperty('boundary_coverage');
    // The figure an operator needs: the share of territories whose boundary is
    // trustworthy enough to attribute revenue.
    expect(stats.boundary_coverage).toBeGreaterThanOrEqual(0);
    expect(stats.boundary_coverage).toBeLessThanOrEqual(1);
  });
});

/**
 * Geographic data trust.
 *
 * The coordinates on `regions` and `territories` are fabricated: uniform random
 * noise over a box roughly covering Maharashtra, attached to genuine place
 * names and genuine pincodes. That combination is what makes them dangerous —
 * every field around them is correct, so nothing looks wrong.
 *
 * These tests do two jobs. They document the evidence in a form that runs, so
 * the claim can be re-checked rather than taken on trust. And they hold the
 * guard in place: spatial lookups must keep refusing unverified centroids, so
 * that removing the filter to "make territory assignment work again" fails here
 * rather than silently shipping an assignment engine that puts a user in Pune
 * into a territory 400 km away.
 */

process.env.USE_SQLITE = 'true';

const { query } = require('../../config/database');

/** Great-circle distance in kilometres. */
function km(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Largest distance between any two territories sharing a pincode prefix.
 *
 * The first three digits of an Indian pincode identify a postal sorting
 * district. Real centroids within one span well under 60 km. This is the
 * measurement that distinguishes a dataset with errors from no dataset at all,
 * and it needs no external reference data to compute.
 */
async function spreadByPincodePrefix(minGroupSize = 5) {
  const res = await query(
    `SELECT pincode, centroid_lat AS lat, centroid_lng AS lng
       FROM territories
      WHERE pincode IS NOT NULL AND centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL`
  );
  const rows = res.rows || res || [];

  const groups = new Map();
  for (const row of rows) {
    const prefix = String(row.pincode).slice(0, 3);
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(row);
  }

  const spreads = [];
  for (const [prefix, list] of groups) {
    if (list.length < minGroupSize) continue;
    let max = 0;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const d = km(list[i].lat, list[i].lng, list[j].lat, list[j].lng);
        if (d > max) max = d;
      }
    }
    spreads.push({ prefix, count: list.length, maxKm: max });
  }
  return spreads;
}

describe('the stored coordinates are not real', () => {
  test('territories sharing a pincode prefix are scattered, not clustered', async () => {
    const spreads = await spreadByPincodePrefix();
    if (spreads.length === 0) return; // no data in this environment

    const mean = spreads.reduce((a, b) => a + b.maxKm, 0) / spreads.length;
    // A postal sorting district spans tens of kilometres. Measured here at
    // ~899 km. If this ever drops below 200 the data has been replaced with
    // something real and the guards below can be revisited.
    expect(mean).toBeGreaterThan(200);
  });

  test('no territory centroid is marked verified', async () => {
    // Migration 097 flags every existing row. A row claiming verification
    // without an import having happened is the failure mode worth catching.
    const res = await query(
      'SELECT COUNT(*) AS n FROM territories WHERE COALESCE(centroid_verified, 0) = 1'
    );
    const verified = Number((res.rows || res || [])[0]?.n || 0);
    expect(verified).toBe(0);
  });
});

describe('spatial lookups refuse unverified coordinates', () => {
  test('nearestTerritory returns null rather than a confident guess', async () => {
    // The guard that matters. Without it this returns the closest territory by
    // a random centroid, and territory assignment decides which shops a user
    // sees and which admin manages them.
    const spatial = require('../../repositories/spatial.repository');
    const result = await spatial.nearestTerritory(18.5786, 73.8967);
    expect(result).toBeNull();
  });

  test('nearestTerritories returns nothing rather than arbitrary neighbours', async () => {
    const spatial = require('../../repositories/spatial.repository');
    const result = await spatial.nearestTerritories(18.5786, 73.8967, 10, 5);
    expect(result).toEqual([]);
  });

  test('the query filters on the verification flag', () => {
    // Read as text: a future edit that drops the filter to "fix" territory
    // assignment should fail here with an explanation rather than ship.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'repositories', 'spatial.repository.js'),
      'utf8'
    );
    const matches = src.match(/COALESCE\(t\.centroid_verified, 0\) = 1/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('resolveTerritory prefers data that is real', () => {
  test('reports how it reached an answer', async () => {
    const spatial = require('../../repositories/spatial.repository');
    const result = await spatial.resolveTerritory({ lat: 18.5786, lng: 73.8967 });
    // With no verified centroid and no pincode there is no honest answer, and
    // the method says so instead of the caller having to infer it.
    expect(result).toHaveProperty('method');
    expect(['pincode', 'boundary', 'centroid', 'unresolved']).toContain(result.method);
  });

  test('resolves by pincode, which is genuine data', async () => {
    const spatial = require('../../repositories/spatial.repository');
    const res = await query('SELECT pincode FROM territories WHERE pincode IS NOT NULL LIMIT 1');
    const pincode = (res.rows || res || [])[0]?.pincode;
    if (!pincode) return;

    const result = await spatial.resolveTerritory({ pincode });
    expect(result.method).toBe('pincode');
    expect(result.territory).toBeTruthy();
  });

  test('an unknown pincode is unresolved, not guessed', async () => {
    const spatial = require('../../repositories/spatial.repository');
    const result = await spatial.resolveTerritory({ pincode: '999999' });
    expect(result.method).toBe('unresolved');
    expect(result.territory).toBeNull();
  });
});

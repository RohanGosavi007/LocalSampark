/**
 * ═══════════════════════════════════════════════════════════════════════
 * Territory Validator — Zero-Overlap Geofencing & PiP Shop Onboarding
 * ═══════════════════════════════════════════════════════════════════════
 */

const turf = require('@turf/turf');
const { query } = require('../config/database');
const spatialRepo = require('../repositories/spatial.repository');

class TerritoryValidator {

  /**
   * Validate that a new territory boundary does NOT overlap any existing territory.
   * Zero-overlap policy: if ANY intersection is detected, reject.
   * 
   * @param {object} newBoundaryGeoJSON - GeoJSON Polygon of the proposed territory
   * @param {string} [excludeTerritoryId] - Territory to exclude (for updates)
   * @returns {{ valid: boolean, conflicts: Array }}
   */
  async validateTerritoryBoundary(newBoundaryGeoJSON, excludeTerritoryId = null) {
    const result = await query(`
      SELECT id, name, pincode, boundary_geojson 
      FROM territories 
      WHERE is_active = true AND boundary_geojson IS NOT NULL
    `);
    const existing = result.rows || result;
    const conflicts = [];

    let newPoly;
    try {
      newPoly = turf.polygon(newBoundaryGeoJSON.coordinates);
    } catch (e) {
      return { valid: false, error: 'INVALID_GEOJSON', message: 'The provided boundary is not a valid GeoJSON Polygon.' };
    }

    for (const territory of existing) {
      // Skip self when updating
      if (excludeTerritoryId && territory.id === excludeTerritoryId) continue;

      try {
        const existingGeoJSON = JSON.parse(territory.boundary_geojson);
        const existingPoly = turf.polygon(existingGeoJSON.coordinates);

        const intersection = turf.intersect(turf.featureCollection([newPoly, existingPoly]));

        if (intersection !== null) {
          // Calculate overlap area for reporting
          const overlapAreaKm2 = turf.area(intersection) / 1e6;

          conflicts.push({
            territoryId: territory.id,
            name: territory.name,
            pincode: territory.pincode,
            overlapAreaKm2: Math.round(overlapAreaKm2 * 1000) / 1000
          });
        }
      } catch (e) {
        // Skip territories with corrupt GeoJSON
        continue;
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
      message: conflicts.length > 0
        ? `Boundary overlaps with ${conflicts.length} existing territory(ies). Zero-overlap policy violated.`
        : 'Boundary is valid. No overlaps detected.'
    };
  }

  /**
   * Validate a shop's coordinates for onboarding.
   * Runs PiP to find which territory the shop belongs to.
   * 
   * Tie-breaker: If a point falls exactly on a boundary shared by two territories,
   * assign to the territory with the LOWER pincode (deterministic).
   * 
   * @param {number} lat - Shop latitude
   * @param {number} lng - Shop longitude
   * @returns {{ territoryId, territoryName, pincode } | { error: 'OUT_OF_BOUNDS' }}
   */
  async validateShopCoordinates(lat, lng) {
    // First try exact PiP via spatial repository
    const matched = await spatialRepo.pointInTerritory(lat, lng);

    if (matched) {
      return {
        territoryId: matched.id,
        territoryName: matched.name,
        pincode: matched.pincode,
        district: matched.district_name,
        taluka: matched.taluka_name
      };
    }

    // Edge case: Check if point is on boundary of multiple territories
    const result = await query(`
      SELECT id, name, pincode, boundary_geojson 
      FROM territories 
      WHERE is_active = true AND boundary_geojson IS NOT NULL
    `);
    const territories = result.rows || result;
    const point = turf.point([lng, lat]);
    const boundaryMatches = [];

    for (const t of territories) {
      try {
        const boundary = JSON.parse(t.boundary_geojson);
        const polygon = turf.polygon(boundary.coordinates);
        const line = turf.polygonToLine(polygon);
        const distToEdge = turf.pointToLineDistance(point, line, { units: 'meters' });

        // Within 1 meter of boundary = ON the boundary
        if (distToEdge <= 1.0) {
          boundaryMatches.push(t);
        }
      } catch (e) {
        continue;
      }
    }

    // Tie-breaker: lower pincode wins
    if (boundaryMatches.length > 0) {
      boundaryMatches.sort((a, b) => parseInt(a.pincode) - parseInt(b.pincode));
      const winner = boundaryMatches[0];
      return {
        territoryId: winner.id,
        territoryName: winner.name,
        pincode: winner.pincode,
        tieBreaker: true,
        message: `Point on boundary — assigned to ${winner.name} (${winner.pincode}) via lower-pincode tie-breaker.`
      };
    }

    // Truly out of bounds
    return {
      error: 'OUT_OF_BOUNDS',
      message: `Coordinates (${lat}, ${lng}) do not fall within any active territory.`,
      nearestTerritory: await spatialRepo.nearestTerritory(lat, lng)
    };
  }
}

module.exports = new TerritoryValidator();

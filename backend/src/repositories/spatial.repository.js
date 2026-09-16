/**
 * ═══════════════════════════════════════════════════════════════════════
 * SPATIAL REPOSITORY — The Single-File PostGIS Swap Layer
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * THIS IS THE ONLY FILE that needs modification when migrating from
 * SQLite + Turf.js → PostgreSQL + PostGIS.
 * 
 * Every spatial operation (PiP, intersection, distance, centroid) is
 * implemented here using Turf.js for SQLite, with commented PostGIS
 * SQL equivalents ready to uncomment.
 * 
 * Environment: process.env.USE_SQLITE === 'true' → Turf.js path
 *              otherwise → PostGIS path (uncomment when ready)
 * ═══════════════════════════════════════════════════════════════════════
 */

const turf = require('@turf/turf');
const { query, queryOne } = require('../config/database');
const pincodeUtil = require('../utils/pincode');

/**
 * Shared-edge tolerance for overlap detection, in square kilometres.
 *
 * Two territories snapped to the same street share a boundary line, and the
 * intersection of their polygons is a sliver with area at floating-point noise
 * level rather than exactly zero. Anything below this is a shared border;
 * anything above is two franchises claiming the same ground.
 */
const OVERLAP_TOLERANCE_KM2 = 1e-6;

class SpatialRepository {

  /**
   * Point-in-Territory (PiP) Resolution
   * Given GPS coordinates, find which territory the point falls in.
   * 
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {object|null} Territory record or null if out-of-bounds
   * 
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ PostGIS Equivalent:                                            │
   * │ SELECT t.*, lt.name as taluka_name, ld.name as district_name   │
   * │ FROM territories t                                             │
   * │ JOIN location_talukas lt ON t.taluka_id = lt.id                │
   * │ JOIN location_districts ld ON lt.district_id = ld.id           │
   * │ WHERE ST_Contains(t.boundary, ST_SetSRID(ST_Point($2,$1),4326))│
   * │ AND t.is_active = true                                            │
   * │ LIMIT 1;                                                       │
   * └─────────────────────────────────────────────────────────────────┘
   */
  async pointInTerritory(lat, lng) {
    // Verified boundaries only.
    //
    // This filter was missing, and its absence was the most consequential
    // defect in the spatial layer. nearestTerritory below has always refused
    // unverified *centroids*, because those coordinates are uniform random
    // noise. But every row's boundary_geojson is a 5 km circle generated around
    // that same fabricated centroid, so the polygon path was serving confident
    // answers derived from precisely the data the centroid path refuses.
    //
    // Measured: pointInTerritory(16.8167, 73.0973) returned "Aurangabad City"
    // — a point 415 km from real Aurangabad, out on the Konkan coast. Franchise
    // attribution, commission and lead routing all read that answer.
    //
    // Migration 101 adds boundary_verified and flags every existing row 0, so
    // this returns null until real boundaries are imported. Null is the honest
    // answer; resolveTerritory falls back to pincode, which is genuine data.
    const result = await query(`
      SELECT t.*, lt.name as taluka_name, ld.name as district_name, ls.name as state_name
      FROM territories t
      JOIN location_talukas lt ON t.taluka_id = lt.id
      JOIN location_districts ld ON lt.district_id = ld.id
      JOIN location_states ls ON ld.state_id = ls.id
      WHERE t.is_active = true
        AND t.boundary_geojson IS NOT NULL
        AND COALESCE(t.boundary_verified, 0) = 1
    `);

    const territories = result.rows || result;
    const point = turf.point([lng, lat]); // GeoJSON uses [lng, lat]

    for (const territory of territories) {
      try {
        const geometry = this.parseBoundary(territory.boundary_geojson);
        if (!geometry) continue;
        if (turf.booleanPointInPolygon(point, geometry)) {
          return territory;
        }
      } catch (e) {
        // Skip territories with invalid GeoJSON
        continue;
      }
    }

    // No internal fallback.
    //
    // This used to return this.nearestTerritory(lat, lng) here, which made
    // resolveTerritory report method:'boundary' for an answer that was actually
    // reached by centroid proximity. The whole point of returning a method is
    // that a caller can tell a lookup from a guess, and a mislabelled guess is
    // worse than no label at all. resolveTerritory does the fallback itself and
    // labels it correctly.
    return null;
  }

  /**
   * Parses a stored boundary into a Turf geometry.
   *
   * Handles Polygon and MultiPolygon, and a bare coordinate array. The previous
   * inline version called turf.polygon(boundary.coordinates || [boundary]),
   * which throws on a MultiPolygon — the exact type the audit brief asks
   * territories to support — and the throw was swallowed by the surrounding
   * catch, so a MultiPolygon territory silently matched nothing rather than
   * reporting a problem.
   */
  parseBoundary(raw) {
    if (!raw) return null;

    let parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return null;
    }
    if (!parsed) return null;

    // A Feature wrapper, which is what most GIS exports produce.
    const geometry = parsed.type === 'Feature' ? parsed.geometry : parsed;
    if (!geometry) return null;

    try {
      if (geometry.type === 'MultiPolygon') {
        return turf.multiPolygon(geometry.coordinates);
      }
      if (geometry.type === 'Polygon') {
        return turf.polygon(geometry.coordinates);
      }
      // A bare coordinate array, as some older rows store.
      if (Array.isArray(geometry)) {
        return turf.polygon(geometry);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  /**
   * Find the single nearest territory by centroid distance.
   * Used as fallback when PiP polygon check fails (no boundaries defined).
   * 
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ PostGIS Equivalent:                                            │
   * │ SELECT t.*, ST_Distance(                                       │
   * │   t.centroid::geography,                                       │
   * │   ST_SetSRID(ST_Point($2,$1),4326)::geography                  │
   * │ ) / 1000.0 as distance_km                                      │
   * │ FROM territories t WHERE t.is_active = true                       │
   * │ ORDER BY t.centroid <-> ST_SetSRID(ST_Point($2,$1),4326)       │
   * │ LIMIT 1;                                                       │
   * └─────────────────────────────────────────────────────────────────┘
   */
  async nearestTerritory(lat, lng) {
    // Only verified centroids. The coordinates currently stored on territories
    // are uniform random noise attached to genuine place names and pincodes —
    // territories sharing a pincode prefix, which in reality span under 60 km,
    // are spread over ~900 km here. Ranking by distance against them would
    // assign a user in Pune to an arbitrary territory hundreds of kilometres
    // away, confidently and silently, and territory assignment decides which
    // shops that user sees and which admin manages them.
    //
    // Migration 097 flags every existing row unverified, so this returns null
    // until real centroids are imported. Null is the honest answer: callers can
    // fall back to territoryByPincode(), which uses data that IS real.
    const result = await query(`
      SELECT t.*, lt.name as taluka_name, ld.name as district_name, ls.name as state_name
      FROM territories t
      JOIN location_talukas lt ON t.taluka_id = lt.id
      JOIN location_districts ld ON lt.district_id = ld.id
      JOIN location_states ls ON ld.state_id = ls.id
      WHERE t.is_active = true
        AND COALESCE(t.centroid_verified, 0) = 1
    `);

    const territories = result.rows || result;
    if (territories.length === 0) return null;

    const from = turf.point([lng, lat]);
    let closest = null;
    let minDist = Infinity;

    for (const t of territories) {
      if (t.centroid_lat && t.centroid_lng) {
        const to = turf.point([t.centroid_lng, t.centroid_lat]);
        const dist = turf.distance(from, to, { units: 'kilometers' });
        if (dist < minDist) {
          minDist = dist;
          closest = { ...t, distance_km: Math.round(dist * 100) / 100 };
        }
      }
    }

    return closest;
  }

  /**
   * Find multiple nearby territories within a radius.
   * Used by the radius fallback engine (Phase 4).
   * 
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @param {number} limit - Max results
   * @returns {Array} Sorted by distance ascending
   * 
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ PostGIS Equivalent:                                            │
   * │ SELECT t.*, ST_Distance(                                       │
   * │   t.centroid::geography,                                       │
   * │   ST_SetSRID(ST_Point($2,$1),4326)::geography                  │
   * │ ) / 1000.0 as distance_km                                      │
   * │ FROM territories t                                              │
   * │ WHERE t.is_active = true                                          │
   * │ AND ST_DWithin(                                                │
   * │   t.centroid::geography,                                       │
   * │   ST_SetSRID(ST_Point($2,$1),4326)::geography,                │
   * │   $3 * 1000                                                    │
   * │ )                                                              │
   * │ ORDER BY distance_km ASC LIMIT $4;                             │
   * └─────────────────────────────────────────────────────────────────┘
   */
  async nearestTerritories(lat, lng, radiusKm = 10, limit = 10) {
    // Verified centroids only, for the reason given on nearestTerritory above.
    const result = await query(`
      SELECT t.*, lt.name as taluka_name, ld.name as district_name
      FROM territories t
      JOIN location_talukas lt ON t.taluka_id = lt.id
      JOIN location_districts ld ON lt.district_id = ld.id
      WHERE t.is_active = true
        AND COALESCE(t.centroid_verified, 0) = 1
    `);

    const territories = result.rows || result;
    const from = turf.point([lng, lat]);
    const nearby = [];

    for (const t of territories) {
      if (t.centroid_lat && t.centroid_lng) {
        const to = turf.point([t.centroid_lng, t.centroid_lat]);
        const dist = turf.distance(from, to, { units: 'kilometers' });
        if (dist <= radiusKm) {
          nearby.push({ ...t, distance_km: Math.round(dist * 100) / 100 });
        }
      }
    }

    // Sort by distance ascending, limit results
    nearby.sort((a, b) => a.distance_km - b.distance_km);
    return nearby.slice(0, limit);
  }

  /**
   * Check if two territory boundaries intersect (overlap).
   * Used by the zero-overlap validator (Phase 2).
   * 
   * @param {object} geojsonA - GeoJSON Polygon
   * @param {object} geojsonB - GeoJSON Polygon
   * @returns {boolean} true if they intersect
   * 
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ PostGIS Equivalent:                                            │
   * │ SELECT ST_Intersects(                                          │
   * │   ST_GeomFromGeoJSON($1),                                      │
   * │   ST_GeomFromGeoJSON($2)                                       │
   * │ ) as intersects;                                               │
   * └─────────────────────────────────────────────────────────────────┘
   */
  territoriesIntersect(geojsonA, geojsonB) {
    const polyA = this.parseBoundary(geojsonA);
    const polyB = this.parseBoundary(geojsonB);
    if (!polyA || !polyB) return false;

    try {
      // Touching at a shared edge is not an overlap.
      //
      // Adjacent territories drawn by snapping to a common street share a
      // boundary line by construction, and turf.intersect returns a
      // zero-area geometry for that — non-null, so a plain null check called
      // every pair of neighbouring territories a conflict and made it
      // impossible to draw a contiguous map. Requiring real area is what
      // distinguishes "these share a border" from "these claim the same
      // ground".
      const intersection = turf.intersect(turf.featureCollection([polyA, polyB]));
      if (!intersection) return false;

      const overlapKm2 = turf.area(intersection) / 1e6;
      return overlapKm2 > OVERLAP_TOLERANCE_KM2;
    } catch (e) {
      // A failed geometry operation must not read as "no overlap": that is the
      // answer that lets a conflicting territory be created. Unknown is treated
      // as conflicting, and the caller decides.
      console.error('[SpatialRepo] Intersection check failed:', e.message);
      return true;
    }
  }

  /**
   * Area of the overlap between two boundaries, in square kilometres.
   *
   * Returned to the admin UI so a conflict can be reported as "these overlap by
   * 2.3 km²" rather than as a bare rejection an operator cannot act on.
   */
  overlapAreaKm2(geojsonA, geojsonB) {
    const polyA = this.parseBoundary(geojsonA);
    const polyB = this.parseBoundary(geojsonB);
    if (!polyA || !polyB) return 0;
    try {
      const intersection = turf.intersect(turf.featureCollection([polyA, polyB]));
      return intersection ? turf.area(intersection) / 1e6 : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Check if a specific territory contains a point.
   * 
   * @param {string} territoryId - Territory ID
   * @param {number} lat - Point latitude
   * @param {number} lng - Point longitude
   * @returns {boolean}
   * 
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ PostGIS Equivalent:                                            │
   * │ SELECT ST_Contains(                                            │
   * │   boundary,                                                    │
   * │   ST_SetSRID(ST_Point($3, $2), 4326)                          │
   * │ ) as contains                                                  │
   * │ FROM territories WHERE id = $1;                                │
   * └─────────────────────────────────────────────────────────────────┘
   */
  async territoryContainsPoint(territoryId, lat, lng) {
    // Verified boundaries only, for the reason given on pointInTerritory.
    // Answering "yes, this point is in that territory" from a fabricated
    // circle is the same false confidence whether the caller named the
    // territory or asked us to find it.
    const territory = await queryOne(
      `SELECT boundary_geojson FROM territories
        WHERE id = $1 AND COALESCE(boundary_verified, 0) = 1`,
      [territoryId]
    );

    if (!territory || !territory.boundary_geojson) return false;

    const geometry = this.parseBoundary(territory.boundary_geojson);
    if (!geometry) return false;

    try {
      return turf.booleanPointInPolygon(turf.point([lng, lat]), geometry);
    } catch (e) {
      return false;
    }
  }

  /**
   * Compute the centroid of a GeoJSON polygon.
   * 
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ PostGIS: SELECT ST_Centroid(ST_GeomFromGeoJSON($1))            │
   * └─────────────────────────────────────────────────────────────────┘
   */
  computeCentroid(geojson) {
    try {
      const polygon = turf.polygon(geojson.coordinates);
      const centroid = turf.centroid(polygon);
      return {
        lat: centroid.geometry.coordinates[1],
        lng: centroid.geometry.coordinates[0]
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Compute the area of a GeoJSON polygon in square kilometers.
   * Useful for admin analytics.
   * 
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ PostGIS: SELECT ST_Area(boundary::geography) / 1e6 as area_km2 │
   * └─────────────────────────────────────────────────────────────────┘
   */
  computeAreaKm2(geojson) {
    try {
      const polygon = turf.polygon(geojson.coordinates);
      return turf.area(polygon) / 1e6; // m² to km²
    } catch (e) {
      return 0;
    }
  }

  /**
   * Resolve a territory by pincode (fast lookup, no spatial calc needed).
   */
  /**
   * Resolves a user to a territory using the most reliable signal available.
   *
   * Pincode first, because territories.pincode is real data — "411019
   * Chinchwad East" is a genuine Pune pincode attached to a genuine Pune
   * locality. Only the coordinates are fabricated. Falling back to centroid
   * proximity is correct in principle and will start working the moment
   * verified centroids exist, but today it returns null rather than a
   * confident guess.
   *
   * Returns { territory, method } so a caller can tell how the answer was
   * reached instead of treating a guess and a lookup as the same thing.
   */
  async resolveTerritory({ pincode = null, lat = null, lng = null } = {}) {
    if (pincode) {
      const byPincode = await this.territoryByPincode(pincode);
      if (byPincode) return { territory: byPincode, method: 'pincode' };
    }

    if (lat != null && lng != null) {
      const containing = await this.pointInTerritory(lat, lng);
      if (containing) return { territory: containing, method: 'boundary' };

      const nearest = await this.nearestTerritory(lat, lng);
      if (nearest) return { territory: nearest, method: 'centroid' };
    }

    return { territory: null, method: 'unresolved' };
  }

  async territoryByPincode(pincode) {
    // Normalised at the boundary. Callers pass whatever a form, a CSV or a URL
    // parameter gave them, so "411 001" and 411001 reached this as a literal
    // and matched nothing — a merchant stored under "411001" was simply
    // invisible, with no error to explain it.
    const normalized = pincodeUtil.normalize(pincode);
    if (!normalized) return null;

    return queryOne(`
      SELECT t.*, lt.name as taluka_name, ld.name as district_name, ls.name as state_name
      FROM territories t
      JOIN location_talukas lt ON t.taluka_id = lt.id
      JOIN location_districts ld ON lt.district_id = ld.id
      JOIN location_states ls ON ld.state_id = ls.id
      WHERE t.pincode = $1 AND t.is_active = true
    `, [normalized]);
  }

  /**
   * Get full 4-tier hierarchy for API responses.
   */
  async getFullHierarchy() {
    const states = await query('SELECT * FROM location_states ORDER BY name');
    const districts = await query('SELECT * FROM location_districts ORDER BY name');
    const talukas = await query('SELECT * FROM location_talukas ORDER BY name');
    const territories = await query('SELECT * FROM territories WHERE is_active = true ORDER BY name');

    return {
      states: states.rows || states,
      districts: districts.rows || districts,
      talukas: talukas.rows || talukas,
      territories: territories.rows || territories
    };
  }
}

// Singleton export
module.exports = new SpatialRepository();

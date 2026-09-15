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
    // Load all active territories with boundaries
    const result = await query(`
      SELECT t.*, lt.name as taluka_name, ld.name as district_name, ls.name as state_name
      FROM territories t
      JOIN location_talukas lt ON t.taluka_id = lt.id
      JOIN location_districts ld ON lt.district_id = ld.id
      JOIN location_states ls ON ld.state_id = ls.id
      WHERE t.is_active = true AND t.boundary_geojson IS NOT NULL
    `);

    const territories = result.rows || result;
    const point = turf.point([lng, lat]); // GeoJSON uses [lng, lat]

    for (const territory of territories) {
      try {
        const boundary = JSON.parse(territory.boundary_geojson);
        const polygon = turf.polygon(boundary.coordinates || [boundary]);

        if (turf.booleanPointInPolygon(point, polygon)) {
          return territory;
        }
      } catch (e) {
        // Skip territories with invalid GeoJSON
        continue;
      }
    }

    // Fallback: If no polygon match, find nearest by centroid distance
    return this.nearestTerritory(lat, lng);
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
    try {
      const polyA = turf.polygon(geojsonA.coordinates);
      const polyB = turf.polygon(geojsonB.coordinates);
      const intersection = turf.intersect(turf.featureCollection([polyA, polyB]));
      return intersection !== null;
    } catch (e) {
      console.error('[SpatialRepo] Intersection check failed:', e.message);
      return false;
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
    const territory = await queryOne(
      'SELECT boundary_geojson FROM territories WHERE id = $1',
      [territoryId]
    );

    if (!territory || !territory.boundary_geojson) return false;

    try {
      const boundary = JSON.parse(territory.boundary_geojson);
      const polygon = turf.polygon(boundary.coordinates);
      const point = turf.point([lng, lat]);
      return turf.booleanPointInPolygon(point, polygon);
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
    return queryOne(`
      SELECT t.*, lt.name as taluka_name, ld.name as district_name, ls.name as state_name
      FROM territories t
      JOIN location_talukas lt ON t.taluka_id = lt.id
      JOIN location_districts ld ON lt.district_id = ld.id
      JOIN location_states ls ON ld.state_id = ls.id
      WHERE t.pincode = $1 AND t.is_active = true
    `, [pincode]);
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

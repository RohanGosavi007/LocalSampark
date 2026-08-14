/**
 * ═══════════════════════════════════════════════════════════════════════
 * Radius Fallback Service — Spatial Expansion Engine
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * When a category query in a territory returns < minResults, this engine
 * progressively expands the search radius (5km → 10km → 15km) to find
 * shops in neighboring territories, sorted by proximity.
 * ═══════════════════════════════════════════════════════════════════════
 */

const { query, queryOne } = require('../config/database');
const spatialRepo = require('../repositories/spatial.repository');
const turf = require('@turf/turf');

class RadiusFallbackService {

  /**
   * Expand search when primary territory has too few results.
   * 
   * @param {string} territoryId - Primary territory ID
   * @param {string} category - Shop category filter (optional)
   * @param {number} minResults - Minimum acceptable results (default 5)
   * @param {number} maxRadiusKm - Maximum expansion radius (default 15)
   * @returns {{ shops: Array, meta: { expanded: boolean, radiusKm: number, territoryCount: number } }}
   */
  async expandSearch(territoryId, category = null, minResults = 5, maxRadiusKm = 15) {
    // Step 1: Query shops in the primary territory
    let sql = `SELECT ls.*, r.name as region_name, r.pincode as region_pincode
               FROM local_shops ls
               LEFT JOIN regions r ON ls.region_id = r.id
               WHERE ls.is_active = true`;
    const params = [];
    let paramIdx = 1;

    if (territoryId) {
      sql += ` AND ls.region_id IN (SELECT legacy_region_id FROM legacy_region_territory_map WHERE territory_id = $${paramIdx})`;
      params.push(territoryId);
      paramIdx++;
    }

    if (category) {
      sql += ` AND LOWER(ls.category) = LOWER($${paramIdx})`;
      params.push(category);
      paramIdx++;
    }

    const primaryResult = await query(sql, params);
    const primaryShops = primaryResult.rows || primaryResult;

    // If we have enough results, return without expansion
    if (primaryShops.length >= minResults) {
      return {
        shops: primaryShops,
        meta: { expanded: false, radiusKm: 0, territoryCount: 1, totalResults: primaryShops.length }
      };
    }

    // Step 2: Get territory centroid for radius expansion
    const territory = await queryOne(
      'SELECT centroid_lat, centroid_lng FROM territories WHERE id = $1',
      [territoryId]
    );

    if (!territory || !territory.centroid_lat) {
      return {
        shops: primaryShops,
        meta: { expanded: false, radiusKm: 0, territoryCount: 1, totalResults: primaryShops.length }
      };
    }

    // Step 3: Progressive radius expansion (5km → 10km → 15km)
    const expansionRadii = [5, 10, maxRadiusKm];
    let allShops = [...primaryShops];
    const seenShopIds = new Set(primaryShops.map(s => s.id));
    let usedRadius = 0;
    let territoryCount = 1;

    for (const radius of expansionRadii) {
      if (allShops.length >= minResults) break;

      const nearbyTerritories = await spatialRepo.nearestTerritories(
        territory.centroid_lat,
        territory.centroid_lng,
        radius,
        20
      );

      // Exclude primary territory
      const expandedTerritoryIds = nearbyTerritories
        .filter(t => t.id !== territoryId)
        .map(t => t.id);

      if (expandedTerritoryIds.length === 0) continue;

      // Query shops in expanded territories
      const placeholders = expandedTerritoryIds.map((_, i) => `$${i + 1}`).join(',');
      let expandedSql = `
        SELECT ls.*, r.name as region_name, r.pincode as region_pincode
        FROM local_shops ls
        LEFT JOIN regions r ON ls.region_id = r.id
        WHERE ls.is_active = true
        AND ls.region_id IN (
          SELECT legacy_region_id FROM legacy_region_territory_map 
          WHERE territory_id IN (${placeholders})
        )
      `;
      const expandedParams = [...expandedTerritoryIds];

      if (category) {
        expandedSql += ` AND LOWER(ls.category) = LOWER($${expandedParams.length + 1})`;
        expandedParams.push(category);
      }

      const expandedResult = await query(expandedSql, expandedParams);
      const expandedShops = expandedResult.rows || expandedResult;

      for (const shop of expandedShops) {
        if (!seenShopIds.has(shop.id)) {
          // Calculate distance from user's territory centroid
          let distanceKm = null;
          try {
            const shopCoord = JSON.parse(shop.coordinate || '{}');
            if (shopCoord.lat && shopCoord.lng) {
              const from = turf.point([territory.centroid_lng, territory.centroid_lat]);
              const to = turf.point([shopCoord.lng, shopCoord.lat]);
              distanceKm = Math.round(turf.distance(from, to, { units: 'kilometers' }) * 10) / 10;
            }
          } catch (e) { /* skip distance calc */ }

          allShops.push({ ...shop, isNearby: true, distanceKm });
          seenShopIds.add(shop.id);
        }
      }

      usedRadius = radius;
      territoryCount = 1 + expandedTerritoryIds.length;
    }

    // Sort: primary territory shops first, then nearby by distance
    allShops.sort((a, b) => {
      if (a.isNearby && !b.isNearby) return 1;
      if (!a.isNearby && b.isNearby) return -1;
      return (a.distanceKm || 0) - (b.distanceKm || 0);
    });

    return {
      shops: allShops,
      meta: {
        expanded: usedRadius > 0,
        radiusKm: usedRadius,
        territoryCount,
        totalResults: allShops.length,
        primaryResults: primaryShops.length
      }
    };
  }
}

module.exports = new RadiusFallbackService();

/**
 * ═══════════════════════════════════════════════════════════════════════
 * Zone Scope Middleware — Enterprise Territory Routing Engine
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Resolves the active territory for every incoming request using a
 * strict priority chain. Sets req.territoryId for downstream use.
 * ═══════════════════════════════════════════════════════════════════════
 */

const { queryOne } = require('../config/database');
const spatialRepo = require('../repositories/spatial.repository');

/**
 * Find nearest territory using spatial repository.
 * Replaces the old flat distance calculation.
 */
const findNearestZone = async (lat, lng) => {
  return spatialRepo.nearestTerritory(parseFloat(lat), parseFloat(lng));
};

/**
 * Resolve legacy region_id → territory_id via mapping table.
 */
const resolveRegionToTerritory = async (regionId) => {
  if (!regionId) return null;
  try {
    const mapping = await queryOne(
      'SELECT territory_id FROM legacy_region_territory_map WHERE legacy_region_id = $1',
      [regionId]
    );
    return mapping?.territory_id || null;
  } catch (e) {
    // Mapping table might not exist yet — fallback
    return null;
  }
};

/**
 * Zone scope middleware — resolves territory for every request.
 * 
 * Priority chain:
 * 1. X-Territory-ID header (session-locked from client)
 * 2. territory_id query parameter (explicit)
 * 3. GPS headers → spatial PiP lookup
 * 4. User's region_id → legacy mapping
 * 5. zone_id query parameter (backward compat)
 */
const zoneScope = async (req, res, next) => {
  try {
    // Priority 1: Session-locked territory from client header
    if (req.headers['x-territory-id']) {
      req.territoryId = req.headers['x-territory-id'];
      req.activeZoneId = req.territoryId; // backward compat
      return next();
    }

    // Priority 2: Explicit territory_id in query
    if (req.query.territory_id) {
      req.territoryId = req.query.territory_id;
      req.activeZoneId = req.territoryId;
      return next();
    }

    // Priority 3: GPS-based spatial PiP lookup
    if (req.headers['x-user-latitude'] && req.headers['x-user-longitude']) {
      const lat = parseFloat(req.headers['x-user-latitude']);
      const lng = parseFloat(req.headers['x-user-longitude']);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const territory = await spatialRepo.pointInTerritory(lat, lng);
        if (territory) {
          req.territoryId = territory.id;
          req.activeZoneId = territory.id;
          req.resolvedTerritory = territory;
          return next();
        }
      }
    }

    // Priority 4: User's registered region → territory mapping
    if (req.user?.active_zone_id || req.user?.region_id) {
      const regionId = req.user.active_zone_id || req.user.region_id;
      const territoryId = await resolveRegionToTerritory(regionId);
      if (territoryId) {
        req.territoryId = territoryId;
        req.activeZoneId = territoryId;
        return next();
      }
      // Fallback: use region_id directly (might be a territory_id already)
      req.territoryId = regionId;
      req.activeZoneId = regionId;
      return next();
    }

    // Priority 5: Backward compat — zone_id query param
    if (req.query.zone_id) {
      const territoryId = await resolveRegionToTerritory(req.query.zone_id);
      req.territoryId = territoryId || req.query.zone_id;
      req.activeZoneId = req.territoryId;
      return next();
    }

    // No territory resolved — still proceed (interceptor will enforce if needed)
    req.territoryId = null;
    req.activeZoneId = null;
    next();
  } catch (error) {
    // Never block requests due to zone resolution failure
    console.error('[ZoneScope] Error resolving territory:', error.message);
    req.territoryId = null;
    req.activeZoneId = null;
    next();
  }
};

module.exports = { zoneScope, findNearestZone, resolveRegionToTerritory };

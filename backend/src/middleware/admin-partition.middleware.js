/**
 * ═══════════════════════════════════════════════════════════════════════
 * Admin Partition Middleware — Hard Database-Level RBAC
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Physically restricts admin users to their assigned territories.
 * TerritoryFranchise → single territory
 * DistrictManager → all territories in their district
 * SuperAdmin → no restrictions
 * ═══════════════════════════════════════════════════════════════════════
 */

const { query } = require('../config/database');

/**
 * Load territory assignments for an admin user.
 * Sets req.adminTerritoryIds (array of territory IDs this user can access).
 */
const loadAdminTerritories = async (req, res, next) => {
  try {
    const role = req.user?.role || req.adminRole?.role;

    // SuperAdmin bypasses — sees everything
    if (role === 'super_admin' || role === 'admin') {
      req.adminTerritoryIds = null; // null = no restriction
      return next();
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Load assignments from admin_territory_assignments table
    let assignments = [];
    try {
      const result = await query(
        'SELECT territory_id, district_id, role FROM admin_territory_assignments WHERE user_id = $1 AND is_active = true',
        [userId]
      );
      assignments = result.rows || result;
    } catch (e) {
      // Table might not exist yet — fall back to region_id
      if (req.user?.region_id) {
        req.adminTerritoryIds = [req.user.region_id];
        return next();
      }
      req.adminTerritoryIds = [];
      return next();
    }

    if (assignments.length === 0) {
      // No explicit assignments — try user's region_id
      if (req.user?.region_id) {
        req.adminTerritoryIds = [req.user.region_id];
      } else {
        req.adminTerritoryIds = [];
      }
      return next();
    }

    const territoryIds = new Set();

    for (const assignment of assignments) {
      if (assignment.territory_id) {
        // Direct territory assignment (TerritoryFranchise)
        territoryIds.add(assignment.territory_id);
      } else if (assignment.district_id) {
        // District-level assignment (DistrictManager) → expand to all territories
        const distTerritories = await query(
          `SELECT t.id FROM territories t 
           JOIN location_talukas lt ON t.taluka_id = lt.id 
           WHERE lt.district_id = $1 AND t.is_active = true`,
          [assignment.district_id]
        );
        const rows = distTerritories.rows || distTerritories;
        for (const t of rows) {
          territoryIds.add(t.id);
        }
      }
    }

    req.adminTerritoryIds = [...territoryIds];
    next();
  } catch (error) {
    console.error('[AdminPartition] Error loading territories:', error.message);
    next(error);
  }
};

/**
 * Enforce admin partition — blocks access to data outside assigned territories.
 * MUST be called AFTER loadAdminTerritories.
 */
const enforceAdminPartition = (req, res, next) => {
  // null = no restriction (SuperAdmin)
  if (req.adminTerritoryIds === null || req.adminTerritoryIds === undefined) {
    return next();
  }

  if (req.adminTerritoryIds.length === 0) {
    return res.status(403).json({
      error: 'NO_TERRITORY_ASSIGNED',
      message: 'You have not been assigned to any territory. Contact SuperAdmin.'
    });
  }

  // Inject SQL helper for downstream route handlers
  const ids = req.adminTerritoryIds.map(id => `'${id}'`).join(',');
  req.adminTerritorySQL = ` AND territory_id IN (${ids})`;
  req.adminRegionSQL = ` AND region_id IN (
    SELECT legacy_region_id FROM legacy_region_territory_map WHERE territory_id IN (${ids})
  )`;

  // If a specific territory/region is being accessed, verify it's allowed
  const targetTerritory = req.params.territoryId || req.query.territory_id || req.body?.territoryId;
  if (targetTerritory && !req.adminTerritoryIds.includes(targetTerritory)) {
    return res.status(403).json({
      error: 'TERRITORY_ACCESS_DENIED',
      message: 'You do not have access to this territory.'
    });
  }

  next();
};

/**
 * Combined middleware: load + enforce.
 */
const adminPartition = [loadAdminTerritories, enforceAdminPartition];

module.exports = { loadAdminTerritories, enforceAdminPartition, adminPartition };

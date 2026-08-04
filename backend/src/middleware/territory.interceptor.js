/**
 * ═══════════════════════════════════════════════════════════════════════
 * Territory Interceptor Middleware
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Physically prevents cross-territory data leakage by injecting
 * territory_id filtering into all shop/product queries.
 * 
 * Applied BEFORE shop and product route handlers.
 * SuperAdmin bypasses this restriction.
 * ═══════════════════════════════════════════════════════════════════════
 */

const { ROLES } = require('./auth.middleware');

/**
 * Territory enforcement middleware.
 * Ensures req.territoryId is set and injects it into the request
 * context for downstream query filtering.
 * 
 * @param {object} options
 * @param {boolean} options.required - If true, returns 400 if no territory
 * @param {boolean} options.allowSuperAdminBypass - If true, super_admin skips filter
 */
const territoryInterceptor = (options = {}) => {
  const { required = true, allowSuperAdminBypass = true } = options;

  return (req, res, next) => {
    // SuperAdmin bypass — they can see all territories
    if (allowSuperAdminBypass) {
      const role = req.user?.role || req.adminRole?.role;
      if (role === ROLES.SUPER_ADMIN || role === 'super_admin' || role === 'admin') {
        // If superadmin explicitly passes territory filter, use it
        if (req.query.territory_id) {
          req.territoryId = req.query.territory_id;
        }
        // Otherwise, no filter applied (sees everything)
        return next();
      }
    }

    // Territory ID resolution priority chain:
    // 1. Already set by zoneScope middleware
    // 2. Explicit query parameter
    // 3. Request header (from client session)
    if (!req.territoryId) {
      req.territoryId = req.query.territory_id || req.headers['x-territory-id'] || null;
    }

    if (required && !req.territoryId) {
      return res.status(400).json({
        error: 'TERRITORY_REQUIRED',
        message: 'A territory must be selected to access this resource. Please set your delivery location.',
        code: 'TERRITORY_REQUIRED'
      });
    }

    // Inject territory filter helper into the request
    // Downstream route handlers use this to scope their DB queries
    req.territoryFilter = req.territoryId
      ? { column: 'territory_id', value: req.territoryId }
      : null;

    // SQL fragment helpers for route handlers
    req.territorySqlWhere = req.territoryId
      ? ` AND territory_id = '${req.territoryId}'`
      : '';
    
    req.territorySqlParam = req.territoryId || null;

    next();
  };
};

/**
 * Soft territory interceptor — doesn't require territory but uses it if available.
 * Used for public endpoints like search that benefit from scoping but work without it.
 */
const softTerritoryInterceptor = territoryInterceptor({ required: false });

/**
 * Hard territory interceptor — requires territory, blocks without it.
 * Used for shop directory, product listings, cart operations.
 */
const hardTerritoryInterceptor = territoryInterceptor({ required: true });

module.exports = {
  territoryInterceptor,
  softTerritoryInterceptor,
  hardTerritoryInterceptor
};

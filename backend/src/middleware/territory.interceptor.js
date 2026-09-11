/**
 * ═══════════════════════════════════════════════════════════════════════
 * Territory Interceptor Middleware
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ THIS MIDDLEWARE DOES NOT FILTER ANY QUERIES.
 *
 * The previous header claimed it "physically prevents cross-territory data
 * leakage by injecting territory_id filtering into all shop/product queries".
 * It does not, and never did. All it does is resolve a territory id from the
 * query string or x-territory-id header onto req, and 400 when one is required
 * and absent. Actually scoping a query is left to each route handler.
 *
 * That claim mattered: it is the reason isolation was believed to be handled.
 * As of the pre-launch audit this middleware was mounted in zero places and
 * req.territoryFilter was read in zero places, so it contributed no isolation
 * whatsoever.
 *
 * Do NOT "fix" this by mounting it globally. It would reject every non-admin
 * request that lacks a territory header while still filtering nothing. Real
 * isolation means each route that returns tenant-owned rows filtering on
 * req.territoryScope with a bound parameter. Run
 * `node scripts/audit-tenant-isolation.js` to list the routes that still don't.
 *
 * SuperAdmin bypasses the territory requirement.
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

    // req.territorySqlWhere used to be built here by interpolating
    // req.territoryId straight into a SQL fragment:
    //
    //     ` AND territory_id = '${req.territoryId}'`
    //
    // That value comes from req.query.territory_id or the x-territory-id
    // header — attacker-controlled — so any handler concatenating it would
    // have had a SQL injection. It was never consumed anywhere, so removing it
    // breaks nothing and closes the hole before someone reaches for it.
    // Scope queries with the parameterised value instead:
    //
    //     query('SELECT ... WHERE territory_id = $1', [req.territoryScope])
    req.territoryScope = req.territoryId || null;

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

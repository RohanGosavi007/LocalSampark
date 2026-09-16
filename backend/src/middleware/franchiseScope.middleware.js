/**
 * Franchise tenancy scoping.
 *
 * A franchise owner may see and act on their own territories and nothing else.
 * Before this, that was enforced — where it was enforced at all — by each route
 * remembering to filter, which is the pattern that produces a data leak the
 * first time someone adds a route and forgets. `enforceTerritoryBounds` in
 * franchise.routes.js set `req.franchise_pincode` and left it to the handler to
 * use; most handlers did not.
 *
 * This middleware makes the scope a property of the request rather than a
 * suggestion, and gives handlers a SQL fragment they have to go out of their way
 * *not* to apply.
 *
 * ── The deny-by-default rule ────────────────────────────────────────────────
 *
 * A franchise owner with no territories gets an empty scope, and an empty scope
 * matches nothing. The tempting alternative — treating "no territories" as "no
 * restriction" — is how a partner mid-onboarding briefly sees the whole
 * platform. `WHERE pincode IN ()` is not valid SQL, so the fragment for an
 * empty scope is an explicit `1 = 0`: it reads as deliberate, and it cannot be
 * mistaken for a missing filter.
 *
 * Administrators are unscoped, which is the point of being an administrator,
 * and that decision is recorded on the request so a handler can tell the
 * difference between "unscoped because admin" and "scope not applied".
 */

const { queryOne } = require('../config/database');
const territoryResolution = require('../services/territoryResolution.service');
const pincodeUtil = require('../utils/pincode');
const logger = require('../config/logger');

/** Roles that are not franchise-scoped. Lower case: that is how they are stored. */
const UNSCOPED_ROLES = Object.freeze(['super_admin', 'admin', 'territory_admin']);

function roleOf(req) {
  return String(req.user?.role || req.user?.user_role || '').toLowerCase();
}

function isUnscoped(req) {
  if (UNSCOPED_ROLES.includes(roleOf(req))) return true;
  // admin_roles carries a separate upper-case role for staff accounts.
  const adminRole = String(req.adminRole?.role || '').toLowerCase();
  return UNSCOPED_ROLES.includes(adminRole);
}

/**
 * Resolves the caller's franchise scope onto `req.franchiseScope`.
 *
 * Shape:
 *   {
 *     scoped: boolean,            false for administrators
 *     franchisePartnerId: string|null,
 *     pincodes: string[],
 *     reason: string|null         why an empty scope is empty
 *   }
 *
 * Never rejects on its own. Deciding whether an unscoped-but-not-admin caller
 * may proceed belongs to the route, because a franchise owner reading their own
 * dashboard and one trying to list every merchant on the platform need
 * different answers.
 */
async function attachFranchiseScope(req, res, next) {
  try {
    if (!req.user) {
      req.franchiseScope = { scoped: true, franchisePartnerId: null, pincodes: [], reason: 'unauthenticated' };
      return next();
    }

    if (isUnscoped(req)) {
      req.franchiseScope = { scoped: false, franchisePartnerId: null, pincodes: [], reason: null };
      return next();
    }

    const partner = await queryOne(
      'SELECT id, status FROM franchise_partners WHERE user_id = $1 LIMIT 1',
      [req.user.id || req.user.userId]
    );

    if (!partner) {
      req.franchiseScope = {
        scoped: true,
        franchisePartnerId: null,
        pincodes: [],
        reason: 'not_a_franchise_partner',
      };
      return next();
    }

    // A suspended partner keeps their identity but loses their territories.
    // Returning their pincodes would let a partner whose agreement has been
    // suspended carry on reading the leads and revenue for an area they no
    // longer hold.
    if (String(partner.status || '').toLowerCase() === 'suspended') {
      req.franchiseScope = {
        scoped: true,
        franchisePartnerId: partner.id,
        pincodes: [],
        reason: 'partner_suspended',
      };
      return next();
    }

    const pincodes = await territoryResolution.pincodesForFranchise(partner.id);

    req.franchiseScope = {
      scoped: true,
      franchisePartnerId: partner.id,
      pincodes,
      reason: pincodes.length === 0 ? 'no_territories_assigned' : null,
    };
    return next();
  } catch (err) {
    // A failure here must not fall through to an unscoped request. An error
    // resolving the scope produces the empty scope, which matches nothing.
    logger.error('Franchise scope resolution failed, denying by default: ' + err.message);
    req.franchiseScope = {
      scoped: true,
      franchisePartnerId: null,
      pincodes: [],
      reason: 'scope_resolution_failed',
    };
    return next();
  }
}

/**
 * Rejects a caller who is neither an administrator nor an active partner.
 *
 * Used on routes that exist only for franchise owners. Kept separate from
 * attachFranchiseScope so that read endpoints which degrade gracefully and
 * write endpoints which must not are not forced into the same behaviour.
 */
function requireFranchise(req, res, next) {
  const scope = req.franchiseScope;
  if (!scope) {
    return res.status(500).json({
      success: false,
      message: 'Franchise scope was not resolved. attachFranchiseScope must run before requireFranchise.',
    });
  }
  if (!scope.scoped) return next(); // administrator
  if (scope.franchisePartnerId && scope.pincodes.length > 0) return next();

  const reasons = {
    not_a_franchise_partner: 'This account is not registered as a franchise partner.',
    partner_suspended: 'This franchise agreement is suspended.',
    no_territories_assigned: 'No territories are assigned to this franchise yet.',
    scope_resolution_failed: 'Franchise territories could not be resolved. Try again shortly.',
    unauthenticated: 'Sign in to continue.',
  };

  return res.status(403).json({
    success: false,
    message: reasons[scope.reason] || 'This account has no franchise territory access.',
    reason: scope.reason,
  });
}

/**
 * A WHERE fragment restricting a query to the caller's territories.
 *
 * Returns `{ sql, params }` to be appended to an existing clause. The caller
 * supplies the column and the index its first parameter should take, because
 * parameter numbering is positional and this cannot know what came before it.
 *
 *   const scope = scopeClause(req, 's.pincode', params.length);
 *   params.push(...scope.params);
 *   conditions.push(scope.sql);
 *
 * An administrator gets `1 = 1`; an empty scope gets `1 = 0`. Both are literal
 * and obvious when a query is logged, which matters when the question is "why
 * did this partner see that row".
 */
function scopeClause(req, column, paramOffset = 0) {
  const scope = req.franchiseScope;

  if (!scope || !scope.scoped) return { sql: '1 = 1', params: [] };
  if (!scope.pincodes || scope.pincodes.length === 0) return { sql: '1 = 0', params: [] };

  const placeholders = scope.pincodes.map((_, i) => `$${paramOffset + i + 1}`).join(', ');
  return {
    sql: `${column} IN (${placeholders})`,
    params: scope.pincodes.slice(),
  };
}

/**
 * Whether the caller may act on a given pincode.
 *
 * For write paths, where the target is named in the body rather than filtered
 * in a query. Normalises first: a partner holding "411001" must not be refused
 * because the request said "411 001", and must not be *allowed* something
 * because a comparison against an unnormalised string happened to pass.
 */
function coversPincode(req, pincode) {
  const scope = req.franchiseScope;
  if (!scope || !scope.scoped) return true;

  const normalized = pincodeUtil.normalize(pincode);
  if (!normalized) return false;

  return scope.pincodes.includes(normalized);
}

/**
 * Guards a route whose target pincode comes from the request.
 *
 * `locate` pulls the pincode out — from params, body or query, depending on the
 * route — so this works without assuming a parameter name.
 */
function requireCoverage(locate) {
  return (req, res, next) => {
    const pincode = typeof locate === 'function' ? locate(req) : req.params.pincode;

    if (!pincodeUtil.isValid(pincode)) {
      return res.status(400).json({
        success: false,
        message: `Invalid pincode: ${pincodeUtil.describeFailure(pincode)}.`,
      });
    }

    if (!coversPincode(req, pincode)) {
      // 403 rather than 404. The caller is authenticated and the resource
      // exists; they are simply not the franchise for it, and saying so is more
      // useful than pretending the area does not exist.
      return res.status(403).json({
        success: false,
        message: 'This pincode is outside your franchise territory.',
      });
    }

    return next();
  };
}

module.exports = {
  attachFranchiseScope,
  requireFranchise,
  requireCoverage,
  scopeClause,
  coversPincode,
  isUnscoped,
  UNSCOPED_ROLES,
};

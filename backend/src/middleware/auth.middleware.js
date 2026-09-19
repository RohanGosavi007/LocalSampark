const jwt = require('jsonwebtoken');
const { getJwtSecret, getJwtRefreshSecret } = require('../config/secrets');

const { verifyCsrf } = require('./csrf.middleware');

/**
 * Name of the httpOnly cookie carrying the admin access token, shared by
 * admin-auth.routes.js (which sets it), authenticate() below (which reads it)
 * and csrf.middleware.js (which guards it).
 */
const ADMIN_TOKEN_COOKIE = 'admin_token';

/**
 * Runs the CSRF guard inline and reports whether the request may continue.
 *
 * verifyCsrf is written as ordinary Express middleware so it can also be
 * mounted on a router, but authenticate() needs it mid-function. Calling it
 * with a no-op `next` gives the same behaviour: on success it invokes next and
 * sends nothing, on failure it sends a 403 and does not.
 */
function passesCsrf(req, res) {
  verifyCsrf(req, res, () => {});
  return !res.headersSent;
}

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      req.authSource = 'header';
    } else if (req.cookies && req.cookies[ADMIN_TOKEN_COOKIE]) {
      // httpOnly cookie set by POST /admin-auth/login. Preferred over the
      // header for the admin panel because no JavaScript -- including anything
      // injected by an XSS -- can read it back out, which a localStorage token
      // cannot claim.
      //
      // The browser attaches a cookie to requests automatically, and that is
      // exactly what makes cookie auth forgeable from another site, so requests
      // authenticated this way must additionally clear the check in
      // csrf.middleware.js. A bearer header is never auto-sent and so needs no
      // such check; req.authSource is what lets that middleware tell them apart.
      token = req.cookies[ADMIN_TOKEN_COOKIE];
      req.authSource = 'cookie';
    } else if (req.query && req.query.token) {
      // Deprecated: a token in the query string ends up in access logs, browser
      // history and Referer headers. Kept only for links already in the wild.
      token = req.query.token;
      req.authSource = 'query';
    }

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // A cookie is replayed by the browser on cross-site requests, so cookie
    // auth needs a second factor that an attacker's page cannot reproduce.
    //
    // Enforced here rather than per-route so that every one of the ~235 admin
    // routes is covered without each having to remember the guard, and so a
    // route added later cannot quietly miss it. Header and query callers are
    // untouched: verifyCsrf passes straight through unless authSource is
    // 'cookie'. It signals rejection by sending a 403 itself, so the only thing
    // to check is whether it responded.
    if (!passesCsrf(req, res)) return;

    const decoded = jwt.verify(token, getJwtSecret());
    const targetUserId = decoded.userId || decoded.id || decoded.sub;

    // config/database already abstracts SQLite and Postgres, so there is no
    // reason to branch to Prisma here. The old branch meant authentication took
    // a different code path in production than in development, and it silently
    // fell through when USE_SQLITE was unset.
    const { queryOne } = require('../config/database');
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [targetUserId]);

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Postgres returns a boolean here and SQLite an integer, so both shapes of
    // "deactivated" must be handled. The previous check tested only `=== 0`,
    // which let deactivated Postgres accounts authenticate successfully.
    const isActive = user.isActive ?? user.is_active;
    if (isActive === false || isActive === 0 || isActive === '0') {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    // Session revocation.
    //
    // generateTokens() embeds the user's token_version in every access token,
    // and admin.routes.js exposes a "log everyone out" action that runs
    //     UPDATE users SET token_version = token_version + 1
    // to invalidate outstanding sessions. verifyRole() enforced that check, but
    // authenticate() — which nearly every route in the app actually uses — did
    // not, so revocation had no effect on them: a stolen or leaked token stayed
    // valid for the full token lifetime regardless.
    //
    // Both sides are coalesced to 0. The column is DEFAULT 0 and migration 072
    // backfills nulls, but a row created before it (or by a driver that returns
    // NULL for an unset integer) would otherwise compare NULL !== 0 and log a
    // legitimate user out.
    const storedVersion = Number(user.token_version ?? user.tokenVersion ?? 0);
    const tokenVersion = Number(decoded.tokenVersion ?? 0);
    if (storedVersion !== tokenVersion) {
      return res.status(401).json({ error: 'Session invalidated. Please login again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please refresh.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    next(error);
  }
};

// Optional auth - doesn't fail if no token, just sets req.user
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret());
      const targetUserId = decoded.userId || decoded.id || decoded.sub;
      
      // Same reasoning as authenticate(): config/database already handles both
      // dialects, and the old USE_SQLITE branch meant an unset flag silently
      // routed to Prisma and produced an anonymous request.
      const { queryOne } = require('../config/database');
      const user = await queryOne('SELECT * FROM users WHERE id = $1', [targetUserId]);

      const isActive = user ? (user.isActive ?? user.is_active) : null;
      const deactivated = isActive === false || isActive === 0 || isActive === '0';
      req.user = user && !deactivated ? user : null;
    }
  } catch {
    req.user = null;
  }
  next();
};

// Check if user has admin role
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let adminRole = null;

    // Primary source: an explicit grant in admin_roles. This lookup was missing
    // entirely, so anyone who was an admin only via that table was rejected.
    // Roles are normalised to upper case because consumers such as
    // admin.routes.js compare req.adminRole.role against 'SUPER_ADMIN' directly.
    try {
      const { queryOne } = require('../config/database');
      const granted = await queryOne(
        'SELECT * FROM admin_roles WHERE user_id = $1',
        [req.user.id || req.user.userId]
      );
      if (granted && granted.role) {
        adminRole = {
          role: String(granted.role).toUpperCase(),
          regionId: granted.regionId || granted.region_id || null,
          permissions: granted.permissions || '{"all": true}'
        };
      }
    } catch {
      // admin_roles may not exist in every deployment; fall through to
      // users.role below rather than failing the request.
    }

    // Fallback: the role carried on the user record itself.
    if (!adminRole) {
      const userRoleStr = (req.user.role || '').toUpperCase();
      if (userRoleStr === 'ADMIN' || userRoleStr === 'SUPER_ADMIN') {
        adminRole = {
          role: userRoleStr,
          regionId: req.user.regionId || req.user.region_id || null,
          permissions: '{"all": true}'
        };
      }
    }

    if (!adminRole) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    req.adminRole = adminRole;
    next();
  } catch (error) {
    next(error);
  }
};

// Check specific admin role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.adminRole) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    // Normalise both sides: callers pass role names in mixed case and
    // req.adminRole.role may arrive either normalised or raw.
    const actual = String(req.adminRole.role || '').toUpperCase();
    const allowed = roles.map((r) => String(r).toUpperCase());
    if (!allowed.includes(actual) && actual !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}` });
    }
    next();
  };
};

// Generate tokens
function generateTokens(userId, role, tokenVersion = 0, extraPayload = {}) {
  const jwtSecret = getJwtSecret();
  const jwtRefreshSecret = getJwtRefreshSecret();

  const payload = {
    userId,
    role: role || 'CUSTOMER',
    tokenVersion,
    ...extraPayload
  };

  const accessToken = jwt.sign(
    payload,
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, tokenVersion },
    jwtRefreshSecret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
}

// Phase 1: verifyRole Middleware for strict access control + Token Versioning
const verifyRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret());

      const userRole = decoded.role;
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Token missing role context.' });
      }

      // Token versioning, strict.
      //
      // This branched on the engine: SQLite through config/database, everything
      // else through Prisma. config/database already abstracts both, and the
      // Prisma branch read a different datasource from the one `authenticate`
      // above uses — so on Postgres this check and the authentication that
      // preceded it could disagree about whether a user exists. One path now.
      const { queryOne } = require('../config/database');
      const user = await queryOne(
        'SELECT token_version as tokenVersion FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (!user || user.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ success: false, error: 'Session invalidated. Please login again.' });
      }

      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        req.user = decoded;
        return next();
      }

      // Check granular roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ success: false, error: `Forbidden: Requires ${allowedRoles.join(' or ')}` });
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired. Please refresh.' });
      }
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }
  };
};

// Require Territory Admin role
const requireTerritory = (req, res, next) => {
  const allowedRoles = ['TERRITORY_ADMIN', 'AREA_AGENT', 'ADMIN', 'SUPER_ADMIN'];
  // Roles are stored inconsistently: ROLES uses upper case while the admin auth
  // route compares against lower case. requireAdmin already normalises, and
  // comparing raw here rejected legitimate admins stored as 'super_admin'.
  const role = (req.adminRole?.role || req.user?.role || '').toUpperCase();
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Territory Admin access required.' });
  }
  next();
};

// Require Area Agent (multi-zone admin) role or higher
const requireAreaAgent = (req, res, next) => {
  const allowedRoles = ['AREA_AGENT', 'ADMIN', 'SUPER_ADMIN'];
  const role = (req.adminRole?.role || req.user?.role || '').toUpperCase();
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Area Agent or Super Admin access required.' });
  }
  next();
};

const ROLES = {
  USER: 'CUSTOMER',
  SHOP_OWNER: 'VENDOR',
  DELIVERY_AGENT: 'DELIVERY',
  SERVICE_PROVIDER: 'VENDOR',
  FIELD_AGENT: 'FIELD_AGENT',
  SECURITY_GUARD: 'SECURITY_GUARD',
  AREA_AGENT: 'AREA_AGENT',
  TERRITORY_ADMIN: 'TERRITORY_ADMIN',
  FRANCHISE_OWNER: 'FRANCHISE_OWNER',
  SOCIETY_ADMIN: 'SOCIETY_ADMIN',
  SOCIETY_GUARD: 'SOCIETY_GUARD',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  // Phase 6: Enterprise RBAC roles
  DISTRICT_MANAGER: 'DISTRICT_MANAGER',
  TERRITORY_FRANCHISE: 'TERRITORY_FRANCHISE',
  // Phase 8: Marketing
  MARKETING_ADMIN: 'MARKETING_ADMIN',
  // Phase 9: Ad Manager
  AD_MANAGER: 'AD_MANAGER',
  // Phase 11: Support Admin
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',
  // Phase 12: Specialized Verticals
  VERTICAL_MANAGER: 'VERTICAL_MANAGER',
  // Phase 13: Krishi
  KRISHI_EXPERT: 'KRISHI_EXPERT',
  // Phase 14: Mobility
  MOBILITY_MANAGER: 'MOBILITY_MANAGER'
};

const hasAccess = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    /**
     * Both sides are normalised before comparing.
     *
     * Roles are stored lower case ('shop_owner', 'super_admin') while the ROLES
     * constants are upper case and, in places, differently spelled —
     * ROLES.SHOP_OWNER is 'VENDOR'. Nothing here normalised, so the super-admin
     * bypass never fired and `allowedRoles.includes(userRole)` compared
     * 'shop_owner' against 'VENDOR'. Every route guarded by hasAccess was
     * therefore closed to the exact people it was meant to admit: a shop owner
     * could not pause or reset their own token queue, and neither could an
     * administrator.
     *
     * ROLES.SHOP_OWNER and ROLES.SERVICE_PROVIDER both being 'VENDOR' is also
     * why the alias list below matters — a caller naming either constant means
     * the same stored role.
     */
    const normalise = (value) => String(value || '').trim().toUpperCase();

    const ALIASES = {
      CUSTOMER: ['USER', 'CUSTOMER'],
      VENDOR: ['SHOP_OWNER', 'SERVICE_PROVIDER', 'VENDOR'],
      DELIVERY: ['DELIVERY_AGENT', 'DELIVERY'],
    };

    const expand = (value) => {
      const key = normalise(value);
      return ALIASES[key] ? ALIASES[key] : [key];
    };

    const userRole = normalise(req.user.role);

    // Super admins always have access.
    if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
      return next();
    }

    const permitted = new Set((allowedRoles || []).flatMap(expand));
    if (!permitted.has(userRole)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// Enforce Multi-Tenancy for Vendor CRM Routes
const enforceMultiTenancy = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins bypass tenant checks
    if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (req.user.role === ROLES.SHOP_OWNER || req.user.role === 'VENDOR' || req.user.role === 'VENDOR_OWNER' || req.user.role === 'VENDOR_STAFF') {
      // As above: one data path for both dialects, rather than silently
      // routing to Prisma whenever USE_SQLITE is not exactly 'true'.
      const { queryOne } = require('../config/database');
      const shop = await queryOne(
        'SELECT * FROM local_shops WHERE owner_id = $1',
        [req.user.userId || req.user.id]
      );

      if (!shop) {
        return res.status(403).json({ error: 'No shop associated with this account' });
      }

      // A shop can be locked either by status or by the is_locked flag; only
      // status was checked, so is_locked shops kept full CRM access.
      if (shop.status === 'SUSPENDED' || shop.is_locked === true || shop.is_locked === 1) {
        return res.status(403).json({ error: 'Shop is locked due to billing or policy violation' });
      }

      // Inject strict shop context into the request. saas.routes.js reads
      // req.shopId, which was never set here, so those queries ran with
      // undefined; both names are populated.
      req.tenantShopId = shop.id;
      req.shopId = shop.id;

      // local_shops.crm_tier is the source of truth; deriving the tier from
      // isPremium ignored shops explicitly placed on a named tier.
      req.crmTier = shop.crm_tier || (shop.isPremium || shop.is_premium ? 'premium' : 'free');

      // Strict enforcement: if route provided a shopId explicitly, ensure it matches tenant
      const targetShopId = req.params.shopId || req.body.shopId || req.query.shopId;
      if (targetShopId && targetShopId !== req.tenantShopId) {
        return res.status(403).json({ error: 'Tenant Mismatch: Access Denied to requested shopId' });
      }

      return next();
    }

    // If not a shop owner or admin, they shouldn't access CRM routes
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for Vendor CRM' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireRole,
  requireTerritory,
  requireAreaAgent,
  generateTokens,
  ROLES,
  hasAccess,
  enforceMultiTenancy,
  verifyRole
};

const jwt = require('jsonwebtoken');

let _prisma = null;
const getPrisma = () => {
  if (process.env.USE_SQLITE === 'true') return null;
  if (!_prisma) {
    const { PrismaClient } = require('@prisma/client');
    _prisma = new PrismaClient();
  }
  return _prisma;
};

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_localsampark_secret_key_2026'));
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
      const decoded = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_localsampark_secret_key_2026'));
      const targetUserId = decoded.userId || decoded.id || decoded.sub;
      
      let user = null;
      if (process.env.USE_SQLITE === 'true') {
        const { queryOne } = require('../config/database');
        user = await queryOne('SELECT * FROM users WHERE id = $1 AND (is_active = true OR is_active = true)', [targetUserId]);
      } else {
        user = await getPrisma().user.findFirst({
          where: { id: targetUserId, isActive: true }
        });
      }
      req.user = user || null;
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
    const userRoleStr = (req.user.role || '').toUpperCase();
    // Check if user.role itself is admin/super_admin
    if (userRoleStr === 'ADMIN' || userRoleStr === 'SUPER_ADMIN') {
      adminRole = {
        role: userRoleStr,
        regionId: req.user.regionId || req.user.region_id || null,
        permissions: '{"all": true}'
      };
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
    if (!roles.includes(req.adminRole.role) && req.adminRole.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}` });
    }
    next();
  };
};

// Generate tokens
function generateTokens(userId, role, tokenVersion = 0, extraPayload = {}) {
  const jwtSecret = (process.env.JWT_SECRET || 'fallback_localsampark_secret_key_2026') || 'fallback_secret_key_change_in_prod';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

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
      const decoded = jwt.verify(token, (process.env.JWT_SECRET || 'fallback_localsampark_secret_key_2026'));

      const userRole = decoded.role;
      if (!userRole) {
        return res.status(403).json({ success: false, error: 'Token missing role context.' });
      }

      // Token Versioning strict check
      let user = null;
      if (process.env.USE_SQLITE === 'true') {
        const { queryOne } = require('../config/database');
        user = await queryOne('SELECT token_version as tokenVersion FROM users WHERE id = $1', [decoded.userId]);
      } else {
        user = await getPrisma().user.findUnique({
          where: { id: decoded.userId },
          select: { tokenVersion: true }
        });
      }
      
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
    const userRole = req.user.role;
    // Super admins always have access
    if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
      return next();
    }
    if (!allowedRoles.includes(userRole)) {
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
      let shop = null;
      if (process.env.USE_SQLITE === 'true') {
        const { queryOne } = require('../config/database');
        shop = await queryOne('SELECT * FROM local_shops WHERE owner_id = $1', [req.user.userId || req.user.id]);
      } else {
        shop = await getPrisma().shop.findFirst({
          where: { ownerId: req.user.userId || req.user.id }
        });
      }
      
      if (!shop) {
        return res.status(403).json({ error: 'No shop associated with this account' });
      }

      if (shop.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Shop is locked due to billing or policy violation' });
      }

      // Inject strict shop context into the request
      req.tenantShopId = shop.id;
      req.crmTier = shop.isPremium ? 'premium' : 'free';

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

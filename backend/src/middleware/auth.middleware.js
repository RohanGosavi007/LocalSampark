const jwt = require('jsonwebtoken');
const { queryOne } = require('../config/database');

// Verify JWT token middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const user = await queryOne(
      `SELECT id, phone_number, full_name, role, avatar_url, bio,
       region_id, is_active, is_verified, language_preference, email
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Removed is_banned check as it does not exist in schema

    if (!user.is_active) {
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await queryOne('SELECT id, phone_number, full_name, role FROM users WHERE id = $1 AND (is_active = true OR is_active = 1)', [decoded.userId]);
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

    // Try finding admin role in admin_roles table
    let adminRole = null;
    try {
      adminRole = await queryOne(
        'SELECT id, role, region_id, permissions FROM admin_roles WHERE user_id = $1 AND is_active = true',
        [req.user.id]
      );
    } catch (e) {
      console.warn('Fallback: admin_roles table query failed, checking users table role directly.', e.message);
    }

    // Fallback: If no entry in admin_roles, check if user.role itself is admin/super_admin
    if (!adminRole) {
      if (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.user_type === 'admin') {
        adminRole = {
          role: req.user.role || 'admin',
          region_id: req.user.region_id || null,
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
    if (!roles.includes(req.adminRole.role) && req.adminRole.role !== 'super_admin') {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}` });
    }
    next();
  };
};

// Generate tokens
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
}

// Require Territory Admin role
const requireTerritory = (req, res, next) => {
  const allowedRoles = ['territory_admin', 'area_agent', 'admin', 'super_admin'];
  const role = req.adminRole?.role || req.user?.role;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Territory Admin access required.' });
  }
  next();
};

// Require Area Agent (multi-zone admin) role or higher
const requireAreaAgent = (req, res, next) => {
  const allowedRoles = ['area_agent', 'admin', 'super_admin'];
  const role = req.adminRole?.role || req.user?.role;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Area Agent or Super Admin access required.' });
  }
  next();
};

const ROLES = {
  USER: 'user',
  SHOP_OWNER: 'shop_owner',
  DELIVERY_AGENT: 'delivery_agent',
  SERVICE_PROVIDER: 'service_provider',
  FIELD_AGENT: 'field_agent',
  SECURITY_GUARD: 'security_guard',
  AREA_AGENT: 'area_agent',
  TERRITORY_ADMIN: 'territory_admin',
  FRANCHISE_OWNER: 'franchise_owner',
  SOCIETY_ADMIN: 'society_admin',
  SOCIETY_GUARD: 'society_guard',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
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

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireRole,
  requireTerritory,
  requireAreaAgent,
  generateTokens,
  ROLES,
  hasAccess
};

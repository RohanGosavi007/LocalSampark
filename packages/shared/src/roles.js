/**
 * packages/shared/src/roles.js
 *
 * Canonical Role Constants and Normalization for LocalSampark.
 * Single source of truth across Backend, Web, Admin, and Mobile.
 */

const ROLES = {
  USER: 'user',
  CUSTOMER: 'user',
  RESIDENT_MEMBER: 'resident_member',
  SOCIETY_ADMIN: 'society_admin',
  SECURITY_GUARD: 'security_guard',
  SOCIETY_GUARD: 'security_guard',
  SHOP_OWNER: 'shop_owner',
  VENDOR: 'shop_owner',
  SERVICE_PROVIDER: 'service_provider',
  DELIVERY_AGENT: 'delivery_agent',
  DELIVERY: 'delivery_agent',
  FIELD_AGENT: 'field_agent',
  AREA_AGENT: 'area_agent',
  TERRITORY_ADMIN: 'territory_admin',
  FRANCHISE_OWNER: 'franchise_owner',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  SUPERADMIN: 'super_admin',
  DISTRICT_MANAGER: 'district_manager',
  TERRITORY_FRANCHISE: 'territory_franchise',
  MARKETING_ADMIN: 'marketing_admin',
  AD_MANAGER: 'ad_manager',
  SUPPORT_ADMIN: 'support_admin',
  VERTICAL_MANAGER: 'vertical_manager',
  KRISHI_EXPERT: 'krishi_expert',
  MOBILITY_MANAGER: 'mobility_manager'
};

const LEGACY_ROLE_ALIASES = {
  'superadmin': 'super_admin',
  'super_admin': 'super_admin',
  'delivery': 'delivery_agent',
  'driver': 'delivery_agent',
  'rider': 'delivery_agent',
  'seller': 'shop_owner',
  'vendor': 'shop_owner',
  'shop': 'shop_owner',
  'guard': 'security_guard',
  'resident': 'resident_member',
  'customer': 'user'
};

/**
 * Normalizes any role string into canonical snake_case format.
 * Maps legacy aliases to standard roles.
 *
 * @param {string} role
 * @returns {string} canonical role
 */
function normalizeRole(role) {
  if (!role) return ROLES.USER;
  const cleaned = String(role).trim().toLowerCase();
  return LEGACY_ROLE_ALIASES[cleaned] || cleaned;
}

/**
 * Checks whether a given role has full admin privileges.
 *
 * @param {string} role
 * @returns {boolean}
 */
function isFullAdmin(role) {
  const norm = normalizeRole(role);
  return norm === ROLES.ADMIN || norm === ROLES.SUPER_ADMIN;
}

/**
 * Validates whether a role is in the recognized platform roles.
 *
 * @param {string} role
 * @returns {boolean}
 */
function isValidRole(role) {
  const norm = normalizeRole(role);
  return Object.values(ROLES).includes(norm);
}

module.exports = {
  ROLES,
  LEGACY_ROLE_ALIASES,
  normalizeRole,
  isFullAdmin,
  isValidRole
};

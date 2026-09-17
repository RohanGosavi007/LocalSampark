/**
 * Role policy — who may open what.
 *
 * Split out of permissions.js so it can be reasoned about, and tested, without
 * a React runtime. permissions.js keeps the `withRoleGuard` HOC and re-exports
 * everything here, so existing imports are unaffected.
 *
 * The policy has two layers, and the distinction is the whole design:
 *
 *   CITIZEN_MODULES  the consumer surface every authenticated role keeps,
 *                    because a specialised role is something a person holds
 *                    in addition to being a customer, not instead of it.
 *
 *   MODULE_ACCESS    the consoles a role is appointed to, still gated.
 */

// ─── ROLE DEFINITIONS ─────────────────────────────────────────
export const ROLES = {
  VISITOR: 'visitor',
  USER: 'user',
  RESIDENT_MEMBER: 'resident_member',
  SOCIETY_ADMIN: 'society_admin',
  SECURITY_GUARD: 'security_guard',
  SHOP_OWNER: 'shop_owner',
  SERVICE_PROVIDER: 'service_provider',
  DELIVERY_AGENT: 'delivery_agent',
  FIELD_AGENT: 'field_agent',
  AREA_AGENT: 'area_agent',
  TERRITORY_ADMIN: 'territory_admin',
  MODERATOR: 'moderator',
  SUPER_ADMIN: 'super_admin'
};

// ─── ROLE DISPLAY NAMES ───────────────────────────────────────
export const ROLE_LABELS = {
  [ROLES.VISITOR]: 'Visitor',
  [ROLES.USER]: 'Resident',
  [ROLES.RESIDENT_MEMBER]: 'Resident Member',
  [ROLES.SOCIETY_ADMIN]: 'Society Admin',
  [ROLES.SECURITY_GUARD]: 'Security Guard',
  [ROLES.SHOP_OWNER]: 'Shop Owner',
  [ROLES.SERVICE_PROVIDER]: 'Service Provider',
  [ROLES.DELIVERY_AGENT]: 'Delivery Agent',
  [ROLES.FIELD_AGENT]: 'Field Agent',
  [ROLES.AREA_AGENT]: 'Area Agent',
  [ROLES.TERRITORY_ADMIN]: 'Franchise Partner',
  [ROLES.MODERATOR]: 'Moderator',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
};

// ─── ROLE ICONS ───────────────────────────────────────────────
export const ROLE_ICONS = {
  [ROLES.USER]: '👤',
  [ROLES.RESIDENT_MEMBER]: '🏠',
  [ROLES.SOCIETY_ADMIN]: '🏢',
  [ROLES.SECURITY_GUARD]: '🛡️',
  [ROLES.SHOP_OWNER]: '🏪',
  [ROLES.SERVICE_PROVIDER]: '🔧',
  [ROLES.DELIVERY_AGENT]: '🏍️',
  [ROLES.FIELD_AGENT]: '📋',
  [ROLES.AREA_AGENT]: '📊',
  [ROLES.TERRITORY_ADMIN]: '🤝',
  [ROLES.MODERATOR]: '🛡️',
  [ROLES.SUPER_ADMIN]: '⚡',
};

// ─── ROLE COLORS ──────────────────────────────────────────────
export const ROLE_COLORS = {
  [ROLES.USER]: '#3b82f6',
  [ROLES.RESIDENT_MEMBER]: '#10b981',
  [ROLES.SOCIETY_ADMIN]: '#8b5cf6',
  [ROLES.SECURITY_GUARD]: '#f97316',
  [ROLES.SHOP_OWNER]: '#06b6d4',
  [ROLES.SERVICE_PROVIDER]: '#eab308',
  [ROLES.DELIVERY_AGENT]: '#ef4444',
  [ROLES.FIELD_AGENT]: '#14b8a6',
  [ROLES.AREA_AGENT]: '#a855f7',
  [ROLES.TERRITORY_ADMIN]: '#f59e0b',
  [ROLES.MODERATOR]: '#6366f1',
  [ROLES.SUPER_ADMIN]: '#ec4899',
};

// ─── MODULE ACCESS MATRIX ─────────────────────────────────────
// Defines which roles can access which modules
/**
 * ─── THE CITIZEN FLOOR ────────────────────────────────────────
 *
 * Every authenticated user is a citizen of the platform first and holds a
 * specialised role second. A security guard finishes a shift and buys
 * groceries; a society admin books a cab; a delivery rider orders dinner.
 *
 * This list was previously enumerated role by role, and the enumeration was
 * wrong in a way nobody would report as a bug: `marketplace`, `carpool`,
 * `checkout`, `bills`, `jobs`, `health`, `shop-detail` and the rest named only
 * USER, RESIDENT_MEMBER and SUPER_ADMIN. A security guard tapping Nearby Shops
 * got "Access Restricted — your current role (Security Guard) does not have
 * permission to view this section", and a society admin could not check out a
 * cart. The platform had quietly decided that taking a job on the gate meant
 * giving up being a customer.
 *
 * Membership here is not a matrix entry. Anyone signed in reaches these.
 */
export const CITIZEN_MODULES = Object.freeze([
  'about', 'chat', 'features', 'download',
  'dashboard', 'directory', 'shop-detail', 'register-shop',
  'marketplace', 'properties', 'pets', 'jobs', 'health', 'events',
  'carpool', 'bills', 'earn', 'referral', 'premium', 'subscriptions',
  'care', 'delivery', 'chef', 'scrap', 'community_hub', 'volunteer', 'donations',
  'checkout', 'order-tracking', 'service-detail', 'sos', 'profile', 'settings',
]);

/**
 * ─── SPECIALIST MODULES ───────────────────────────────────────
 *
 * The consoles a role is appointed to, not the features they buy with. These
 * stay gated: a shop owner's inventory is not a customer's business, and a
 * gate console is not a shop owner's.
 *
 * `society` is deliberately open to plain users as well — a resident's base
 * role is `user` under the composable model, and their society membership is
 * what grants the flat portal. Gating it on RESIDENT_MEMBER alone meant a
 * resident whose account was never re-roled could not reach their own society.
 */
export const MODULE_ACCESS = {
  // Society surfaces — membership decides what is shown inside them.
  society: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SOCIETY_ADMIN, ROLES.SECURITY_GUARD, ROLES.SUPER_ADMIN],

  // Shop Owner consoles
  'shop-dashboard': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-products': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-orders': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-appointments': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-analytics': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],

  // Delivery consoles
  'delivery-available': [ROLES.DELIVERY_AGENT, ROLES.SUPER_ADMIN],
  'delivery-active': [ROLES.DELIVERY_AGENT, ROLES.SUPER_ADMIN],
  'delivery-earnings': [ROLES.DELIVERY_AGENT, ROLES.SUPER_ADMIN],
  'delivery-dashboard': [ROLES.DELIVERY_AGENT, ROLES.SUPER_ADMIN],

  // Service Provider consoles
  'service-bookings': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  'service-calendar': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  'service-portfolio': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  'service-earnings': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  'service-dashboard': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],

  // Field Agent consoles
  'field-onboard': [ROLES.FIELD_AGENT, ROLES.AREA_AGENT, ROLES.SUPER_ADMIN],
  'field-leads': [ROLES.FIELD_AGENT, ROLES.AREA_AGENT, ROLES.SUPER_ADMIN],
  'field-earnings': [ROLES.FIELD_AGENT, ROLES.SUPER_ADMIN],
  'field-dashboard': [ROLES.FIELD_AGENT, ROLES.SUPER_ADMIN],

  // Franchise consoles
  crm: [ROLES.SHOP_OWNER, ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  franchise: [ROLES.TERRITORY_ADMIN, ROLES.AREA_AGENT, ROLES.SUPER_ADMIN],
  'franchise-shops': [ROLES.TERRITORY_ADMIN, ROLES.SUPER_ADMIN],
  'franchise-agents': [ROLES.TERRITORY_ADMIN, ROLES.SUPER_ADMIN],
  'franchise-revenue': [ROLES.TERRITORY_ADMIN, ROLES.SUPER_ADMIN],
  'franchise-dashboard': [ROLES.TERRITORY_ADMIN, ROLES.SUPER_ADMIN],

  // Gate console
  'security-gate': [ROLES.SECURITY_GUARD, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],
  'sos-dashboard': [ROLES.SECURITY_GUARD, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],

  // Moderation
  'mod-content': [ROLES.MODERATOR, ROLES.SUPER_ADMIN],
  'mod-reports': [ROLES.MODERATOR, ROLES.SUPER_ADMIN],

  // Platform administration
  admin: [ROLES.SUPER_ADMIN],
  'admin-dashboard': [ROLES.SUPER_ADMIN],
};

// ─── ROLE-SPECIFIC TAB CONFIGURATIONS ─────────────────────────
// Defines the bottom tab bar for each role
export const ROLE_TABS = {
  [ROLES.USER]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'directory', title: 'Nearby', icon: '🏪' },
      { name: 'community', title: 'Community', icon: '💬' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.RESIDENT_MEMBER]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'directory', title: 'Nearby', icon: '🏪' },
      { name: 'community', title: 'Community', icon: '💬' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.SOCIETY_ADMIN]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'directory', title: 'Nearby', icon: '🏪' },
      { name: 'community', title: 'Society', icon: '🏢' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.SHOP_OWNER]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Dashboard', icon: '📊' },
      { name: 'orders', title: 'Orders', icon: '📦' },
      { name: 'products', title: 'Products', icon: '📋' },
      { name: 'appointments', title: 'Bookings', icon: '📅' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.DELIVERY_AGENT]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'available', title: 'Available', icon: '📦' },
      { name: 'active', title: 'Active', icon: '🗺️' },
      { name: 'earnings', title: 'Earnings', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.SERVICE_PROVIDER]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'bookings', title: 'Bookings', icon: '📅' },
      { name: 'reviews', title: 'Reviews', icon: '⭐' },
      { name: 'earnings', title: 'Earnings', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.FIELD_AGENT]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'onboard', title: 'Onboard', icon: '🏪' },
      { name: 'leads', title: 'Leads', icon: '📊' },
      { name: 'earnings', title: 'Earnings', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  /**
   * A guard had exactly one tab.
   *
   * `index` alone meant the gate console was the entire application for them:
   * no Nearby, no Community, no More, and therefore no route out of the shell
   * to anything a person off-shift would open. Combined with the module matrix
   * that excluded them from every consumer screen, a guard's phone was a
   * single-purpose terminal that happened to be their own device.
   *
   * They keep the gate as their landing tab — it is what they open the app for
   * during a shift — and gain the same standard tabs as anyone else.
   */
  [ROLES.SECURITY_GUARD]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Gate', icon: '🛡️' },
      { name: 'directory', title: 'Nearby', icon: '🏪' },
      { name: 'community', title: 'Community', icon: '💬' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.AREA_AGENT]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Dashboard', icon: '📊' },
      { name: 'onboard', title: 'Onboard', icon: '🏪' },
      { name: 'leads', title: 'Agents', icon: '👥' },
      { name: 'earnings', title: 'Earnings', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.TERRITORY_ADMIN]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Dashboard', icon: '📊' },
      { name: 'shops', title: 'Shops', icon: '🏪' },
      { name: 'agents', title: 'Agents', icon: '👥' },
      { name: 'revenue', title: 'Revenue', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.MODERATOR]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'community', title: 'Moderate', icon: '🛡️' },
      { name: 'directory', title: 'Shops', icon: '🏪' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.SUPER_ADMIN]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'directory', title: 'Shops', icon: '🏪' },
      { name: 'community', title: 'Community', icon: '💬' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
};

// ─── HELPER: Get tab config for a role ────────────────────────
export function getTabsForRole(role) {
  return ROLE_TABS[role] || ROLE_TABS[ROLES.USER];
}

// ─── HELPER: Check if role is a "business" role ───────────────
export function isBusinessRole(role) {
  return [
    ROLES.SHOP_OWNER,
    ROLES.DELIVERY_AGENT,
    ROLES.SERVICE_PROVIDER,
    ROLES.FIELD_AGENT,
    ROLES.AREA_AGENT,
    ROLES.TERRITORY_ADMIN,
    ROLES.SECURITY_GUARD,
  ].includes(role);
}

// ─── HELPER: Check if role has admin capabilities ─────────────
export function isAdminRole(role) {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.TERRITORY_ADMIN,
    ROLES.AREA_AGENT,
    ROLES.MODERATOR,
    ROLES.SOCIETY_ADMIN,
  ].includes(role);
}

// ─── PERMISSION CHECK ─────────────────────────────────────────
export const hasAccess = (role, moduleName, permissionOverrides = {}) => {
  if (!role) return false;

  // A per-user override still wins, in either direction — it is how an account
  // gets an early feature or loses one after abuse.
  if (permissionOverrides[moduleName] !== undefined) {
    return permissionOverrides[moduleName];
  }

  if (role === ROLES.SUPER_ADMIN) return true;

  // The citizen floor. Any authenticated role reaches these, because holding a
  // specialised role does not stop someone being a customer.
  if (CITIZEN_MODULES.includes(moduleName)) return true;

  // Specialist consoles are still a matrix decision. An unknown module name is
  // refused rather than allowed: a typo in a route name must not open a door.
  const allowedRoles = MODULE_ACCESS[moduleName] || [];
  return allowedRoles.includes(role);
};


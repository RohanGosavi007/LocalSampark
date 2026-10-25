/**
 * LocalSampark Launch Program v2 — Feature Flag Registry (P6 / Launch Scope D1)
 *
 * Single source of truth for all feature modules and their launch status.
 * Used by backend API middleware, web navigation, mobile routes, and admin panel.
 */

const FEATURES = {
  // ─── IN-SCOPE COMMERCE CORE (Active for Launch) ──────────────────────────
  COMMERCE_CORE: {
    key: 'commerce_core',
    name: 'Hyperlocal Marketplace',
    description: 'Neighborhood shops, product catalog, search, cart, checkout, delivery',
    enabled: true,
    scope: 'launch',
    category: 'commerce'
  },
  COUPONS: {
    key: 'coupons',
    name: 'Coupon & Promotion Engine',
    description: 'Platform and shop-level promotional discounts',
    enabled: true,
    scope: 'launch',
    category: 'commerce'
  },
  REVIEWS: {
    key: 'reviews',
    name: 'Verified Reviews & Ratings',
    description: 'Customer product and shop reviews for delivered orders',
    enabled: true,
    scope: 'launch',
    category: 'commerce'
  },
  WISHLIST: {
    key: 'wishlist',
    name: 'Customer Wishlist',
    description: 'Saved items and favorite neighborhood shops',
    enabled: true,
    scope: 'launch',
    category: 'commerce'
  },
  NOTIFICATIONS: {
    key: 'notifications',
    name: 'Order & System Notifications',
    description: 'Push, email, and transactional alerts',
    enabled: true,
    scope: 'launch',
    category: 'core'
  },
  SUPPORT_GRIEVANCE: {
    key: 'support_grievance',
    name: 'Customer Support & Grievance SLA',
    description: 'Consumer Protection 2020 complaint ticketing and tracking',
    enabled: true,
    scope: 'launch',
    category: 'compliance'
  },

  // ─── OFF AT LAUNCH VERTICALS (Hidden from Navigation, Gated at API) ─────
  SOCIETY_MANAGEMENT: {
    key: 'society_management',
    name: 'Society & Gate Management',
    description: 'Visitor logs, intercom, gate passes, maintenance billing',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  CARPOOL: {
    key: 'carpool',
    name: 'Neighborhood Carpool',
    description: 'Rideshare and commute matching',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  JOBS: {
    key: 'jobs',
    name: 'Local Jobs & Hiring',
    description: 'Hyperlocal employment and blue-collar job cards',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  PROPERTIES: {
    key: 'properties',
    name: 'Real Estate & Rentals',
    description: 'Property buy/sell/rent without brokerage',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  MEDICAL: {
    key: 'medical',
    name: 'Medical & Diagnostics',
    description: 'Doctor appointments, medical providers, blood bank',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  EMERGENCY_SOS: {
    key: 'emergency_sos',
    name: 'Emergency SOS',
    description: 'SOS panic button and incident response',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  KRISHI: {
    key: 'krishi',
    name: 'Krishi & Rural Marketplace',
    description: 'Agri inputs, mandi prices, soil testing',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  SCRAP: {
    key: 'scrap',
    name: 'Scrap & Recycling',
    description: 'Scrap collector pickup requests and rates',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  CHEF: {
    key: 'chef',
    name: 'Home Chef & Meal Subscriptions',
    description: 'Home-cooked tiffin and catering services',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  EQUIPMENT_RENTAL: {
    key: 'equipment_rental',
    name: 'Equipment & Tool Rentals',
    description: 'Commercial and domestic appliance rentals',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  COMMUNITY_EVENTS: {
    key: 'community_events',
    name: 'Community Events & Tickets',
    description: 'Local neighborhood gatherings and ticketing',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  TOWNSQUARE: {
    key: 'townsquare',
    name: 'Townsquare Feed & Stories',
    description: 'Social feed, stories, community chat',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  DONATIONS_VOLUNTEER: {
    key: 'donations_volunteer',
    name: 'Donations & Volunteering',
    description: 'Local causes and NGO initiatives',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  PETS: {
    key: 'pets',
    name: 'Pet Registry & Care',
    description: 'Community pet registration and vet directory',
    enabled: false,
    scope: 'later',
    category: 'vertical'
  },
  PREMIUM_SaaS: {
    key: 'premium_saas',
    name: 'Premium Subscriptions & SaaS',
    description: 'Society SaaS billing, monetization tiers, promoted ads',
    enabled: false,
    scope: 'later',
    category: 'monetization'
  },
  WALLET_COINS: {
    key: 'wallet_coins',
    name: 'Wallet & Reward Coins',
    description: 'Reward coin minting, spin-the-wheel, promotional wallet balances',
    enabled: false,
    scope: 'later',
    category: 'monetization'
  },
  EXPERIMENTAL_ML: {
    key: 'experimental_ml',
    name: 'Experimental ML Ops',
    description: 'Telemetry heavy ML background jobs and automated rankers',
    enabled: false,
    scope: 'later',
    category: 'internal'
  }
};

/**
 * Check if a feature is enabled.
 * Respects environment override: FEATURE_<KEY_UPPERCASE>=true/false
 * Respects BYPASS_FEATURE_FLAGS=true in test environments.
 */
function isFeatureEnabled(featureKey, customEnv = process.env) {
  if (!featureKey) return false;
  const normalizedKey = String(featureKey).toLowerCase();

  // Test bypass flag: allows existing automated test suites to run unaltered
  if (customEnv && (customEnv.BYPASS_FEATURE_FLAGS === 'true' || customEnv.BYPASS_FEATURE_FLAGS === '1')) {
    return true;
  }

  // Find matching definition
  const featureDef = Object.values(FEATURES).find(f => f.key === normalizedKey);
  const defaultState = featureDef ? featureDef.enabled : false;

  // Environment override: e.g. FEATURE_CARPOOL=true
  const envVarName = `FEATURE_${normalizedKey.toUpperCase()}`;
  if (customEnv && customEnv[envVarName] !== undefined) {
    const val = customEnv[envVarName];
    return val === 'true' || val === '1';
  }

  return defaultState;
}

/**
 * Return all feature flags with resolved states.
 */
function getAllFeatures(customEnv = process.env) {
  const result = {};
  for (const [name, def] of Object.entries(FEATURES)) {
    result[def.key] = {
      ...def,
      is_enabled: isFeatureEnabled(def.key, customEnv)
    };
  }
  return result;
}

module.exports = {
  FEATURES,
  isFeatureEnabled,
  getAllFeatures
};

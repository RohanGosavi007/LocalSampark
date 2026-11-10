// Route gating for modules that are off at launch (F-107).
//
// Each prefix below belongs to a feature in packages/shared/src/features.js.
// While that feature is disabled, src/middleware.js serves the Coming Soon +
// pincode waitlist page in place of the module (a rewrite, so the URL a
// visitor shared or bookmarked still works once the module goes live).
//
// The flag defaults come from the shared registry. A module can be switched on
// for the web app at build time with NEXT_PUBLIC_ENABLED_FEATURES, a comma
// list of feature keys (e.g. "krishi,jobs"); it must be enabled on the API too
// (FEATURE_<KEY>=true), which answers 403 FEATURE_DISABLED until it is.

import { FEATURES, isFeatureEnabled } from '../../../../packages/shared/src/features';

/** Path prefix -> feature key. Longest prefixes first is not required: prefixes do not nest. */
export const GATED_ROUTE_PREFIXES = {
  '/krishi': 'krishi',
  '/carpool': 'carpool',
  '/jobs': 'jobs',
  '/properties': 'properties',
  '/real-estate': 'properties',
  '/medical': 'medical',
  '/health': 'medical',
  '/sos-dashboard': 'emergency_sos',
  '/scrap': 'scrap',
  '/chef': 'chef',
  '/equipment': 'equipment_rental',
  '/events': 'community_events',
  '/townsquare': 'townsquare',
  '/donations': 'donations_volunteer',
  '/volunteer': 'donations_volunteer',
  '/pets': 'pets',
  '/premium': 'premium_saas',
  '/subscriptions': 'premium_saas',
  '/wallet': 'wallet_coins',
  '/earn': 'wallet_coins',
  '/rewards': 'wallet_coins',
  '/society': 'society_management',
  '/society-admin': 'society_management',
  '/society-admin-dashboard': 'society_management',
  '/society-registration': 'society_management',
  '/resident': 'society_management',
  '/gatekeeper': 'society_management',
  '/security-dashboard': 'society_management',
};

/** The feature key gating `pathname`, or null when the path is not gated. */
export function featureForPath(pathname) {
  if (!pathname) return null;
  for (const [prefix, key] of Object.entries(GATED_ROUTE_PREFIXES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return key;
  }
  return null;
}

function buildTimeEnv() {
  const env = { NODE_ENV: process.env.NODE_ENV };
  const list = process.env.NEXT_PUBLIC_ENABLED_FEATURES || '';
  for (const key of list.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)) {
    env[`FEATURE_${key.toUpperCase()}`] = 'true';
  }
  return env;
}

/** Whether a feature is live for the web app. */
export function isWebFeatureEnabled(featureKey) {
  return isFeatureEnabled(featureKey, buildTimeEnv());
}

/** Display name for a feature key, from the shared registry. */
export function featureName(featureKey) {
  const def = Object.values(FEATURES).find((f) => f.key === featureKey);
  return def ? def.name : 'This module';
}

/** Short description for a feature key, from the shared registry. */
export function featureDescription(featureKey) {
  const def = Object.values(FEATURES).find((f) => f.key === featureKey);
  return def ? def.description : '';
}

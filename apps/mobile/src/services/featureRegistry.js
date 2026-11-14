/**
 * The live feature registry on Android (A12 / P6).
 *
 * GET /features is what an admin's kill switch changes, and what the API
 * enforces (a module that is off answers 403 FEATURE_DISABLED). The More tab
 * listed every module, so at launch almost every tile — Wallet, Jobs, Real
 * Estate, Medical, Events, Carpool, Society, Earn — led to a 403. Tiles now
 * follow the registry.
 *
 * When the registry cannot be read the launch defaults apply (below), so a
 * network failure shows the launch app rather than a blank or an everything-on
 * one. The defaults are a copy of packages/shared/src/features.js (Metro does
 * not import that package; __tests__/featureRegistry.test.js fails if they
 * drift).
 */
import { apiGet } from '../lib/api';

/** The features that are on at launch. Everything else is off until an admin turns it on. */
export const LAUNCH_FEATURES_ON = ['commerce_core', 'coupons', 'reviews', 'wishlist', 'notifications', 'support_grievance'];

const TTL_MS = 60000;
let cache = { at: 0, features: null };

export function resetFeatureRegistry() {
  cache = { at: 0, features: null };
}

/** { featureKey: boolean } from GET /features, the last good copy if it fails, or null. */
export async function loadFeatureRegistry({ now = Date.now, ttlMs = TTL_MS } = {}) {
  if (cache.features && now() - cache.at < ttlMs) return cache.features;
  try {
    const res = await apiGet('/features');
    const map = {};
    for (const [key, f] of Object.entries((res && res.features) || {})) map[key] = Boolean(f && f.is_enabled);
    if (Object.keys(map).length === 0) throw new Error('empty registry');
    cache = { at: now(), features: map };
    return map;
  } catch {
    return cache.features;
  }
}

/** Whether `key` is on: the registry's answer, else the launch default. No key means always on. */
export function featureEnabled(key, registry) {
  if (!key) return true;
  if (registry && Object.prototype.hasOwnProperty.call(registry, key)) return Boolean(registry[key]);
  return LAUNCH_FEATURES_ON.includes(key);
}

/** The entries ({ feature, ... }) whose module is on. */
export function visibleModules(entries, registry) {
  return entries.filter((entry) => featureEnabled(entry.feature, registry));
}

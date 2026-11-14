// The live feature registry (A12 / P6).
//
// GET /api/v1/features is what an admin's kill switch changes, and what the API
// itself enforces (a switched-off vertical answers 403 FEATURE_DISABLED). The
// web app decided from build-time environment alone, so an admin switching a
// module off blocked its API calls but left its navigation links and its pages
// in place — the very "toggle hides navigation and blocks route" the console
// promises.
//
// This reads the registry and keeps it for a short time. When it cannot be
// read (the API is down, slow or answers an error) the last good copy is used,
// and with none the caller falls back to the build-time defaults — an outage
// of the API must not take the whole site's navigation with it.
const TTL_MS = 15000;
const TIMEOUT_MS = 2000;

let cache = { at: 0, features: null, inflight: null };

/** Forgets what was loaded (tests). */
export function resetFeatureRegistry() {
  cache = { at: 0, features: null, inflight: null };
}

/**
 * { featureKey: boolean } from GET {apiUrl}/api/v1/features, or null when it has
 * never been readable. Concurrent callers share one request.
 */
export async function loadFeatureRegistry(apiUrl, { fetchImpl, now = Date.now, ttlMs = TTL_MS, timeoutMs = TIMEOUT_MS } = {}) {
  if (cache.features && now() - cache.at < ttlMs) return cache.features;
  if (cache.inflight) return cache.inflight;

  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) return cache.features;

  cache.inflight = (async () => {
    try {
      const res = await doFetch(`${apiUrl}/api/v1/features`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
      });
      if (!res.ok) throw new Error(`features answered ${res.status}`);
      const body = await res.json();
      const map = {};
      for (const [key, feature] of Object.entries((body && body.features) || {})) map[key] = Boolean(feature && feature.is_enabled);
      if (Object.keys(map).length === 0) throw new Error('features answered an empty registry');
      cache = { at: now(), features: map, inflight: null };
      return map;
    } catch (err) {
      const stale = cache.features;
      cache = { at: cache.at, features: stale, inflight: null };
      return stale;
    }
  })();
  return cache.inflight;
}

/** The registry's answer for `key`; the build-time `fallback` when the registry is unavailable or does not know it. */
export function resolveFeature(key, registry, fallback) {
  if (registry && Object.prototype.hasOwnProperty.call(registry, key)) return Boolean(registry[key]);
  return Boolean(fallback);
}

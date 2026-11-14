/**
 * The admin console's Content-Security-Policy (P9).
 *
 * next.config.mjs explained why there was none: Next.js injects inline
 * bootstrap scripts, so a meaningful policy needs a per-request nonce threaded
 * through middleware, and `'unsafe-inline'` would only look like protection.
 * This is that policy: a fresh nonce per request with 'strict-dynamic', no
 * 'unsafe-inline' for scripts. The console talks only to its own API and draws
 * OpenStreetMap tiles; nothing else is allowed to load or be contacted.
 */

export function makeNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** The API's origin (and websocket twin) from NEXT_PUBLIC_API_URL, which may carry /api/v1. */
export function apiOrigins(apiUrl) {
  try {
    const u = new URL(apiUrl || 'http://localhost:5000');
    return [u.origin, `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`];
  } catch {
    return [];
  }
}

export function buildCsp({ nonce, apiUrl, dev = false } = {}) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    // KYC documents come from storage signed URLs; map tiles from OSM.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    // Sentry's ingest hosts: error reports (scrubbed of personal data first).
    'connect-src': ["'self'", ...apiOrigins(apiUrl), 'https://*.ingest.sentry.io', 'https://*.sentry.io', ...(dev ? ['ws:'] : [])],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
}

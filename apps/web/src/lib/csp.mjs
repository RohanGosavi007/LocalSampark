/**
 * The web app's Content-Security-Policy (P9).
 *
 * The site sent no CSP and no security headers at all, so any script that
 * reached the page — an injected tag, a compromised dependency's payload —
 * ran with the customer's session and could post their token anywhere.
 *
 * Scripts: a fresh nonce per request plus 'strict-dynamic'. Next.js puts the
 * nonce on its own bootstrap scripts when it finds it in the request's CSP
 * header (middleware.js passes it on), the layout puts it on its two inline
 * scripts, and scripts those load (Razorpay's checkout.js, Firebase's
 * reCAPTCHA) inherit the trust. A host allowlist is kept for browsers without
 * 'strict-dynamic'; browsers with it ignore the list. 'unsafe-inline' is never
 * granted for scripts — with a nonce present, browsers ignore it anyway.
 *
 * Styles keep 'unsafe-inline': React style props and the CSS-in-JS used by a
 * few components set inline styles, and style injection is not script
 * execution.
 */

/** A base64 nonce from 16 random bytes (Web Crypto, available in middleware). */
export function makeNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** The API's origin and its websocket twin, from NEXT_PUBLIC_API_URL. */
export function apiOrigins(apiUrl) {
  try {
    const u = new URL(apiUrl);
    const ws = `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`;
    return [u.origin, ws];
  } catch {
    return [];
  }
}

const SCRIPT_HOSTS = ['https://checkout.razorpay.com', 'https://www.google.com', 'https://www.gstatic.com', 'https://apis.google.com'];
const CONNECT_HOSTS = [
  'https://*.razorpay.com',
  'https://*.googleapis.com', 'https://www.google.com', // Firebase Auth, reCAPTCHA
  'https://*.firebaseio.com', 'https://*.firebaseapp.com',
  'https://*.ingest.sentry.io', 'https://*.sentry.io',
  'https://api.mapbox.com', 'https://events.mapbox.com',
  'https://*.supabase.co', 'wss://*.supabase.co',
];
const FRAME_HOSTS = ['https://api.razorpay.com', 'https://checkout.razorpay.com', 'https://www.google.com', 'https://*.firebaseapp.com'];

export function buildCsp({ nonce, apiUrl, dev = false } = {}) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...SCRIPT_HOSTS, ...(dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
    // Shop and product photos come from whichever storage a seller's upload
    // went to, and avatars from a generator; any https image is allowed.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", ...apiOrigins(apiUrl), ...CONNECT_HOSTS, ...(dev ? ['ws:'] : [])],
    'frame-src': FRAME_HOSTS,
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
}

/** Headers for every response, page or asset. */
export const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Location is used (nearby shops, delivery address); camera for scanning
  // and uploads; payment for Razorpay. Everything else is off.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com"), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // Browsers ignore this over plain http (local runs), and honour it once
  // the site is served over https.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

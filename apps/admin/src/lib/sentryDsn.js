/**
 * The Sentry DSN, or undefined when the configured value is not one.
 *
 * A DSN is an https URL with a key before the host and a numeric project id.
 * Anything else (an unedited "YOUR_SENTRY_DSN" from a template, say) means "not
 * configured", so Sentry stays off instead of logging an error on every page.
 * Same rule as apps/web/src/lib/sentryDsn.js.
 */
export function sentryDsn(value = process.env.NEXT_PUBLIC_SENTRY_DSN) {
  if (!value || typeof value !== 'string') return undefined;
  try {
    const url = new URL(value.trim());
    // https, or http to this machine (a Sentry relay running locally, or a test
    // build): a loopback address cannot be a real Sentry, so it is harmless.
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const schemeOk = url.protocol === 'https:' || (url.protocol === 'http:' && loopback);
    if (!schemeOk || !url.username || !url.hostname || !/\/\d+$/.test(url.pathname)) return undefined;
    return value.trim();
  } catch {
    return undefined;
  }
}

/** 0..1 from an environment value, or the default: 10% in production, all in development. */
export function tracesSampleRate(value) {
  const n = Number.parseFloat(value ?? '');
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
}

/**
 * The Sentry DSN, or undefined when the configured value is not one.
 *
 * .env.production.example ships NEXT_PUBLIC_SENTRY_DSN=YOUR_FRONTEND_SENTRY_DSN,
 * and a build made from an unedited copy baked that string in: every page
 * then logged "Invalid Sentry Dsn: YOUR_FRONTEND_SENTRY_DSN" to the console
 * (caught by tests/e2e/web/homepage.spec.js once E2E ran a production build).
 * A DSN is an https URL with a key before the host; anything else means
 * "not configured", so Sentry stays off instead of failing on every page.
 */
export function sentryDsn(value = process.env.NEXT_PUBLIC_SENTRY_DSN) {
  if (!value || typeof value !== 'string') return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !url.username || !url.hostname || !/\/\d+$/.test(url.pathname)) return undefined;
    return value.trim();
  } catch {
    return undefined;
  }
}

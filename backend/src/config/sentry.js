/**
 * How the API reports errors to Sentry (P8).
 *
 * Kept apart from server.js so it can be tested: the settings are a pure
 * function of the environment, and what leaves the server is scrubbed by
 * scrubEvent. server.js used to call Sentry.init with `tracesSampleRate: 1.0`
 * and `profilesSampleRate: 1.0` (every request traced and profiled: a free-tier
 * quota gone in hours), no release (so a report could not be tied to a commit),
 * and nothing removing credentials from what it sent.
 *
 *   SENTRY_DSN                  an https DSN; without one Sentry is off
 *   SENTRY_ENVIRONMENT          default: NODE_ENV
 *   SENTRY_RELEASE              default: the commit (GIT_COMMIT / RENDER_GIT_COMMIT)
 *   SENTRY_TRACES_SAMPLE_RATE   0..1, default 0.1. Errors are always sent; this
 *                               only governs performance traces.
 *   SENTRY_PROFILES_SAMPLE_RATE 0..1, default 0 (profiling is off unless asked for)
 */
const { scrubEvent, scrubBreadcrumb } = require('../../../packages/shared/redact');

/** True for an https DSN of the form https://<key>@<host>/<project-id>. */
function validDsn(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' && Boolean(u.username) && /\/\d+$/.test(u.pathname);
  } catch {
    return false;
  }
}

function rate(value, fallback) {
  const n = Number.parseFloat(value ?? '');
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

/** The settings this module reads, by name (so the environment documentation can see them). */
function readEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    SENTRY_RELEASE: process.env.SENTRY_RELEASE,
    SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
    SENTRY_PROFILES_SAMPLE_RATE: process.env.SENTRY_PROFILES_SAMPLE_RATE,
    GIT_COMMIT: process.env.GIT_COMMIT,
    RENDER_GIT_COMMIT: process.env.RENDER_GIT_COMMIT,
  };
}

/**
 * { enabled, options }. Sentry runs in production with a valid DSN; anywhere
 * else it is off, so local runs and tests send nothing.
 */
function sentryConfig(env = readEnv(), pkgVersion = '1.0.0') {
  const enabled = env.NODE_ENV === 'production' && validDsn(env.SENTRY_DSN);
  if (!enabled) return { enabled: false, options: null };
  return {
    enabled: true,
    options: {
      dsn: env.SENTRY_DSN.trim(),
      environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
      release: env.SENTRY_RELEASE || env.GIT_COMMIT || env.RENDER_GIT_COMMIT || `localsampark-api@${pkgVersion}`,
      tracesSampleRate: rate(env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
      profilesSampleRate: rate(env.SENTRY_PROFILES_SAMPLE_RATE, 0),
      sendDefaultPii: false,
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    },
  };
}

module.exports = { sentryConfig, scrubEvent, scrubBreadcrumb, validDsn };

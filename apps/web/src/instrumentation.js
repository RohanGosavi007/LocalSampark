import * as Sentry from '@sentry/nextjs';

/**
 * Server- and edge-runtime Sentry initialisation.
 *
 * This file previously existed as `instrumentation.js.disabled`, and
 * `sentry.server.config.js` was deleted in commit 5efafdb, so for some time
 * nothing initialised Sentry outside the browser: an unhandled exception in a
 * Server Component, a route handler or middleware was never reported, even
 * though NEXT_PUBLIC_SENTRY_DSN is set in .env.production and the client half
 * was reporting normally. Server errors are the ones you cannot see from a user
 * bug report, so that was the more valuable half to be missing.
 *
 * WHY IT WAS PROBABLY TURNED OFF, AND WHAT CHANGED
 * ------------------------------------------------
 * The disabled version hardcoded `tracesSampleRate: 1.0`, which sends a
 * performance transaction for *every* request. On a busy deployment that
 * exhausts a Sentry quota quickly and adds per-request overhead, which is the
 * most likely reason someone reached for the off switch.
 *
 * Sampling is now environment-driven and defaults to 10% in production, and
 * crucially this does not weaken error reporting at all: tracesSampleRate
 * governs performance transactions only. Exceptions are always captured
 * regardless of it. So this restores the part that matters without restoring
 * the cost that probably killed it.
 *
 * Tune without a code change via SENTRY_TRACES_SAMPLE_RATE (e.g. "0" to switch
 * tracing off entirely while keeping error capture).
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

const tracesSampleRate = (() => {
  const configured = Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '');
  if (Number.isFinite(configured) && configured >= 0 && configured <= 1) {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
})();

export function register() {
  // Without a DSN, Sentry.init is a no-op that still installs global handlers.
  // Skipping it entirely keeps local and CI runs completely untouched.
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate,
      debug: false,
      environment: process.env.NODE_ENV,
    });
  }
}

/**
 * Reports errors thrown while rendering on the server.
 *
 * Next.js catches these itself and renders an error boundary, so without this
 * hook they never reach Sentry even when register() above has run. Next calls
 * it for Server Components, route handlers and middleware.
 */
export const onRequestError = Sentry.captureRequestError;

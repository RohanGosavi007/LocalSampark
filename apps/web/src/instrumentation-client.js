import * as Sentry from '@sentry/nextjs';
import { sentryDsn } from './lib/sentryDsn';
import { scrubEvent, scrubBreadcrumb } from '@localsampark/shared/redact';

/**
 * Browser-side Sentry initialisation.
 *
 * This was `apps/web/sentry.client.config.js`. Sentry 10 deprecates that
 * filename in favour of Next.js 15's `instrumentation-client` convention and
 * warns that the old one stops working under Turbopack; it lives in `src/`
 * because this project uses a src directory, which is where Next looks for it
 * (the same place as `instrumentation.js` beside this file).
 *
 * Sampling matches the server half in `instrumentation.js`: environment-driven,
 * defaulting to 10% in production instead of the hardcoded 100% this file used
 * to carry. Error capture is unaffected by the trace sample rate -- exceptions
 * are always sent -- so this only trims performance-transaction volume.
 */
const tracesSampleRate = (() => {
  const configured = Number.parseFloat(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? ''
  );
  if (Number.isFinite(configured) && configured >= 0 && configured <= 1) {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
})();

// Only with a real DSN: an unedited template value (YOUR_FRONTEND_SENTRY_DSN)
// made Sentry log an error on every page. See lib/sentryDsn.js.
const dsn = sentryDsn();

if (dsn) Sentry.init({
  dsn,
  tracesSampleRate,
  debug: false,
  environment: process.env.NODE_ENV,
  // Ties a report to the deployed commit (and to the source maps uploaded for it).
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
  // Nothing personal leaves the browser or server: no IP, cookies or request
  // bodies by default, and what remains is scrubbed (packages/shared/redact.js).
  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
});

// No onRouterTransitionStart export: @sentry/nextjs 10.74.0 as installed here
// does not expose captureRouterTransitionStart, so exporting it would just hand
// Next.js `undefined`. Navigation transactions are covered by the browser
// tracing integration that Sentry.init enables by default.

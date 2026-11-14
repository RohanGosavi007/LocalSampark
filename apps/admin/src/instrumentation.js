import * as Sentry from '@sentry/nextjs';
import { scrubEvent, scrubBreadcrumb } from '@localsampark/shared/redact';
import { sentryDsn, tracesSampleRate } from './lib/sentryDsn';

/**
 * Server- and edge-runtime Sentry for the admin console (P8).
 *
 * The console had no error reporting: an exception in a Server Component or a
 * route handler was visible only in the host's log. It handles the most
 * sensitive data in the system (KYC documents, payouts, customer phone numbers),
 * so what is sent is scrubbed (packages/shared/redact.js): no cookies, auth
 * headers or request bodies, no personal details about the signed-in admin.
 *
 * Off without a valid NEXT_PUBLIC_SENTRY_DSN. Errors are always sent;
 * SENTRY_TRACES_SAMPLE_RATE (default 0.1 in production) governs traces only.
 */
const dsn = sentryDsn();

export function register() {
  if (!dsn) return;
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate: tracesSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
      debug: false,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
      sendDefaultPii: false,
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    });
  }
}

/** Reports errors thrown while rendering on the server, which Next otherwise swallows. */
export const onRequestError = Sentry.captureRequestError;

import * as Sentry from '@sentry/nextjs';
import { scrubEvent, scrubBreadcrumb } from '@localsampark/shared/redact';
import { sentryDsn, tracesSampleRate } from './lib/sentryDsn';

/**
 * Browser-side Sentry for the admin console (P8). See instrumentation.js for
 * what is sent and what is not. No session replay and no default PII.
 */
const dsn = sentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: tracesSampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE),
    debug: false,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

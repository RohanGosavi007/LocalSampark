/**
 * Crash reporting.
 *
 * The mobile app had no crash reporting at all, so native crashes — the
 * CallKeep SecurityException, the Hermes `instanceof` error — were invisible
 * except as a screenshot of Android's "Send feedback" dialog. Sentry's React
 * Native SDK installs both a JS error handler and native (JVM/NDK) handlers, so
 * those arrive automatically with a full stack instead.
 *
 * Imported from index.js ahead of expo-router/entry so initialisation happens
 * before any application module is evaluated; several of the startup failures
 * this app has hit occurred during early module evaluation, which a later init
 * inside app/_layout.js would have missed entirely.
 *
 * No DSN configured means no reporting: every call here is a no-op rather than
 * a hard failure, so a missing EXPO_PUBLIC_SENTRY_DSN can never break a build
 * or a launch.
 */
import Constants from 'expo-constants';

let Sentry = null;
let initialised = false;

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

try {
  // Required lazily: if the native module is unavailable (a build where
  // autolinking did not pick it up), this must not take the app down.
  Sentry = require('@sentry/react-native');
} catch (e) {
  console.warn('[sentry] SDK unavailable, crash reporting disabled:', e?.message);
}

if (Sentry && DSN) {
  try {
    const version = Constants?.expoConfig?.version ?? 'unknown';

    Sentry.init({
      dsn: DSN,
      // Native crash handlers are the entire point of adding this - the two
      // startup failures so far were a native SecurityException and a Hermes
      // engine error, neither of which a JS-only handler would have seen.
      enableNative: true,
      enableNativeCrashHandling: true,
      // Symbolication needs release + dist to match what the build uploaded.
      release: `in.localsampark.app@${version}`,
      dist: String(Constants?.expoConfig?.android?.versionCode ?? ''),
      environment: __DEV__ ? 'development' : 'production',
      // Crash reporting is the goal; performance tracing is sampled low so it
      // cannot become a bandwidth cost on users' mobile data.
      tracesSampleRate: __DEV__ ? 1.0 : 0.1,
      // Breadcrumbs make a startup crash far easier to place, but console
      // breadcrumbs can capture noisy PII-adjacent logs, so they stay off.
      enableCaptureFailedRequests: true,
      beforeBreadcrumb(breadcrumb) {
        return breadcrumb?.category === 'console' ? null : breadcrumb;
      },
    });

    initialised = true;
    console.log('[sentry] crash reporting enabled');
  } catch (e) {
    console.warn('[sentry] init failed, continuing without crash reporting:', e?.message);
  }
} else if (!DSN) {
  console.log('[sentry] EXPO_PUBLIC_SENTRY_DSN not set - crash reporting disabled');
}

/** Wraps the root component for navigation context; a no-op when uninitialised. */
export function wrap(Component) {
  if (!Sentry || !initialised || typeof Sentry.wrap !== 'function') return Component;
  try {
    return Sentry.wrap(Component);
  } catch (e) {
    console.warn('[sentry] wrap failed:', e?.message);
    return Component;
  }
}

/** Report a handled error. Safe to call whether or not Sentry is active. */
export function captureException(error, context) {
  if (!Sentry || !initialised) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch (e) {
    // Reporting must never itself throw.
  }
}

export const isEnabled = () => initialised;
export default { wrap, captureException, isEnabled };

/**
 * The user's analytics choice on Android (P11, DPDP Act 2023).
 *
 * Opt-in and off by default: until the user says yes, nothing is collected and
 * nothing is sent. Saying no, or not answering, is the same state. The choice
 * is kept on the device and can be changed in Settings at any time, as easily
 * as it was made.
 *
 *   'granted' | 'denied' | 'unset'    (only 'granted' allows analytics)
 *
 * Product analytics (impressions and taps: src/lib/telemetry.js) are the only
 * thing this gates. Crash reports carry no personal data and are not analytics.
 *
 * `isAllowed()` is synchronous and reads a cache, because `track()` is called
 * from scroll and tap handlers and cannot wait on storage. Until `loadConsent()`
 * has finished the cache says 'unset', which means "off": a slow read can only
 * lose a few events, never send one the user did not allow.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CONSENT_STORAGE_KEY = '@localsampark_analytics_consent';

let cached = 'unset';
let loaded = false;
const listeners = new Set();

function normalise(value) {
  if (value === 'granted' || value === 'denied') return value;
  return 'unset';
}

/** Reads the saved choice into the cache. Safe to call more than once. */
export async function loadConsent() {
  try {
    cached = normalise(await AsyncStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    cached = 'unset'; // storage unavailable: treated as no answer
  }
  loaded = true;
  return cached;
}

/** 'granted' | 'denied' | 'unset', from the cache. */
export function getConsent() {
  return cached;
}

/** True once the saved choice has been read, so a prompt is not shown too early. */
export function consentLoaded() {
  return loaded;
}

/** True only when the user has said yes. */
export function isAllowed() {
  return cached === 'granted';
}

/** Records the choice (`true` = allow analytics) and tells subscribers. */
export async function setConsent(allow) {
  cached = allow ? 'granted' : 'denied';
  loaded = true;
  try {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, cached);
  } catch {
    /* storage unavailable: the choice holds until the app closes */
  }
  for (const listener of Array.from(listeners)) {
    try { listener(cached); } catch { /* one subscriber must not stop the others */ }
  }
  return cached;
}

/** Calls `listener(choice)` whenever the choice changes. Returns the unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For tests: back to the state of a fresh install. */
export function resetConsentForTests() {
  cached = 'unset';
  loaded = false;
  listeners.clear();
}

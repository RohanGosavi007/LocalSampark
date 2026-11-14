// The visitor's analytics choice (P11).
//
// Stored under the key the consent banner has always used, with the values it
// has always written ('accepted' / 'declined'), so existing visitors keep their
// answer. Three states, and ONLY 'granted' allows analytics: a visitor who has
// not answered is not tracked (opt-in), and one who declined is not tracked.
//
//   'accepted' -> 'granted'   'declined' -> 'denied'   anything else -> 'unset'
//
// Product analytics (impressions, clicks: lib/telemetry.js) are the only thing
// this gates. Error reporting (Sentry) carries no personal data and is not
// analytics; login and cart state are strictly necessary.

export const CONSENT_KEY = 'localsampark_consent';
/** Fired on window whenever the choice changes, so analytics can stop at once. */
export const CONSENT_CHANGED = 'ls:consent-changed';
/** Fired on window by a "Privacy choices" link to reopen the banner. */
export const OPEN_CONSENT = 'ls:open-consent';

function browserStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // storage blocked
  }
}

/** 'granted' | 'denied' | 'unset'. */
export function readConsent(storage = browserStorage()) {
  try {
    const value = storage ? storage.getItem(CONSENT_KEY) : null;
    if (value === 'accepted') return 'granted';
    if (value === 'declined') return 'denied';
  } catch {
    /* storage blocked: treated as no answer */
  }
  return 'unset';
}

/** True only when the visitor has said yes. */
export function analyticsAllowed(storage = browserStorage()) {
  return readConsent(storage) === 'granted';
}

/** Records the choice (`true` = allow analytics) and tells the page. */
export function writeConsent(allow, storage = browserStorage(), target = typeof window !== 'undefined' ? window : null) {
  try {
    if (storage) storage.setItem(CONSENT_KEY, allow ? 'accepted' : 'declined');
  } catch {
    /* storage blocked: the choice holds for this page view only */
  }
  if (target && typeof target.dispatchEvent === 'function' && typeof Event === 'function') {
    target.dispatchEvent(new Event(CONSENT_CHANGED));
  }
}

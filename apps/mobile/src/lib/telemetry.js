/**
 * Interaction telemetry for the mobile app.
 *
 * Batching semantics, event names and viewability thresholds are duplicated
 * from packages/shared/telemetry-core.js rather than imported. Metro is
 * configured without watchFolders, so apps/mobile cannot resolve modules
 * outside its own tree — src/theme/index.js duplicates the design tokens for
 * exactly this reason. The two clients must measure identically or their CTRs
 * are not comparable in the admin console, so mlTelemetryParity.test.js holds
 * the three copies in step.
 *
 * Two rules from the server contract:
 *
 *   - Fire and forget. No retries: a retried impression double-counts the
 *     denominator of every rate metric.
 *
 *   - Never throw into caller code. This runs inside FlatList viewability
 *     callbacks and onPress handlers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { API_BASE, getAuthHeaders } from './api';

const MAX_BATCH_SIZE = 25;
const FLUSH_INTERVAL_MS = 10000;
const MAX_BUFFER_SIZE = 200;

/**
 * Shared with the web client so both count an impression at the same moment.
 * itemVisiblePercentThreshold and minimumViewTime are the exact prop names
 * FlatList's viewabilityConfig expects.
 */
export const VIEWABILITY = Object.freeze({
  itemVisiblePercentThreshold: 50,
  minimumViewTime: 1000,
});

export const EVENTS = Object.freeze({
  IMPRESSION: 'IMPRESSION',
  CARD_CLICK: 'CARD_CLICK',
  DETAIL_VIEW: 'DETAIL_VIEW',
  BOOKMARK: 'BOOKMARK',
  CALL_VENDOR: 'CALL_VENDOR',
  SHARE: 'SHARE',
  PURCHASE_INTENT: 'PURCHASE_INTENT',
});

const SESSION_KEY = '@ls_telemetry_session';

let buffer = [];
let timer = null;
let enabled = true;
let flushing = false;
let sessionToken = null;
let appStateSub = null;
const seenImpressions = new Set();

/**
 * A rotating session token, held in memory for the app's lifetime.
 *
 * Read from AsyncStorage on init so a backgrounded-and-resumed session keeps
 * its identity, but regenerated on a cold start. The server hashes it with a
 * per-boot salt before storing, so this value never reaches the database.
 */
async function loadSessionToken() {
  try {
    const stored = await AsyncStorage.getItem(SESSION_KEY);
    if (stored) {
      sessionToken = stored;
      return;
    }
  } catch {
    /* storage unavailable; an in-memory token still works for this run */
  }
  sessionToken = `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await AsyncStorage.setItem(SESSION_KEY, sessionToken);
  } catch {
    /* non-fatal */
  }
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

function cancelTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Queues one event. Returns nothing and never throws. */
export function track(eventType, itemType, itemId, extra = {}) {
  if (!enabled) return;
  try {
    if (!eventType || !itemType || itemId == null) return;

    if (buffer.length >= MAX_BUFFER_SIZE) buffer.shift();

    buffer.push({
      event_type: String(eventType).toUpperCase(),
      item_type: String(itemType).toLowerCase(),
      item_id: String(itemId),
      local_hour: new Date().getHours(),
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      ...extra,
    });

    if (buffer.length >= MAX_BATCH_SIZE) flush();
    else scheduleFlush();
  } catch {
    /* tracking must never surface to the user */
  }
}

/** Records an impression once per item per surface per session. */
export function trackImpression(surface, itemType, itemId, extra = {}) {
  const key = `${surface}::${itemId}`;
  if (seenImpressions.has(key)) return;
  seenImpressions.add(key);
  track(EVENTS.IMPRESSION, itemType, itemId, { surface, ...extra });
}

/** Call on pull-to-refresh or when a feed's filters change. */
export function resetImpressions(surface) {
  if (!surface) {
    seenImpressions.clear();
    return;
  }
  for (const key of Array.from(seenImpressions)) {
    if (key.startsWith(`${surface}::`)) seenImpressions.delete(key);
  }
}

export const trackClick = (surface, itemType, itemId, extra = {}) =>
  track(EVENTS.CARD_CLICK, itemType, itemId, { surface, ...extra });
export const trackDetailView = (itemType, itemId, extra = {}) =>
  track(EVENTS.DETAIL_VIEW, itemType, itemId, extra);
export const trackBookmark = (itemType, itemId, extra = {}) =>
  track(EVENTS.BOOKMARK, itemType, itemId, extra);
export const trackCallVendor = (itemType, itemId, extra = {}) =>
  track(EVENTS.CALL_VENDOR, itemType, itemId, extra);
export const trackShare = (itemType, itemId, extra = {}) =>
  track(EVENTS.SHARE, itemType, itemId, extra);
export const trackPurchaseIntent = (itemType, itemId, extra = {}) =>
  track(EVENTS.PURCHASE_INTENT, itemType, itemId, extra);

/**
 * Sends the buffered events.
 *
 * Deliberately NOT routed through OfflineQueueService. That service exists to
 * replay user actions that must not be lost — an order, a booking — when
 * connectivity returns. Telemetry is the opposite case: events replayed hours
 * later would carry the wrong local_hour and land outside the window whose
 * metrics they belong to, and impressions replayed after a retry would
 * double-count the CTR denominator. Dropping a batch on a bad connection is the
 * correct behaviour here.
 */
export async function flush() {
  cancelTimer();
  if (flushing || buffer.length === 0) return { sent: 0 };

  const batch = buffer;
  buffer = [];
  flushing = true;

  try {
    const payload = { events: batch };
    if (sessionToken) payload.session_token = sessionToken;

    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/ml/events`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { sent: batch.length };
  } catch {
    return { sent: 0, failed: batch.length };
  } finally {
    flushing = false;
  }
}

export function setEnabled(value) {
  enabled = Boolean(value);
  if (!enabled) {
    cancelTimer();
    buffer = [];
  }
}

export function pendingCount() {
  return buffer.length;
}

/**
 * Starts collection and flushes when the app leaves the foreground.
 *
 * Backgrounding is the main way a mobile session ends, so without this the last
 * batch of nearly every session is lost.
 */
export async function initTelemetry() {
  await loadSessionToken();

  try {
    const res = await fetch(`${API_BASE}/ml/config/public`);
    if (res.ok) {
      const cfg = await res.json();
      setEnabled(cfg.telemetry_enabled !== false);
    }
  } catch {
    // Default to collecting: the history is what a later collaborative stage
    // needs, and it only accumulates while this is running.
  }

  if (appStateSub) appStateSub.remove();
  appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'background' || state === 'inactive') flush();
  });
}

/** Removes the AppState listener. Used by tests and on teardown. */
export function stopTelemetry() {
  cancelTimer();
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
}

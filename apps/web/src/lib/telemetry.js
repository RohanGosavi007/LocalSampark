'use client';

/**
 * Interaction telemetry for the web app.
 *
 * Batching semantics, event names and viewability thresholds are duplicated
 * from packages/shared/telemetry-core.js rather than imported. apps/mobile
 * cannot resolve outside its own tree — Metro is configured without
 * watchFolders — so a shared runtime import would work here and break there,
 * and the two clients must measure identically or their CTRs are not
 * comparable. src/theme/index.js on mobile duplicates the design tokens for the
 * same reason. mlTelemetryParity.test.js holds the three copies in step.
 *
 * Two rules from the server contract:
 *
 *   - Fire and forget. No retries: a retried impression double-counts the
 *     denominator of every rate metric. Losing a batch costs a little training
 *     data; resending one corrupts CTR.
 *
 *   - Never throw into caller code. This runs inside render paths and scroll
 *     handlers, and a feed must not break over a tracking detail.
 */

import { API_BASE, getAuthHeaders } from './api';

const MAX_BATCH_SIZE = 25;
const FLUSH_INTERVAL_MS = 10000;
const MAX_BUFFER_SIZE = 200;

export const VIEWABILITY = Object.freeze({
  itemVisiblePercentThreshold: 50,
  minimumViewTimeMs: 1000,
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

const SESSION_STORAGE_KEY = 'ls_telemetry_session';

let buffer = [];
let timer = null;
let enabled = true;
let flushing = false;
const seenImpressions = new Set();

/**
 * A rotating, client-generated session token.
 *
 * sessionStorage, not localStorage: it should last one browsing session and no
 * longer. The server hashes it with a per-boot salt before storing, so the
 * value here never reaches the database and cannot be joined back to a user
 * after the fact.
 */
function getSessionToken() {
  if (typeof window === 'undefined') return null;
  try {
    let token = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!token) {
      token = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
    }
    return token;
  } catch {
    // Private mode, or storage disabled. Anonymous events without a session id
    // are still usable for per-item counts.
    return null;
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
  if (!enabled || typeof window === 'undefined') return;
  try {
    if (!eventType || !itemType || itemId == null) return;

    if (buffer.length >= MAX_BUFFER_SIZE) buffer.shift();

    buffer.push({
      event_type: String(eventType).toUpperCase(),
      item_type: String(itemType).toLowerCase(),
      item_id: String(itemId),
      // Captured client-side: the server may run in a different timezone and
      // this signal is about the user's local time of day.
      local_hour: new Date().getHours(),
      platform: 'web',
      ...extra,
    });

    if (buffer.length >= MAX_BATCH_SIZE) flush();
    else scheduleFlush();
  } catch {
    /* tracking must never surface to the user */
  }
}

/**
 * Records an impression once per item per surface per session.
 *
 * Without de-duplication, a card crossing the fold repeatedly as the user
 * scrolls up and down logs an impression each time, inflating the denominator
 * for whatever happens to sit near the fold.
 */
export function trackImpression(surface, itemType, itemId, extra = {}) {
  const key = `${surface}::${itemId}`;
  if (seenImpressions.has(key)) return;
  seenImpressions.add(key);
  track(EVENTS.IMPRESSION, itemType, itemId, { surface, ...extra });
}

/** Call when a feed is refreshed or its filters change. */
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
 * The buffer is swapped before the request, so an event tracked while it is in
 * flight lands in the next batch instead of being sent twice.
 */
export async function flush() {
  cancelTimer();
  if (flushing || buffer.length === 0) return { sent: 0 };

  const batch = buffer;
  buffer = [];
  flushing = true;

  try {
    const payload = { events: batch };
    const token = getSessionToken();
    if (token) payload.session_token = token;

    await fetch(`${API_BASE}/ml/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
      // Lets the request outlive the page during a navigation, which is when
      // the final batch of a session would otherwise be lost.
      keepalive: true,
    });
    return { sent: batch.length };
  } catch {
    // Not requeued, by design. See the note at the top of the file.
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
 * Asks the server whether to collect at all, and flushes on page hide.
 *
 * `visibilitychange` rather than `beforeunload`: the latter does not fire
 * reliably on mobile browsers, which is exactly where a session tends to end
 * without a formal navigation.
 */
export async function initTelemetry() {
  if (typeof window === 'undefined' || window.__lsTelemetryInit) return;
  window.__lsTelemetryInit = true;

  try {
    const res = await fetch(`${API_BASE}/ml/config/public`);
    if (res.ok) {
      const cfg = await res.json();
      setEnabled(cfg.telemetry_enabled !== false);
    }
  } catch {
    // Default to collecting. Telemetry is independent of whether ranking is on:
    // the history is what a later collaborative stage needs, and it only
    // accumulates while this is running.
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

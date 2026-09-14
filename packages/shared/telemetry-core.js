/**
 * Shared interaction-telemetry buffer.
 *
 * Web and mobile need identical batching semantics, because the whole point of
 * the metrics is comparing them. If the web client flushed on a different
 * threshold or counted an impression at a different visibility fraction, its
 * CTR would not be comparable to the app's and the admin console would be
 * showing two different measurements side by side under one label.
 *
 * Everything platform-specific — how to POST, how to persist across a restart,
 * how to detect backgrounding — is injected, so this file has no imports and
 * runs in both a browser and Hermes.
 *
 * Design rules, both inherited from the server contract:
 *
 *   - Events are fire-and-forget. There is no retry, because a retried
 *     impression double-counts the denominator of every rate metric. A dropped
 *     batch loses a little training data; a retried one corrupts CTR.
 *
 *   - Nothing here may throw into caller code. Tracking sits inside render
 *     paths and scroll handlers; an exception would take down a feed over a
 *     telemetry detail.
 */

const DEFAULTS = {
  // 25 events is roughly one screenful of cards plus the taps on them, which
  // keeps a flush to one request per scroll burst rather than per card.
  maxBatchSize: 25,
  flushIntervalMs: 10000,
  // Server cap. Anything above this is discarded by the API anyway, so there is
  // no point holding it in memory.
  maxBufferSize: 200,
};

function createTelemetryClient(options) {
  const opts = { ...DEFAULTS, ...(options || {}) };
  const { send, getSessionToken, getContext, onError } = opts;

  if (typeof send !== 'function') {
    throw new Error('createTelemetryClient requires a send(payload) function');
  }

  let buffer = [];
  let timer = null;
  let enabled = true;
  let flushing = false;

  function report(err) {
    if (typeof onError === 'function') {
      try {
        onError(err);
      } catch {
        /* an error reporter that throws is not worth propagating */
      }
    }
  }

  function scheduleFlush() {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      flush();
    }, opts.flushIntervalMs);
    // Node/Jest only: keeps a pending flush from holding the process open.
    if (timer && typeof timer.unref === 'function') timer.unref();
  }

  function cancelTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  /**
   * Queues one event.
   *
   * Returns nothing and never throws, so it is safe to call directly from a
   * viewability callback or an onPress handler.
   */
  function track(eventType, itemType, itemId, extra) {
    if (!enabled) return;
    try {
      if (!eventType || !itemType || itemId == null) return;

      if (buffer.length >= opts.maxBufferSize) {
        // Drop the oldest. A full buffer means flushes are failing; the newest
        // events are the ones still worth having.
        buffer.shift();
      }

      buffer.push({
        event_type: String(eventType).toUpperCase(),
        item_type: String(itemType).toLowerCase(),
        item_id: String(itemId),
        // Captured client-side: the server may be in a different timezone, and
        // this signal is about the user's local time of day.
        local_hour: new Date().getHours(),
        ...(extra || {}),
      });

      if (buffer.length >= opts.maxBatchSize) flush();
      else scheduleFlush();
    } catch (err) {
      report(err);
    }
  }

  /** Convenience wrappers so call sites read as intent, not as event strings. */
  const impression = (itemType, itemId, extra) => track('IMPRESSION', itemType, itemId, extra);
  const click = (itemType, itemId, extra) => track('CARD_CLICK', itemType, itemId, extra);
  const detailView = (itemType, itemId, extra) => track('DETAIL_VIEW', itemType, itemId, extra);
  const bookmark = (itemType, itemId, extra) => track('BOOKMARK', itemType, itemId, extra);
  const callVendor = (itemType, itemId, extra) => track('CALL_VENDOR', itemType, itemId, extra);
  const share = (itemType, itemId, extra) => track('SHARE', itemType, itemId, extra);
  const purchaseIntent = (itemType, itemId, extra) => track('PURCHASE_INTENT', itemType, itemId, extra);

  /**
   * Sends whatever is buffered.
   *
   * The buffer is swapped out before the send, not after: an event tracked
   * while the request is in flight belongs to the next batch, and leaving it in
   * place would send it twice.
   */
  async function flush() {
    cancelTimer();
    if (flushing || buffer.length === 0) return { sent: 0 };

    const batch = buffer;
    buffer = [];
    flushing = true;

    try {
      const payload = { events: batch };
      const token = typeof getSessionToken === 'function' ? getSessionToken() : null;
      if (token) payload.session_token = token;
      if (typeof getContext === 'function') Object.assign(payload, getContext() || {});

      await send(payload);
      return { sent: batch.length };
    } catch (err) {
      // Deliberately not requeued. See the note at the top of the file: a
      // retried impression is worse than a lost one.
      report(err);
      return { sent: 0, failed: batch.length };
    } finally {
      flushing = false;
    }
  }

  /**
   * Turns collection on or off, following the server's public config.
   *
   * Disabling drops the buffer rather than flushing it — if the operator has
   * switched telemetry off, the right behaviour is to stop sending, not to get
   * one last batch in.
   */
  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) {
      cancelTimer();
      buffer = [];
    }
  }

  function pendingCount() {
    return buffer.length;
  }

  return {
    track,
    impression,
    click,
    detailView,
    bookmark,
    callVendor,
    share,
    purchaseIntent,
    flush,
    setEnabled,
    pendingCount,
  };
}

/**
 * Impression de-duplication.
 *
 * A card crossing the viewport threshold repeatedly as the user scrolls back
 * and forth would otherwise log an impression each time, inflating the CTR
 * denominator for whatever sits near the fold. One impression per item per
 * surface per session is what makes the metric mean "was shown".
 */
function createImpressionTracker() {
  const seen = new Set();

  return {
    shouldTrack(surface, itemId) {
      const key = `${surface}::${itemId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
    /** Called when a feed is refreshed or its filters change. */
    reset(surface) {
      if (!surface) {
        seen.clear();
        return;
      }
      for (const key of Array.from(seen)) {
        if (key.startsWith(`${surface}::`)) seen.delete(key);
      }
    },
    size() {
      return seen.size;
    },
  };
}

/**
 * Visibility thresholds, shared so web and mobile measure the same thing.
 *
 * 50% visible for 1 second is the common convention (IAB's display standard),
 * and matching it means the CTR here is comparable with the numbers people are
 * used to reading elsewhere.
 */
const VIEWABILITY = Object.freeze({
  itemVisiblePercentThreshold: 50,
  minimumViewTimeMs: 1000,
});

module.exports = {
  createTelemetryClient,
  createImpressionTracker,
  VIEWABILITY,
  DEFAULTS,
};

/**
 * A short memory of the requests this process has served.
 *
 * The admin performance screen showed an "average latency" that was
 * Math.random() and a log panel of five invented lines — a Stripe signature
 * mismatch and a refused Redis connection that never happened among them. A
 * dashboard that makes things up is worse than none: it shows an operator
 * faults that do not exist and hides the ones that do. This is where it now
 * gets real numbers.
 *
 * It is deliberately small. The audit middleware already times every request;
 * each timing is kept here in a fixed-size ring, along with the requests worth
 * a human's attention (a 4xx or 5xx, or a slow one). Nothing is written to
 * disk and nothing survives a restart.
 *
 * Per process: behind a load balancer each instance reports only its own
 * traffic. That is the honest scope for an in-memory figure, and the response
 * says so.
 */

const SAMPLE_LIMIT = 500;
const NOTABLE_LIMIT = 50;

const samples = [];
const notable = [];

function push(list, item, limit) {
  list.push(item);
  if (list.length > limit) list.shift();
}

/** Records one finished request. Never throws: metrics must not break a response. */
function record({ method, path, statusCode, responseTimeMs, slowThresholdMs = 500 }) {
  try {
    if (!Number.isFinite(responseTimeMs)) return;
    push(samples, { ms: responseTimeMs, status: statusCode }, SAMPLE_LIMIT);

    const slow = responseTimeMs > slowThresholdMs;
    if (statusCode >= 400 || slow) {
      // The path without its query string: a token or a phone number passed as
      // a query parameter has no business in a dashboard.
      const route = `${method} ${String(path || '').split('?')[0]}`;
      let level = 'WARN';
      let message = `Responded ${statusCode} in ${responseTimeMs}ms`;
      if (statusCode >= 500) level = 'ERROR';
      else if (slow && statusCode < 400) message = `Slow request: ${responseTimeMs}ms`;
      push(notable, { timestamp: new Date().toISOString(), level, route, message }, NOTABLE_LIMIT);
    }
  } catch {
    /* see above */
  }
}

/** Latency and error figures over the retained samples; nulls when there are none. */
function summary() {
  if (samples.length === 0) {
    return { samples: 0, avgLatencyMs: null, p95LatencyMs: null, errorRatePercent: null };
  }
  const sorted = samples.map((s) => s.ms).sort((a, b) => a - b);
  const total = sorted.reduce((sum, ms) => sum + ms, 0);
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  const errors = samples.filter((s) => s.status >= 500).length;
  return {
    samples: samples.length,
    avgLatencyMs: Math.round(total / sorted.length),
    p95LatencyMs: p95,
    errorRatePercent: Math.round((errors / samples.length) * 1000) / 10,
  };
}

/** The most recent notable requests, newest first. */
function recentNotable(limit = 20) {
  return notable.slice(-limit).reverse();
}

function reset() {
  samples.length = 0;
  notable.length = 0;
}

module.exports = { record, summary, recentNotable, reset };

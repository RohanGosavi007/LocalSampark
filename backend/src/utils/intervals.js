/**
 * Central registry for the background polling timers.
 *
 * Every recurring job in this codebase used a bare `setInterval`, which caused
 * two distinct production problems:
 *
 *  1. An un-`unref`'d interval keeps the libuv event loop alive forever. On
 *     SIGTERM the HTTP server closed but the process never exited, so the
 *     orchestrator (Render/Docker) hit its grace period and SIGKILLed the
 *     container — killing in-flight requests. That is precisely the failure a
 *     zero-downtime deploy is supposed to avoid.
 *
 *  2. `setInterval` does not wait for an async callback to finish. The 30s
 *     high-frequency task runs multi-statement SQL; under production load a
 *     single pass can exceed 30s, and the next tick fires anyway. Overlapping
 *     runs then pile up, each holding a pool connection, until the pool is
 *     exhausted and heap grows without bound.
 *
 * `trackInterval` fixes both: the timer is unref'd so it never blocks exit, a
 * re-entrancy guard skips a tick while the previous one is still running, and
 * every handle is recorded so `clearAllIntervals()` can stop them during drain.
 */

const registry = new Map();

function trackInterval(name, fn, ms, { runImmediately = false } = {}) {
  if (registry.has(name)) {
    // Guards against double-initialisation (e.g. startQueueEngine called twice),
    // which previously doubled the polling rate with no way to undo it.
    return registry.get(name);
  }

  let running = false;
  const tick = async () => {
    if (running) return; // previous pass has not finished; skip this tick
    running = true;
    try {
      await fn();
    } catch (err) {
      // A throw here would otherwise become an unhandled rejection and, in
      // production, trigger the server-wide shutdown handler in server.js.
      // eslint-disable-next-line global-require
      require('../config/logger').error(`Interval "${name}" threw: ${err && err.message}`);
    } finally {
      running = false;
    }
  };

  const handle = setInterval(tick, ms);
  handle.unref();
  registry.set(name, handle);

  if (runImmediately) tick();
  return handle;
}

function clearAllIntervals() {
  for (const handle of registry.values()) clearInterval(handle);
  const count = registry.size;
  registry.clear();
  return count;
}

module.exports = { trackInterval, clearAllIntervals };

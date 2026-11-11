/**
 * One attempt to place an order, and the Idempotency-Key that goes with it (C8).
 *
 * The same key is sent until the server has given a definite answer: a retry
 * after a timeout or a lost connection (the order may already have been placed)
 * is then answered with the order already placed, not a second one. A refusal
 * spends the key, so a corrected request is a new attempt. React-free so it can
 * be tested; app/modules/checkout uses it.
 */

/** A key the server accepts: 8-128 of letters, digits, - _ : . */
export function newAttemptKey(now = Date.now(), random = Math.random) {
  const part = () => random().toString(36).slice(2, 12).padEnd(10, '0');
  return `${now.toString(36)}-${part()}${part()}`;
}

/**
 * Whether the key may be used again after this error. Kept when the answer
 * never arrived (network, timeout: ApiError 503 / 408), when the server failed
 * (5xx, not stored by the server) or when the first press is still being
 * placed (409). Spent on any other refusal.
 */
export function keepKeyAfter(error) {
  const status = error && error.status;
  if (!status) return true;
  return status >= 500 || status === 408 || status === 409;
}

/** Holds the key across presses of the button. */
export function createAttempt(makeKey = newAttemptKey) {
  let key = null;
  return {
    key() {
      if (!key) key = makeKey();
      return key;
    },
    failed(error) {
      if (!keepKeyAfter(error)) key = null;
    },
    done() {
      key = null;
    },
  };
}

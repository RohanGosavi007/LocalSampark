/**
 * C8 in the app: the Idempotency-Key that goes with each attempt to place an
 * order (src/services/checkoutAttempt.js), and that the checkout screen sends
 * it on both ways of placing an order.
 */
const fs = require('fs');
const path = require('path');
const { newAttemptKey, keepKeyAfter, createAttempt } = require('../src/services/checkoutAttempt');

// The pattern backend/src/middleware/idempotency.middleware.js accepts.
const SERVER_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/;

test('[C8.10] keys are ones the server accepts, and differ between attempts', () => {
  const keys = new Set(Array.from({ length: 200 }, () => newAttemptKey()));
  expect(keys.size).toBe(200);
  for (const k of keys) expect(k).toMatch(SERVER_PATTERN);
  // Even an unlucky random source gives a full-length key.
  expect(newAttemptKey(0, () => 0)).toMatch(SERVER_PATTERN);
});

test('[C8.11] a retry after a lost answer reuses the key; a refusal or a placed order spends it', () => {
  let n = 0;
  const attempt = createAttempt(() => `attempt-key-${++n}`);
  const first = attempt.key();
  expect(attempt.key()).toBe(first);

  for (const lost of [{ status: 503 }, { status: 408 }, { status: 500 }, { status: 409 }, new Error('offline')]) {
    attempt.failed(lost);
    expect(attempt.key()).toBe(first);
  }
  expect(keepKeyAfter({ status: 402 })).toBe(false);
  attempt.failed({ status: 400 });
  const second = attempt.key();
  expect(second).not.toBe(first);

  attempt.done();
  expect(attempt.key()).not.toBe(second);
});

test('[C8.12] the checkout screen sends the key with a single-shop and a multi-shop order', () => {
  const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'modules', 'checkout', 'index.js'), 'utf8');
  for (const route of ["'/checkout'", "'/shops/cart/batch-checkout'"]) {
    const at = screen.indexOf(`apiPost(${route}`);
    expect(at).toBeGreaterThan(-1);
    const call = screen.slice(at, screen.indexOf('});', screen.indexOf('}, {', at)) + 3);
    expect(call).toMatch(/'Idempotency-Key': idempotencyKey\(\)/);
  }
  expect(screen).toMatch(/attempt\.current\.done\(\)/);
});

const { ASAP, timeOptions, keepChoice, slotLabel } = require('../src/services/deliveryTime');

test('[C8.18] the app offers ASAP and the quote\'s slots, sends the choice, and falls back to ASAP when a slot is gone', () => {
  const quote = { slots: [
    { start: '2026-11-11T06:30:00.000Z', day: 'today', from: '12:00', to: '13:00' },
    { start: '2026-11-12T03:30:00.000Z', day: 'tomorrow', from: '09:00', to: '10:00' },
  ] };
  expect(timeOptions(quote)).toEqual([
    { value: ASAP, label: 'As soon as possible' },
    { value: '2026-11-11T06:30:00.000Z', label: 'Today 12:00–13:00' },
    { value: '2026-11-12T03:30:00.000Z', label: 'Tomorrow 09:00–10:00' },
  ]);
  expect(timeOptions(null)).toEqual([{ value: ASAP, label: 'As soon as possible' }]);
  expect(keepChoice('2026-11-12T03:30:00.000Z', quote)).toBe('2026-11-12T03:30:00.000Z');
  expect(keepChoice('2026-11-10T03:30:00.000Z', quote)).toBe(ASAP);
  expect(keepChoice(undefined, quote)).toBe(ASAP);
  expect(slotLabel(quote.slots[0])).toBe('Today 12:00–13:00');

  const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'modules', 'checkout', 'index.js'), 'utf8');
  expect((screen.match(/^\s*deliverySlot,$/gm) || []).length).toBe(2);
});

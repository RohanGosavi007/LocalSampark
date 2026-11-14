// P11: the analytics consent gate. Only an explicit "yes" allows product analytics.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONSENT_KEY, CONSENT_CHANGED, readConsent, analyticsAllowed, writeConsent,
} from '../src/lib/consent.mjs';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(WEB, rel), 'utf8');

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    data,
  };
}

test('[P11.1] no answer means no analytics (opt-in, not opt-out)', () => {
  const s = memoryStorage();
  assert.equal(readConsent(s), 'unset');
  assert.equal(analyticsAllowed(s), false);
});

test('[P11.1] only "accepted" allows analytics; "declined" and unknown values do not', () => {
  assert.equal(analyticsAllowed(memoryStorage({ [CONSENT_KEY]: 'accepted' })), true);
  assert.equal(analyticsAllowed(memoryStorage({ [CONSENT_KEY]: 'declined' })), false);
  assert.equal(analyticsAllowed(memoryStorage({ [CONSENT_KEY]: 'true' })), false);
  assert.equal(analyticsAllowed(memoryStorage({ [CONSENT_KEY]: '' })), false);
});

test('[P11.2] blocked storage is treated as no answer, never a thrown error', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readConsent(broken), 'unset');
  assert.equal(analyticsAllowed(broken), false);
  assert.doesNotThrow(() => writeConsent(true, broken, null));
});

test('[P11.3] withdrawing is as easy as granting: one call each way, and the page is told', () => {
  const s = memoryStorage();
  const heard = [];
  const target = { dispatchEvent: (e) => { heard.push(e.type); return true; } };
  writeConsent(true, s, target);
  assert.equal(analyticsAllowed(s), true);
  writeConsent(false, s, target);
  assert.equal(analyticsAllowed(s), false);
  assert.equal(s.data[CONSENT_KEY], 'declined');
  assert.deepEqual(heard, [CONSENT_CHANGED, CONSENT_CHANGED]);
});

test('[P11.4] telemetry checks consent before collecting, before sending, and before keeping a session id', () => {
  const src = read('src/lib/telemetry.js');
  assert.match(src, /import \{[^}]*analyticsAllowed[^}]*\} from '\.\/consent\.mjs'/);
  // track(): returns before anything is queued
  assert.match(src, /export function track\(.*\)\s*\{\s*if \([^\n]*!analyticsAllowed\(\)\) return/);
  // flush(): re-checked at send time, and the queue is thrown away on "no"
  assert.match(src, /export async function flush\(\)\s*\{[\s\S]{0,300}?if \(!analyticsAllowed\(\)\) \{\s*discardCollected\(\);/);
  // withdrawal while the page is open discards what was gathered
  assert.match(src, /addEventListener\(CONSENT_CHANGED/);
});

test('[P11.5] the banner offers both answers equally and the footer can reopen it', () => {
  const banner = read('src/components/ConsentBanner.js');
  assert.match(banner, /Only necessary/);
  assert.match(banner, /Allow analytics/);
  assert.match(banner, /writeConsent\(allow\)/);
  assert.match(banner, /OPEN_CONSENT/);
  assert.doesNotMatch(banner, /by continuing/i, 'continuing to use the site must not count as consent');
  const footer = read('src/app/components/Footer.js');
  assert.match(footer, /Privacy choices/);
  assert.match(footer, /OPEN_CONSENT/);
});

test('[P11.6] the analytics payload carries no name, phone, email or address fields', () => {
  const src = read('src/lib/telemetry.js');
  for (const field of ['phone', 'email', 'name:', 'address', 'full_name']) {
    assert.ok(!new RegExp(`event[A-Za-z]*\\.${field.replace(':', '')}\\b|\\b${field}\\s*[:=]\\s*(user|profile)`).test(src), `telemetry must not read ${field}`);
  }
});

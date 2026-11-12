/**
 * C1 / Decision D3: the sign-in page offers what the server has open
 * (src/lib/loginMethods.js).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_METHODS, readMethods, loginTabs, offerGoogle, normaliseEmail, cleanCode,
} from '../src/lib/loginMethods.js';

test('[C1.22] email code first; phone only when the server has it on; Google only when both ends are set up', () => {
  assert.deepEqual(loginTabs(DEFAULT_METHODS).map((t) => t.id), ['emailOtp', 'password']);
  assert.deepEqual(loginTabs(readMethods({ methods: { emailOtp: true, google: false, phoneOtp: true } })).map((t) => t.id), ['emailOtp', 'password', 'phone']);
  // An unreadable answer is treated as the launch default, not as "everything on".
  assert.deepEqual(readMethods(null), { emailOtp: true, google: false, phoneOtp: false });
  assert.deepEqual(readMethods({ methods: { phoneOtp: 'yes' } }), { emailOtp: true, google: false, phoneOtp: false });

  assert.equal(offerGoogle({ google: true }, true), true);
  assert.equal(offerGoogle({ google: true }, false), false);
  assert.equal(offerGoogle({ google: false }, true), false);
});

test('[C1.23] addresses and codes are cleaned the way the server checks them', () => {
  assert.equal(normaliseEmail('  Asha@Example.COM '), 'asha@example.com');
  assert.equal(normaliseEmail('asha@'), null);
  assert.equal(normaliseEmail('no spaces@x.com'), null);
  assert.equal(cleanCode(' 123 456 '), '123456');
  assert.equal(cleanCode('12ab56'), null);
  assert.equal(cleanCode('123'), null);
});

test('[C1.24] the sign-in page takes its tabs from the server, and logout can end every device', () => {
  const page = readFileSync(new URL('../src/app/login/page.js', import.meta.url), 'utf8');
  assert.match(page, /loginTabs\(loginMethods\)/);
  assert.doesNotMatch(page, /label: '📱 Phone OTP'/);
  const ctx = readFileSync(new URL('../src/context/AuthContext.js', import.meta.url), 'utf8');
  assert.match(ctx, /allDevices: Boolean\(allDevices\)/);
  const security = readFileSync(new URL('../src/app/profile/security/page.js', import.meta.url), 'utf8');
  assert.match(security, /logout\(\{ allDevices: true \}\)/);
});

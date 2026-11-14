// P8: which Sentry DSNs are accepted, and that the page's CSP lets reports reach them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sentryDsn } from '../src/lib/sentryDsn.js';
import { buildCsp, dsnOrigin } from '../src/lib/csp.mjs';

test('[P8.15] a DSN is an https URL with a key and a numeric project, or http to this machine; a template placeholder is not one', () => {
  assert.equal(sentryDsn('https://abc@o1.ingest.sentry.io/42'), 'https://abc@o1.ingest.sentry.io/42');
  assert.equal(sentryDsn('http://abc@localhost:5099/1'), 'http://abc@localhost:5099/1');
  assert.equal(sentryDsn('http://abc@sentry.example.org/1'), undefined, 'plain http to another host is refused');
  assert.equal(sentryDsn('YOUR_FRONTEND_SENTRY_DSN'), undefined);
  assert.equal(sentryDsn('https://o1.ingest.sentry.io/42'), undefined, 'no key');
  assert.equal(sentryDsn(''), undefined);
});

test('[P8.15] the CSP lets error reports reach the configured DSN (a self-hosted Sentry included), and nothing else is added', () => {
  const csp = (dsn) => buildCsp({ nonce: 'n', apiUrl: 'https://api.example.in', sentryDsn: dsn });
  const connect = (policy) => policy.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src'));
  assert.match(connect(csp('https://k@sentry.example.org/3')), /https:\/\/sentry\.example\.org/);
  assert.doesNotMatch(connect(csp(undefined)), /example\.org/);
  assert.equal(dsnOrigin('http://k@evil.example/1'), null, 'plain http to another host never gets a CSP exception');
  assert.equal(dsnOrigin('not a url'), null);
  assert.doesNotMatch(csp('https://k@sentry.example.org/3'), /script-src[^;]*sentry\.example\.org/);
});

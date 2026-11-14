/**
 * A12 / P6 on the website: an admin's kill switch reaches the web app.
 *
 * The header and the route gate decided from build-time environment alone, so a
 * module an admin switched off was still linked from the navigation and still
 * served. They now follow GET /api/v1/features (src/lib/featureRegistry.mjs),
 * falling back to the build-time defaults only when the registry is unreadable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadFeatureRegistry, resolveFeature, resetFeatureRegistry } from '../src/lib/featureRegistry.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const registry = (features) => async () => ({ ok: true, status: 200, json: async () => ({ success: true, features }) });
const feature = (is_enabled) => ({ is_enabled });

test.beforeEach(() => resetFeatureRegistry());

test('[A12.6] the registry maps each feature to whether the admin has it on', async () => {
  const map = await loadFeatureRegistry('http://api', { fetchImpl: registry({ carpool: feature(false), commerce_core: feature(true) }) });
  assert.deepEqual(map, { carpool: false, commerce_core: true });
});

test('[A12.6] the live answer beats the build-time default, in both directions', () => {
  assert.equal(resolveFeature('krishi', { krishi: true }, false), true); // admin switched it on
  assert.equal(resolveFeature('commerce_core', { commerce_core: false }, true), false); // admin switched it off
});

test('[A12.6] a feature the registry does not list falls back to the build-time default', () => {
  assert.equal(resolveFeature('mystery', { carpool: true }, true), true);
  assert.equal(resolveFeature('mystery', { carpool: true }, false), false);
});

test('[A12.6] an unreachable or failing API leaves the build-time defaults in charge, not a blank site', async () => {
  const down = async () => { throw new Error('ECONNREFUSED'); };
  assert.equal(await loadFeatureRegistry('http://api', { fetchImpl: down }), null);
  resetFeatureRegistry();
  assert.equal(await loadFeatureRegistry('http://api', { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) }), null);
  resetFeatureRegistry();
  assert.equal(await loadFeatureRegistry('http://api', { fetchImpl: registry({}) }), null); // an empty registry is not an answer
  assert.equal(resolveFeature('carpool', null, false), false);
  assert.equal(resolveFeature('commerce_core', null, true), true);
});

test('[A12.6] the last good answer is kept when a later request fails', async () => {
  let t = 0;
  const now = () => t;
  await loadFeatureRegistry('http://api', { fetchImpl: registry({ carpool: feature(true) }), now, ttlMs: 10 });
  t = 1000; // past the TTL
  const stale = await loadFeatureRegistry('http://api', { fetchImpl: async () => { throw new Error('timeout'); }, now, ttlMs: 10 });
  assert.deepEqual(stale, { carpool: true });
});

test('[A12.6] answers are reused within the TTL and requests are shared', async () => {
  let calls = 0;
  const counting = async () => { calls += 1; return { ok: true, json: async () => ({ features: { carpool: feature(false) } }) }; };
  await Promise.all([1, 2, 3].map(() => loadFeatureRegistry('http://api', { fetchImpl: counting })));
  await loadFeatureRegistry('http://api', { fetchImpl: counting });
  assert.equal(calls, 1);
});

test('[P6.7] the header and the route gate use the live registry, not the build-time flag alone', () => {
  const header = read('../src/app/components/Header.js');
  assert.match(header, /useFeatureRegistry\(\)/);
  assert.doesNotMatch(header, /isFeatureEnabled\(/);

  const middleware = read('../src/middleware.js');
  assert.match(middleware, /loadFeatureRegistry\(API_URL\)/);
  assert.match(middleware, /resolveFeature\(feature,/);
  // Only gated paths ask the registry.
  assert.match(middleware, /const enabled = feature\r?\n?\s*\?/);
});

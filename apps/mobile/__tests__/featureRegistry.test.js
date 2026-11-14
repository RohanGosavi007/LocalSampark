/**
 * A12 / P6 on Android: an admin's kill switch reaches the module tiles.
 *
 * The More tab listed every module, so at launch most tiles led to a 403
 * FEATURE_DISABLED. Tiles now follow GET /features, with the launch defaults
 * when it cannot be read.
 */
jest.mock('../src/lib/api', () => ({ apiGet: jest.fn() }));

const fs = require('fs');
const path = require('path');
const { apiGet } = require('../src/lib/api');
const registry = require('../src/services/featureRegistry');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const feature = (is_enabled) => ({ is_enabled });

beforeEach(() => {
  apiGet.mockReset();
  registry.resetFeatureRegistry();
});

describe('[A12.7] the live registry reaches the Android app', () => {
  test('[A12.7] the registry maps each feature to whether the admin has it on', async () => {
    apiGet.mockResolvedValueOnce({ success: true, features: { carpool: feature(true), commerce_core: feature(true), jobs: feature(false) } });
    expect(await registry.loadFeatureRegistry()).toEqual({ carpool: true, commerce_core: true, jobs: false });
    expect(apiGet).toHaveBeenCalledWith('/features');
  });

  test('[A12.7] the live answer beats the launch default, in both directions', () => {
    expect(registry.featureEnabled('carpool', { carpool: true })).toBe(true); // switched on by the admin
    expect(registry.featureEnabled('commerce_core', { commerce_core: false })).toBe(false); // switched off
  });

  test('[A12.7] a feature the registry does not list, and an unreadable registry, use the launch defaults', async () => {
    expect(registry.featureEnabled('carpool', {})).toBe(false);
    expect(registry.featureEnabled('commerce_core', {})).toBe(true);
    expect(registry.featureEnabled('carpool', null)).toBe(false);
    apiGet.mockRejectedValueOnce(new Error('offline'));
    expect(await registry.loadFeatureRegistry()).toBeNull();
    apiGet.mockResolvedValueOnce({ success: true, features: {} });
    registry.resetFeatureRegistry();
    expect(await registry.loadFeatureRegistry()).toBeNull(); // an empty registry is not an answer
  });

  test('[A12.7] the last good copy is kept when a later request fails, and answers are reused briefly', async () => {
    let t = 0;
    apiGet.mockResolvedValueOnce({ features: { carpool: feature(true) } });
    await registry.loadFeatureRegistry({ now: () => t, ttlMs: 10 });
    await registry.loadFeatureRegistry({ now: () => t, ttlMs: 10 });
    expect(apiGet).toHaveBeenCalledTimes(1); // within the TTL
    t = 1000;
    apiGet.mockRejectedValueOnce(new Error('timeout'));
    expect(await registry.loadFeatureRegistry({ now: () => t, ttlMs: 10 })).toEqual({ carpool: true });
  });

  test('[A12.7] tiles for a module that is off are dropped; a tile with no feature always stays', () => {
    const tiles = [{ title: 'Carpool', feature: 'carpool' }, { title: 'Home Services' }, { title: 'Wallet', feature: 'wallet_coins' }];
    expect(registry.visibleModules(tiles, null).map((t) => t.title)).toEqual(['Home Services']);
    expect(registry.visibleModules(tiles, { carpool: true, wallet_coins: false }).map((t) => t.title)).toEqual(['Carpool', 'Home Services']);
  });

  test('[A12.7] the launch defaults are exactly what the shared registry has on', () => {
    const shared = require('../../../packages/shared/src/features');
    const on = Object.values(shared.FEATURES).filter((f) => f.enabled).map((f) => f.key).sort();
    expect([...registry.LAUNCH_FEATURES_ON].sort()).toEqual(on);
  });

  test('[P6.10] every module tile on the More tab names a feature the shared registry knows', () => {
    const shared = require('../../../packages/shared/src/features');
    const keys = Object.values(shared.FEATURES).map((f) => f.key);
    const src = read('app/(tabs)/more.js');
    const named = [...src.matchAll(/feature: '([a-z_]+)'/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThanOrEqual(8);
    for (const key of named) expect(keys).toContain(key);
    expect(src).toContain('useVisibleModules(MODULES)');
    expect(src).toContain('visibleModules.map(');
    expect(src).not.toContain('MODULES.map(');
  });
});

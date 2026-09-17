/**
 * Mobile territory resolution: the degradation ladder and mock locations.
 *
 * Two things are pinned here.
 *
 * **A faked fix must never become an attribution.** Android reports when a
 * position came from a mock provider. It is not a security control — a
 * determined spoofer patches the app — but a GPS spoofer is a free app and the
 * ordinary case matters: a user standing in one franchise's area can otherwise
 * point the app at another's and have their orders, and the commission on them,
 * attributed there. The client must not send a flagged fix as coordinates.
 *
 * **The ladder must not skip a rung or invent one.** The failure mode that
 * looks like success is answering from the wrong rung and reporting it as the
 * right one: showing a twelve-hour-old cached pincode while claiming "located
 * by GPS" tells the user something false about how confident to be.
 *
 * The tests set the device state explicitly rather than mocking the resolver's
 * own functions, so what is under test is the decision, not a restatement of it.
 */

const CACHE_KEY = '@localsampark_territory_resolution';

// Re-required after each jest.resetModules() below. Holding a top-level
// reference instead would leave the tests poking a different module instance
// from the one the resolver loaded, and every device state they set would be
// silently ignored.
let Location;
let AsyncStorage;
let resolver;

/** The last URL the resolver asked the server for, parsed into params. */
function lastRequestParams() {
  const call = global.fetch.mock.calls[global.fetch.mock.calls.length - 1];
  if (!call) return null;
  return Object.fromEntries(new URL(call[0], 'http://localhost').searchParams);
}

function serverAnswers(body) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  });
}

const RESOLVED = {
  success: true,
  resolved: true,
  method: 'pincode',
  territory: { id: 't-1', name: 'Pune Central', pincode: '411001' },
  franchise: { franchise_partner_id: 'fp-1', status: 'active' },
};

beforeEach(() => {
  jest.resetModules();
  global.fetch = jest.fn();

  Location = require('./__mocks__/expoLocation');
  AsyncStorage = require('./__mocks__/asyncStorage');
  Location.__reset();
  AsyncStorage.__store.clear();

  resolver = require('../src/services/territoryResolver');
  // The module keeps the last fix in scope so two screens opening together do
  // not each wake the GPS; tests must not inherit one another's fix.
  resolver.__resetFixCache();
});

describe('pincode normalisation on the device', () => {
  test('accepts a six-digit code and strips the spacing people type', () => {
    expect(resolver.normalizePincode('411 001')).toBe('411001');
    expect(resolver.normalizePincode(' 411-001 ')).toBe('411001');
  });

  test('rejects what the server would reject, without a round trip', () => {
    // Leading zero: no Indian pincode begins with 0, and accepting one here
    // would send the server a code it silently drops while the app believes the
    // entry was accepted.
    expect(resolver.normalizePincode('011001')).toBeNull();
    expect(resolver.normalizePincode('41100')).toBeNull();
    expect(resolver.normalizePincode('4110011')).toBeNull();
    expect(resolver.normalizePincode('abcdef')).toBeNull();
    expect(resolver.normalizePincode(null)).toBeNull();
  });
});

describe('mock locations', () => {
  test('a mocked fix is never sent as coordinates', async () => {
    Location.__state.position = {
      coords: { latitude: 19.07, longitude: 72.87, accuracy: 5 },
      mocked: true,
    };
    serverAnswers({ resolved: false, method: 'unresolved', reason: 'no_location_signal' });

    await resolver.resolveTerritory();

    const params = lastRequestParams();
    // The spoofed coordinates must not appear in the request at all. Sending
    // them with a flag would leave the server one missed check away from
    // attributing revenue to a location the user invented.
    expect(params.lat).toBeUndefined();
    expect(params.lng).toBeUndefined();
    expect(params.mocked).toBe('true');
  });

  test('a mocked fix does not silently fall through to a confident answer', async () => {
    Location.__state.position = {
      coords: { latitude: 19.07, longitude: 72.87, accuracy: 5 },
      mocked: true,
    };
    serverAnswers({ resolved: false, method: 'unresolved', reason: 'no_location_signal' });

    const result = await resolver.resolveTerritory();

    expect(result.resolved).toBeFalsy();
    expect(result.needsManualEntry).toBe(true);
  });

  test('a genuine fix is sent as coordinates', async () => {
    serverAnswers(RESOLVED);

    const result = await resolver.resolveTerritory();

    const params = lastRequestParams();
    expect(params.lat).toBe('18.53');
    expect(params.lng).toBe('73.87');
    expect(params.mocked).toBeUndefined();
    expect(result.source).toBe('gps');
  });
});

describe('the degradation ladder', () => {
  test('declined permission falls through to the manual picker, and never prompts on its own', async () => {
    Location.__state.foregroundStatus = 'denied';

    const result = await resolver.resolveTerritory();

    // A permission dialog raised by a background refresh is the fastest way to
    // be denied permanently, so asking has to be the caller's decision.
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(result.needsManualEntry).toBe(true);
    expect(result.resolved).toBeFalsy();
  });

  test('permission is requested only when the caller allows the prompt', async () => {
    Location.__state.foregroundStatus = 'denied';
    Location.__state.requestStatus = 'granted';
    serverAnswers(RESOLVED);

    const result = await resolver.resolveTerritory({ allowPrompt: true });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(result.resolved).toBe(true);
  });

  test('location services switched off degrades rather than erroring', async () => {
    Location.__state.servicesEnabled = false;

    const result = await resolver.resolveTerritory();

    expect(result.needsManualEntry).toBe(true);
    expect(result.reason).toBe('location_services_off');
  });

  test('a GPS fix the server cannot place falls through to the cached pincode', async () => {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ pincode: '411001', territoryId: 't-1', territoryName: 'Pune Central', at: Date.now() })
    );

    // The common case today: boundaries are quarantined, so a coordinate query
    // legitimately resolves to nothing and must not end the ladder.
    serverAnswers({ resolved: false, method: 'unresolved', reason: 'not_serviceable' });
    serverAnswers(RESOLVED);

    const result = await resolver.resolveTerritory();

    expect(result.resolved).toBe(true);
    expect(result.source).toBe('cache');
    expect(lastRequestParams().pincode).toBe('411001');
  });

  test('offline with a cached answer returns the cached answer, flagged as offline', async () => {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        pincode: '411001',
        territoryId: 't-1',
        territoryName: 'Pune Central',
        at: Date.now() - 13 * 60 * 60 * 1000, // beyond the freshness window
      })
    );

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ resolved: false }) });
    global.fetch.mockRejectedValueOnce(new Error('network down'));

    const result = await resolver.resolveTerritory();

    // The last place this user genuinely resolved to beats an empty screen —
    // but it is marked stale and offline so the UI does not present a
    // half-day-old answer as a live one.
    expect(result.resolved).toBe(true);
    expect(result.offline).toBe(true);
    expect(result.stale).toBe(true);
    expect(result.method).toBe('cached_pincode');
  });

  test('nothing available at all asks the user rather than guessing', async () => {
    Location.__state.foregroundStatus = 'denied';

    const result = await resolver.resolveTerritory();

    expect(result.needsManualEntry).toBe(true);
    expect(result.territory).toBeUndefined();
  });

  test('an explicit pincode wins over GPS', async () => {
    serverAnswers(RESOLVED);

    const result = await resolver.resolveTerritory({ pincode: '411 001' });

    // The user has just said where they are; the device's opinion is not a
    // tie-breaker, and the normalised form is what goes to the server.
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(lastRequestParams().pincode).toBe('411001');
    expect(result.source).toBe('manual');
  });

  test('an invalid manual pincode never reaches the server', async () => {
    const result = await resolver.resolveTerritory({ pincode: '99' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.reason).toBe('invalid_pincode');
    expect(result.needsManualEntry).toBe(true);
  });
});

describe('battery posture', () => {
  test('asks for balanced accuracy, not the GPS-hardware tier', async () => {
    serverAnswers(RESOLVED);
    await resolver.resolveTerritory();

    // High accuracy engages GPS hardware for metre-level precision. Territory
    // resolution needs to know which suburb someone is in.
    expect(Location.__lastOptions.accuracy).toBe(Location.Accuracy.Balanced);
  });

  test('two resolutions in quick succession wake the GPS once', async () => {
    serverAnswers(RESOLVED);
    serverAnswers(RESOLVED);

    await resolver.resolveTerritory();
    await resolver.resolveTerritory();

    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });
});

describe('useTerritoryStore', () => {
  let useTerritoryStore;

  beforeEach(() => {
    ({ useTerritoryStore } = require('../src/store/useTerritoryStore'));
  });

  test('resolveAndLock locks the territory and records how it was reached', async () => {
    serverAnswers(RESOLVED);

    await useTerritoryStore.getState().resolveAndLock();
    const s = useTerritoryStore.getState();

    expect(s.isLocked).toBe(true);
    expect(s.territoryId).toBe('t-1');
    expect(s.pincode).toBe('411001');
    // method is the server's basis, source is where the input came from. The UI
    // needs both to explain itself honestly.
    expect(s.method).toBe('pincode');
    expect(s.source).toBe('gps');
    expect(s.franchise.franchise_partner_id).toBe('fp-1');
  });

  test('an unresolvable location clears the lock instead of keeping a stale one', async () => {
    serverAnswers(RESOLVED);
    await useTerritoryStore.getState().resolveAndLock();
    expect(useTerritoryStore.getState().isLocked).toBe(true);

    // The user has moved somewhere the platform does not serve. Holding the
    // previous territory would attribute their orders to a franchise that does
    // not cover where they now are.
    //
    // The cached pincode is cleared first so the ladder genuinely reaches its
    // end. Left in place, the cache rung answers — correctly — and the lock is
    // supposed to survive; that is the offline case covered above, not this one.
    AsyncStorage.__store.clear();
    Location.__state.position = {
      coords: { latitude: 12.97, longitude: 77.59, accuracy: 10 },
      mocked: false,
    };
    resolver.__resetFixCache();
    serverAnswers({ resolved: false, method: 'unresolved', reason: 'not_serviceable' });

    await useTerritoryStore.getState().resolveAndLock();
    const s = useTerritoryStore.getState();

    expect(s.isOutOfBounds).toBe(true);
    expect(s.needsManualEntry).toBe(true);
  });

  test('refreshOnBorderCross reports true only when the serving territory changed', async () => {
    serverAnswers(RESOLVED);
    await useTerritoryStore.getState().resolveAndLock();

    resolver.__resetFixCache();
    serverAnswers(RESOLVED);
    const unchanged = await useTerritoryStore.getState().refreshOnBorderCross();
    expect(unchanged).toBe(false);

    resolver.__resetFixCache();
    serverAnswers({
      ...RESOLVED,
      territory: { id: 't-2', name: 'Pimpri', pincode: '411017' },
    });
    const changed = await useTerritoryStore.getState().refreshOnBorderCross();
    expect(changed).toBe(true);
    expect(useTerritoryStore.getState().pincode).toBe('411017');
  });
});

describe('useLocationServices delegates rather than duplicating', () => {
  // This hook once carried its own copy of the ladder, and the copy drifted:
  // it prompted for permission at launch, never checked for a mocked fix, had
  // no cached rung, and called the older /zones/resolve. A duplicate that
  // drifts produces wrong answers rather than errors, so the absence of one is
  // worth pinning in the source the way the backend pins its boundary filter.
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(
    path.join(__dirname, '../src/hooks/useLocationServices.js'),
    'utf8'
  );

  test('does not reach for expo-location itself', () => {
    expect(source).not.toMatch(/require\(['"]expo-location['"]\)/);
    expect(source).not.toMatch(/from ['"]expo-location['"]/);
  });

  test('makes no HTTP call of its own', () => {
    // Including the superseded /zones/resolve it used to call. The endpoint is
    // named in this file's header comment explaining why it went, so the check
    // is for a call rather than a mention.
    expect(source).not.toMatch(/fetch\s*\(/);
  });

  test('goes through the territory store', () => {
    expect(source).toContain('resolveAndLock');
  });

  test('offers the coverage-interest path for an unserved area', () => {
    // "Not serviceable" is a dead end without this; the plan calls for the
    // unserved case to end in an offer rather than an apology.
    expect(source).toContain('registerCoverageInterest');
  });
});

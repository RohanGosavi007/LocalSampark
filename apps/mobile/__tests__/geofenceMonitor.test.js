/**
 * Anti-spoofing and offline resilience on the device.
 *
 * Two independent concerns, both of which fail silently when they fail.
 *
 * **Spoofing.** `position.mocked` catches a mock *provider*, which is what a
 * free GPS-spoofing app from the store uses. It does not catch a patched build
 * or a spoofer hooking the location APIs, which hands over coordinates with the
 * flag clear. The second signal is movement that is not physically possible:
 * a spoofer can clear a flag but cannot make Pune-to-Mumbai-in-thirty-seconds
 * look like a drive.
 *
 * **Offline durability.** A rider crosses a franchise boundary at the edge of a
 * serviced area, which is exactly where the signal goes. A transition reported
 * only live is lost precisely when it matters, and it must carry the time of
 * the crossing rather than of the upload — otherwise every reconnection's
 * backlog lands at the moment the signal came back.
 */

process.env.EXPO_PUBLIC_API_URL = 'http://test.local/api';

const QUEUE_KEY = '@localsampark_territory_transitions';

let Location;
let AsyncStorage;
let NetInfo;
let resolver;
let monitor;

const RESOLVED = (id = 't-1', pincode = '411001') => ({
  success: true,
  resolved: true,
  method: 'pincode',
  territory: { id, name: `Territory ${id}`, pincode },
});

/**
 * A response shaped like a real one.
 *
 * src/lib/api.js reads `response.headers.get('content-type')` to decide whether
 * to parse JSON. A bare `{ ok, json }` stub throws there, and the throw surfaces
 * as a generic network error — which looks exactly like the offline case these
 * tests are about, so the mock has to carry the header.
 */
function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function serverAnswers(body) {
  global.fetch.mockResolvedValueOnce(jsonResponse(body));
}

beforeEach(() => {
  jest.resetModules();
  global.fetch = jest.fn();

  Location = require('./__mocks__/expoLocation');
  AsyncStorage = require('./__mocks__/asyncStorage');
  NetInfo = require('./__mocks__/netinfo');

  Location.__reset();
  AsyncStorage.__store.clear();
  NetInfo.__setOnline(true);

  resolver = require('../src/services/territoryResolver');
  monitor = require('../src/services/geofenceMonitor');
  resolver.__resetFixCache();
  monitor.__reset();
});

describe('implausible-movement detection', () => {
  test('an ordinary drive is not flagged', () => {
    // 5 km in ten minutes: 30 km/h.
    const previous = { lat: 18.5204, lng: 73.8567, at: 1_000_000 };
    const current = { lat: 18.5654, lng: 73.8567, at: 1_000_000 + 600_000 };

    const result = resolver.implausibleJump(previous, current);
    expect(result.implausible).toBe(false);
  });

  test('a teleport is flagged', () => {
    // Pune to Mumbai, ~120 km, in thirty seconds.
    const previous = { lat: 18.5204, lng: 73.8567, at: 1_000_000 };
    const current = { lat: 19.0760, lng: 72.8777, at: 1_000_000 + 30_000 };

    const result = resolver.implausibleJump(previous, current);
    expect(result.implausible).toBe(true);
    expect(result.kmh).toBeGreaterThan(10000);
  });

  test('no previous fix is not evidence of spoofing', () => {
    // Otherwise every cold start flags itself.
    expect(resolver.implausibleJump(null, { lat: 18.5, lng: 73.8, at: 1 }).implausible).toBe(false);
  });

  test('two fixes close together in time cannot imply a speed', () => {
    // GPS scatter over one second produces absurd speeds from a stationary
    // phone; below the interval floor no conclusion is drawn.
    const previous = { lat: 18.5204, lng: 73.8567, at: 1_000_000 };
    const current = { lat: 18.5209, lng: 73.8567, at: 1_000_000 + 1000 };

    expect(resolver.implausibleJump(previous, current).implausible).toBe(false);
  });

  test('a fix following a teleport is marked mocked even with the flag clear', async () => {
    // The end-to-end path: a spoofer that does not announce itself.
    Location.__state.position = {
      coords: { latitude: 18.5204, longitude: 73.8567, accuracy: 10 },
      mocked: false,
    };
    const first = await resolver.getPosition();
    expect(first.mocked).toBe(false);

    // Let the short-lived fix cache expire so the next call really re-acquires.
    jest.spyOn(Date, 'now').mockReturnValue(first.at + 120_000);

    Location.__state.position = {
      coords: { latitude: 19.0760, longitude: 72.8777, accuracy: 10 },
      mocked: false,
    };

    const second = await resolver.getPosition();
    expect(second.mocked).toBe(true);
    expect(second.mockReason).toBe('implausible_speed');

    Date.now.mockRestore();
  });
});

describe('the offline transition queue', () => {
  test('a transition is queued and sent when online', async () => {
    global.fetch.mockResolvedValue(jsonResponse({ success: true }));

    await monitor.recordTransition({
      from_territory_id: 't-1',
      to_territory_id: 't-2',
      lat: 18.53,
      lng: 73.87,
      at: Date.now(),
    });

    expect(global.fetch).toHaveBeenCalled();
    const queued = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || '[]');
    expect(queued).toHaveLength(0);
  });

  test('a transition survives being recorded with no connection', async () => {
    NetInfo.__setOnline(false);

    await monitor.recordTransition({
      from_territory_id: 't-1',
      to_territory_id: 't-2',
      lat: 18.53,
      lng: 73.87,
      at: Date.now(),
    });

    // Not sent, not lost.
    expect(global.fetch).not.toHaveBeenCalled();
    const queued = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY));
    expect(queued).toHaveLength(1);
    expect(queued[0].to_territory_id).toBe('t-2');
  });

  test('the backlog flushes on reconnection, oldest first', async () => {
    NetInfo.__setOnline(false);

    const base = Date.now() - 3600_000;
    for (let i = 0; i < 3; i++) {
      await monitor.recordTransition({
        from_territory_id: `t-${i}`,
        to_territory_id: `t-${i + 1}`,
        lat: 18.53,
        lng: 73.87,
        at: base + i * 60_000,
      });
    }

    NetInfo.__setOnline(true);
    global.fetch.mockResolvedValue(jsonResponse({ success: true }));

    const result = await monitor.flushQueue();

    expect(result.sent).toBe(3);
    expect(result.remaining).toBe(0);

    // Oldest first, so the server sees the journey in the order it happened.
    const sentBodies = global.fetch.mock.calls.map((c) => JSON.parse(c[1].body));
    expect(sentBodies.map((b) => b.to_territory_id)).toEqual(['t-1', 't-2', 't-3']);
  });

  test('each upload carries the time of the crossing, not of the upload', async () => {
    NetInfo.__setOnline(false);
    const crossedAt = Date.now() - 2 * 3600_000;

    await monitor.recordTransition({
      from_territory_id: 't-1', to_territory_id: 't-2', lat: 18.53, lng: 73.87, at: crossedAt,
    });

    NetInfo.__setOnline(true);
    global.fetch.mockResolvedValue(jsonResponse({ success: true }));
    await monitor.flushQueue();

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    // Without this, every reconnection reports a rider leaving their zone at
    // the moment their signal came back.
    expect(new Date(body.occurred_at).getTime()).toBe(crossedAt);
  });

  test('a failed send stops the drain rather than burning the whole backlog', async () => {
    NetInfo.__setOnline(false);
    for (let i = 0; i < 3; i++) {
      await monitor.recordTransition({
        from_territory_id: `t-${i}`, to_territory_id: `t-${i + 1}`, lat: 18.53, lng: 73.87, at: Date.now() + i,
      });
    }

    NetInfo.__setOnline(true);
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockRejectedValue(new Error('connection lost mid-flush'));

    const result = await monitor.flushQueue();

    expect(result.sent).toBe(1);
    // The two that did not send are still queued, not discarded.
    expect(result.remaining).toBe(2);
  });

  test('the queue is bounded', async () => {
    NetInfo.__setOnline(false);

    for (let i = 0; i < 260; i++) {
      await monitor.recordTransition({
        from_territory_id: 't-a', to_territory_id: `t-${i}`, lat: 18.53, lng: 73.87, at: Date.now() + i,
      });
    }

    const queued = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY));
    // A device with no signal for a day must not become a storage problem.
    expect(queued.length).toBeLessThanOrEqual(200);
    // Oldest dropped, newest kept.
    expect(queued[queued.length - 1].to_territory_id).toBe('t-259');
  });

  test('a corrupt queue does not break recording', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, 'not json at all');
    NetInfo.__setOnline(false);

    await expect(monitor.recordTransition({
      from_territory_id: 't-1', to_territory_id: 't-2', lat: 18.53, lng: 73.87, at: Date.now(),
    })).resolves.not.toThrow();
  });
});

describe('position handling', () => {
  test('a mocked fix never changes the territory', async () => {
    // Attribution and the whole franchise context follow from this, so
    // accepting a mock provider's word would let a user pick their franchise.
    const result = await monitor.handlePosition({
      coords: { latitude: 18.53, longitude: 73.87 },
      mocked: true,
    });

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a crossing into a new territory is recorded once', async () => {
    await monitor.start({ territoryId: 't-1' }).catch(() => {});
    monitor.__reset();

    serverAnswers(RESOLVED('t-2', '411002'));
    global.fetch.mockResolvedValue(jsonResponse({ success: true }));

    const transition = await monitor.handlePosition({
      coords: { latitude: 18.53, longitude: 73.87 },
      mocked: false,
    });

    expect(transition).not.toBeNull();
    expect(transition.to_territory_id).toBe('t-2');
  });

  test('staying in the same territory records nothing', async () => {
    serverAnswers(RESOLVED('t-5'));
    global.fetch.mockResolvedValue(jsonResponse({ success: true }));

    // First position establishes the territory.
    await monitor.handlePosition({ coords: { latitude: 18.53, longitude: 73.87 }, mocked: false });

    resolver.__resetFixCache();
    serverAnswers(RESOLVED('t-5'));

    // Second position, same territory: not a crossing.
    const again = await monitor.handlePosition({ coords: { latitude: 18.531, longitude: 73.871 }, mocked: false });
    expect(again).toBeNull();
  });

  test('a position with no usable coordinates is ignored', async () => {
    expect(await monitor.handlePosition({ coords: { latitude: NaN, longitude: 73.8 } })).toBeNull();
    expect(await monitor.handlePosition({})).toBeNull();
  });
});

describe('battery posture', () => {
  test('watching is distance-driven, not a timer', async () => {
    await monitor.start({ territoryId: 't-1' });

    const options = Location.watchPositionAsync.mock.calls[0][0];
    // distanceInterval means Android delivers a fix when the device has moved,
    // so a phone in a cradle at a junction produces no updates at all.
    expect(options.distanceInterval).toBe(monitor.DISTANCE_INTERVAL_METRES);
    expect(options.accuracy).toBe(Location.Accuracy.Balanced);
  });

  test('does not start without permission, and does not prompt for it', async () => {
    Location.__state.foregroundStatus = 'denied';

    const result = await monitor.start({ territoryId: 't-1' });

    expect(result.started).toBe(false);
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('starting twice does not open two watchers', async () => {
    await monitor.start({ territoryId: 't-1' });
    const second = await monitor.start({ territoryId: 't-1' });

    expect(second.started).toBe(false);
    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
  });
});

describe('no background location', () => {
  test('the app does not request background permission anywhere', () => {
    // Deliberate: ACCESS_BACKGROUND_LOCATION requires a Play Store data-safety
    // declaration and review. Keeping it out is a product decision, and this
    // guards it against being reintroduced by a later convenience.
    const fs = require('fs');
    const path = require('path');

    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'));
    const permissions = manifest.expo?.android?.permissions || [];
    expect(permissions).not.toContain('android.permission.ACCESS_BACKGROUND_LOCATION');

    const source = fs.readFileSync(path.join(__dirname, '../src/services/geofenceMonitor.js'), 'utf8');
    expect(source).not.toMatch(/requestBackgroundPermissionsAsync/);
    expect(source).not.toMatch(/startGeofencingAsync/);
  });
});

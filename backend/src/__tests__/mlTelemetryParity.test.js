/**
 * Telemetry contract parity across the four places it is defined.
 *
 *   1. backend  modules/ml/services/telemetry.service.js   EVENT_WEIGHTS (the baseline)
 *   2. shared   packages/shared/telemetry-core.js          DEFAULTS, VIEWABILITY
 *   3. web      apps/web/src/lib/telemetry.js              EVENTS, VIEWABILITY, batch sizes
 *   4. mobile   apps/mobile/src/lib/telemetry.js           EVENTS, VIEWABILITY, batch sizes
 *
 * The clients duplicate rather than import because apps/mobile cannot resolve
 * modules outside its own tree — Metro is configured without watchFolders — so
 * a shared runtime import would work on web and fail on mobile. The same
 * constraint is why src/theme/index.js duplicates the design tokens, and this
 * mirrors categoryRouterParity.test.js, which holds five copies of the category
 * map in step for the same reason.
 *
 * The reason this needs a test rather than a comment: the whole purpose of
 * these metrics is comparing web against mobile. If one client flushed at 25
 * events and the other at 50, or counted an impression at 50% visibility while
 * the other used 25%, the admin console would show two different measurements
 * under one label — and nothing would fail. The numbers would simply be wrong,
 * and the conclusions drawn from them wrong with them.
 *
 * Client files are read as text: apps/web and apps/mobile have no test runner
 * in this suite and importing their ES modules would need a transform this
 * project does not configure for the backend tests.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const telemetry = require('../modules/ml/services/telemetry.service');
const shared = require(path.join(ROOT, 'packages', 'shared', 'telemetry-core.js'));

const WEB = path.join(ROOT, 'apps', 'web', 'src', 'lib', 'telemetry.js');
const MOBILE = path.join(ROOT, 'apps', 'mobile', 'src', 'lib', 'telemetry.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/** Pulls `const NAME = <number>;` out of a client file. */
function numericConst(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
}

/** Pulls the keys of the frozen EVENTS object out of a client file. */
function eventKeys(source) {
  const block = source.match(/export const EVENTS = Object\.freeze\(\{([\s\S]*?)\}\)/);
  if (!block) return [];
  return Array.from(block[1].matchAll(/(\w+)\s*:/g)).map((m) => m[1]);
}

function viewabilityValue(source, key) {
  const match = source.match(new RegExp(`${key}:\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
}

describe('telemetry client files exist', () => {
  test.each([['web', WEB], ['mobile', MOBILE]])('%s client is present', (_name, file) => {
    expect(fs.existsSync(file)).toBe(true);
  });
});

describe('event vocabulary', () => {
  const webEvents = eventKeys(read(WEB));
  const mobileEvents = eventKeys(read(MOBILE));

  test('web declares every event type the server accepts', () => {
    expect(webEvents.sort()).toEqual([...telemetry.VALID_EVENTS].sort());
  });

  test('mobile declares every event type the server accepts', () => {
    expect(mobileEvents.sort()).toEqual([...telemetry.VALID_EVENTS].sort());
  });

  test('web and mobile declare the same set', () => {
    expect(webEvents.sort()).toEqual(mobileEvents.sort());
  });

  test('a client cannot invent an event the server would reject', () => {
    // An unknown event_type is dropped server-side, silently as far as the
    // client is concerned — the batch still returns 202.
    for (const name of [...webEvents, ...mobileEvents]) {
      expect(telemetry.VALID_EVENTS).toContain(name);
    }
  });
});

describe('batching parity', () => {
  const web = read(WEB);
  const mobile = read(MOBILE);

  test('both clients flush at the same batch size', () => {
    const size = numericConst(web, 'MAX_BATCH_SIZE');
    expect(size).toBe(numericConst(mobile, 'MAX_BATCH_SIZE'));
    expect(size).toBe(shared.DEFAULTS.maxBatchSize);
  });

  test('both clients use the same flush interval', () => {
    const interval = numericConst(web, 'FLUSH_INTERVAL_MS');
    expect(interval).toBe(numericConst(mobile, 'FLUSH_INTERVAL_MS'));
    expect(interval).toBe(shared.DEFAULTS.flushIntervalMs);
  });

  test('both client buffers stay within the server batch cap', () => {
    const webBuffer = numericConst(web, 'MAX_BUFFER_SIZE');
    const mobileBuffer = numericConst(mobile, 'MAX_BUFFER_SIZE');
    expect(webBuffer).toBe(mobileBuffer);
    // A buffer larger than the server's cap would guarantee silent truncation
    // on every full flush.
    expect(webBuffer).toBeLessThanOrEqual(telemetry.MAX_BATCH);
  });
});

describe('viewability parity', () => {
  const web = read(WEB);
  const mobile = read(MOBILE);

  test('both count an impression at the same visibility fraction', () => {
    const webPct = viewabilityValue(web, 'itemVisiblePercentThreshold');
    const mobilePct = viewabilityValue(mobile, 'itemVisiblePercentThreshold');
    expect(webPct).toBe(mobilePct);
    expect(webPct).toBe(shared.VIEWABILITY.itemVisiblePercentThreshold);
  });

  test('both require the same dwell before counting it', () => {
    // The prop names differ because FlatList calls it minimumViewTime while the
    // web side has no framework name for it; the value must still match.
    const webMs = viewabilityValue(web, 'minimumViewTimeMs');
    const mobileMs = viewabilityValue(mobile, 'minimumViewTime');
    expect(webMs).toBe(mobileMs);
    expect(webMs).toBe(shared.VIEWABILITY.minimumViewTimeMs);
  });
});

describe('client discipline', () => {
  const web = read(WEB);
  const mobile = read(MOBILE);

  test('neither client requeues a failed batch', () => {
    // Re-sending a batch double-counts impressions, which are the denominator
    // of every rate metric. Losing one costs a little training data; retrying
    // one corrupts CTR for as long as the window lasts.
    for (const source of [web, mobile]) {
      expect(source).not.toMatch(/buffer\s*=\s*buffer\.concat\(batch\)/);
      expect(source).not.toMatch(/buffer\.push\(\.\.\.batch\)/);
      expect(source).not.toMatch(/buffer\.unshift\(\.\.\.batch\)/);
    }
  });

  test('both clients de-duplicate impressions per surface', () => {
    for (const source of [web, mobile]) {
      expect(source).toMatch(/seenImpressions/);
      expect(source).toMatch(/export function resetImpressions/);
    }
  });

  test('both clients send their platform so web and app can be split apart', () => {
    expect(web).toMatch(/platform:\s*'web'/);
    expect(mobile).toMatch(/Platform\.OS === 'ios' \? 'ios' : 'android'/);
  });

  test('both clients flush when the session is ending', () => {
    // The last batch of a session is the one containing the conversion events.
    expect(web).toMatch(/visibilitychange/);
    expect(mobile).toMatch(/AppState\.addEventListener/);
  });
});

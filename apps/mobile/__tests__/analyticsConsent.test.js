/**
 * P11 on Android: no analytics event is collected or sent unless the user said yes.
 *
 * Telemetry used to run for everyone the server allowed, and stored a session
 * token before any question was asked. These tests run the real telemetry and
 * consent modules (only storage, the network and the React Native runtime are
 * stand-ins) and check what leaves the phone.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (o) => o.android || o.default },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('../src/lib/api', () => ({
  API_BASE: 'http://api.test/api/v1',
  getAuthHeaders: async () => ({}),
}));

let consent;
let telemetry;
let storage;
let sent;

function freshModules() {
  jest.resetModules();
  storage = require('@react-native-async-storage/async-storage');
  storage.__store.clear();
  consent = require('../src/services/analyticsConsent');
  telemetry = require('../src/lib/telemetry');
}

beforeEach(() => {
  freshModules();
  sent = [];
  global.fetch = jest.fn(async (url, init) => {
    if (/\/ml\/events/.test(url)) sent.push(JSON.parse(init.body));
    return { ok: false, json: async () => ({}) };
  });
});

afterEach(() => {
  // The 10 s flush timer would otherwise keep the test process open.
  if (telemetry && telemetry.stopTelemetry) telemetry.stopTelemetry();
  if (telemetry && telemetry.setEnabled) { telemetry.setEnabled(false); }
});

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('[P11.11] a fresh install collects nothing (opt-in, off by default)', () => {
  test('[P11.11] with no answer, track() queues nothing and flush() sends nothing', async () => {
    await telemetry.initTelemetry();
    telemetry.track('CARD_CLICK', 'shop', 42, { surface: 'directory' });
    telemetry.trackImpression('directory', 'shop', 43);
    expect(telemetry.pendingCount()).toBe(0);
    await telemetry.flush();
    expect(sent).toHaveLength(0);
    expect(consent.getConsent()).toBe('unset');
    expect(consent.isAllowed()).toBe(false);
  });

  test('[P11.11] no session token is created or stored before the user agrees', async () => {
    await telemetry.initTelemetry();
    expect(storage.__store.has('@ls_telemetry_session')).toBe(false);
  });

  test('[P11.11] "No thanks" is the same as no answer, and is remembered across restarts', async () => {
    await consent.setConsent(false);
    freshModulesKeepingStorage();
    await telemetry.initTelemetry();
    expect(consent.getConsent()).toBe('denied');
    telemetry.track('CARD_CLICK', 'shop', 1);
    await telemetry.flush();
    expect(sent).toHaveLength(0);
  });

  test('[P11.11] unreadable storage counts as no answer, never as yes', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));
    expect(await consent.loadConsent()).toBe('unset');
    expect(consent.isAllowed()).toBe(false);
  });

  test('[P11.11] a stored value that is not "granted" does not allow analytics', async () => {
    storage.__store.set('@localsampark_analytics_consent', 'true');
    expect(await consent.loadConsent()).toBe('unset');
    expect(consent.isAllowed()).toBe(false);
  });
});

/** A restart: new modules, same storage. */
function freshModulesKeepingStorage() {
  const kept = new Map(storage.__store);
  jest.resetModules();
  storage = require('@react-native-async-storage/async-storage');
  storage.__store.clear();
  kept.forEach((v, k) => storage.__store.set(k, v));
  consent = require('../src/services/analyticsConsent');
  telemetry = require('../src/lib/telemetry');
}

describe('[P11.12] "Allow analytics" turns tracking on', () => {
  test('[P11.12] events are queued and sent once, with a session token created after consent', async () => {
    await telemetry.initTelemetry();
    await consent.setConsent(true);
    await tick();
    expect(storage.__store.has('@ls_telemetry_session')).toBe(true);

    telemetry.track('CARD_CLICK', 'shop', 42, { surface: 'directory', position: 3 });
    expect(telemetry.pendingCount()).toBe(1);
    const result = await telemetry.flush();
    expect(result.sent).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].events[0]).toMatchObject({ event_type: 'CARD_CLICK', item_type: 'shop', item_id: '42', platform: 'android' });
    expect(sent[0].session_token).toBeTruthy();
  });

  test('[P11.12] the choice survives a restart: tracking resumes with no new prompt', async () => {
    await consent.setConsent(true);
    freshModulesKeepingStorage();
    await telemetry.initTelemetry();
    expect(consent.getConsent()).toBe('granted');
    telemetry.track('DETAIL_VIEW', 'shop', 7);
    expect(telemetry.pendingCount()).toBe(1);
  });

  test('[P11.12] the payload carries no name, phone, email or address', async () => {
    await telemetry.initTelemetry();
    await consent.setConsent(true);
    telemetry.track('CARD_CLICK', 'shop', 42, { surface: 'directory' });
    await telemetry.flush();
    const text = JSON.stringify(sent);
    expect(text).not.toMatch(/phone|email|address|full_name|@|\+91/i);
    const allowed = ['event_type', 'item_type', 'item_id', 'local_hour', 'platform', 'surface', 'position', 'is_exploration'];
    for (const event of sent[0].events) expect(Object.keys(event).filter((k) => !allowed.includes(k))).toEqual([]);
  });
});

describe('[P11.13] withdrawing is as easy as agreeing, and takes effect at once', () => {
  test('[P11.13] turning it off discards what was queued, deletes the session token, and sends nothing', async () => {
    await telemetry.initTelemetry();
    await consent.setConsent(true);
    await tick();
    telemetry.track('CARD_CLICK', 'shop', 1);
    telemetry.track('CARD_CLICK', 'shop', 2);
    expect(telemetry.pendingCount()).toBe(2);

    await consent.setConsent(false);
    expect(telemetry.pendingCount()).toBe(0);
    expect(storage.__store.has('@ls_telemetry_session')).toBe(false);
    await telemetry.flush();
    expect(sent).toHaveLength(0);

    telemetry.track('CARD_CLICK', 'shop', 3);
    expect(telemetry.pendingCount()).toBe(0);
  });

  test('[P11.13] one call each way, no other step', async () => {
    await consent.setConsent(true);
    expect(consent.isAllowed()).toBe(true);
    await consent.setConsent(false);
    expect(consent.isAllowed()).toBe(false);
  });

  test('[P11.13] events queued before the switch went off are not sent by a flush that was already due', async () => {
    await telemetry.initTelemetry();
    await consent.setConsent(true);
    telemetry.track('CARD_CLICK', 'shop', 9);
    // The choice changes in storage/cache without the subscriber running first.
    consent.resetConsentForTests();
    const result = await telemetry.flush();
    expect(result.sent).toBe(0);
    expect(sent).toHaveLength(0);
  });
});

describe('[P11.14] the screens that ask and that change the answer exist and are wired up', () => {
  test('[P11.14] the first-run prompt is mounted in the root layout, with both answers equally available', () => {
    expect(read('app/_layout.js')).toMatch(/AnalyticsConsentPrompt/);
    expect(read('app/_layout.js')).toMatch(/<AnalyticsConsentPrompt \/>/);
    const prompt = read('src/components/AnalyticsConsentPrompt.js');
    expect(prompt).toMatch(/setConsent\(true\)/);
    expect(prompt).toMatch(/setConsent\(false\)/);
    // Same style of button for both, one tap each: neither is the hidden option.
    expect(prompt).toMatch(/styles\.button, styles\.decline/);
    expect(prompt).toMatch(/styles\.button, styles\.allow/);
  });

  test('[P11.14] More > Settings opens a real screen that holds the switch', () => {
    expect(read('app/(tabs)/more.js')).toMatch(/route: '\/modules\/settings'/);
    expect(fs.existsSync(path.join(ROOT, 'app/modules/settings/index.js'))).toBe(true);
    const screen = read('app/modules/settings/index.js');
    expect(screen).toMatch(/<Switch/);
    expect(screen).toMatch(/Share usage analytics|t\('share_analytics'\)/);
    expect(screen).toMatch(/setConsent\(on\)/);
    expect(screen).toMatch(/accessibilityLabel=\{t\('share_analytics'\)\}|accessibilityLabel="Share usage analytics"/);
    expect(read('src/i18n/index.js')).toMatch(/share_analytics:\s*'Share usage analytics'/);
  });

  test('[P11.14] telemetry is gated in source: track, flush and the session token', () => {
    const src = read('src/lib/telemetry.js');
    expect(src).toMatch(/if \(!enabled \|\| !isAllowed\(\)\) return/);
    expect(src).toMatch(/if \(!isAllowed\(\)\) \{\s*discardCollected\(\)/);
    expect(src).toMatch(/if \(isAllowed\(\)\) await loadSessionToken\(\)/);
  });
});

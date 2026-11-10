/**
 * app.json and the committed android/ project must agree.
 *
 * This is a bare-workflow project: android/ is committed, so neither Gradle nor
 * EAS Build regenerates it from app.json. Any native field changed only in
 * app.json (a permission, the scheme, an intent filter, the package name) is
 * silently not shipped. expo-doctor's "app config fields that may not be synced"
 * check reports that this can happen; this test checks that it has not.
 *
 * It asks Expo itself what prebuild would generate from app.json and its config
 * plugins (`expo config --type introspect`) and compares that with the committed
 * files, so it needs no hand-maintained list of expected values. Because the
 * config plugins run, it also catches a plugin that does not do what it says
 * (withTrimmedPermissions used to delete the tools:node="remove" markers it
 * should have written; see F-134).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { AndroidConfig } = require('expo/config-plugins');
const { BLOCKED_PERMISSIONS } = require('../plugins/withTrimmedPermissions');

const ROOT = path.resolve(__dirname, '..');
const ANDROID = path.join(ROOT, 'android', 'app');
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).expo;

jest.setTimeout(180000);

let generated; // what `expo prebuild` would write, per Expo
let committed; // android/app/src/main/AndroidManifest.xml

beforeAll(async () => {
  const res = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'expo', 'bin', 'cli'), 'config', '--type', 'introspect', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
  });
  if (res.status !== 0) throw new Error(`expo config --type introspect failed:\n${res.stderr}`);
  generated = JSON.parse(res.stdout)._internal.modResults.android;
  committed = await AndroidConfig.Manifest.readAndroidManifestAsync(path.join(ANDROID, 'src', 'main', 'AndroidManifest.xml'));
});

const attrs = (node) => (node && node.$) || {};
const permissions = (manifest) =>
  (manifest.manifest['uses-permission'] || [])
    .map((p) => `${attrs(p)['android:name']}${attrs(p)['tools:node'] ? ` [${attrs(p)['tools:node']}]` : ''}`)
    .sort();
const mainApplication = (manifest) => AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
const mainActivity = (manifest) => AndroidConfig.Manifest.getMainActivityOrThrow(manifest);
const metaData = (manifest) =>
  (mainApplication(manifest)['meta-data'] || []).map((m) => JSON.stringify(attrs(m))).sort();

// An intent filter reduced to what Android acts on. Prebuild can emit the same
// filter twice (once from app.json, once tagged data-generated); duplicates are
// collapsed because Android treats them as one.
const intentFilters = (manifest) => {
  const names = (list) => (list || []).map((x) => attrs(x)['android:name']).sort();
  const data = (list) => (list || []).map((x) => JSON.stringify(attrs(x))).sort();
  return [...new Set((mainActivity(manifest)['intent-filter'] || []).map((f) => JSON.stringify({
    autoVerify: attrs(f)['android:autoVerify'] === 'true',
    action: names(f.action),
    category: names(f.category),
    data: data(f.data),
  })))].sort();
};

describe('app.json <-> android/ native config sync', () => {
  test('permissions, including tools:node="remove" markers, match what prebuild generates', () => {
    expect(permissions(committed)).toEqual(permissions(generated.manifest));
  });

  test('every N12 blocked permission is removed from the merged manifest', () => {
    const removed = permissions(committed).filter((p) => p.endsWith('[remove]'));
    for (const p of BLOCKED_PERMISSIONS) expect(removed).toContain(`${p} [remove]`);
    // and none of them is also requested
    const requested = permissions(committed).filter((p) => !p.endsWith(']'));
    for (const p of BLOCKED_PERMISSIONS) expect(requested).not.toContain(p);
  });

  test('application attributes and meta-data match', () => {
    expect(attrs(mainApplication(committed))).toEqual(attrs(mainApplication(generated.manifest)));
    expect(metaData(committed)).toEqual(metaData(generated.manifest));
  });

  test('main activity (orientation, launch mode, theme) and its intent filters match', () => {
    expect(attrs(mainActivity(committed))).toEqual(attrs(mainActivity(generated.manifest)));
    expect(intentFilters(committed)).toEqual(intentFilters(generated.manifest));
  });

  test('the custom scheme and https App Links from app.json are registered', () => {
    const filters = intentFilters(committed).map((f) => JSON.parse(f));
    expect(filters.some((f) => f.data.includes(JSON.stringify({ 'android:scheme': appJson.scheme })))).toBe(true);
    for (const host of ['localsampark.in', 'www.localsampark.in']) {
      expect(filters.some((f) => f.autoVerify && f.data.includes(JSON.stringify({ 'android:scheme': 'https', 'android:host': host })))).toBe(true);
    }
  });

  test('no plugin-blocked service is declared', () => {
    const services = (mainApplication(committed).service || []).map((s) => attrs(s)['android:name']);
    expect(services).not.toContain('io.wazo.callkeep.VoiceConnectionService');
  });

  test('app name and splash/theme colours match', () => {
    const resources = (xml) => fs.readFileSync(path.join(ANDROID, 'src', 'main', 'res', 'values', xml), 'utf8');
    for (const s of generated.strings.resources.string || []) {
      expect(resources('strings.xml')).toContain(`name="${attrs(s).name}"`);
      expect(resources('strings.xml')).toContain(`>${s._}</string>`);
    }
    for (const c of generated.colors.resources.color || []) {
      expect(resources('colors.xml')).toMatch(new RegExp(`<color name="${attrs(c).name}">${c._}</color>`, 'i'));
    }
  });

  test('package name and default version come from app.json', () => {
    const gradle = fs.readFileSync(path.join(ANDROID, 'build.gradle'), 'utf8');
    expect(gradle).toContain(`namespace '${appJson.android.package}'`);
    expect(gradle).toContain(`applicationId '${appJson.android.package}'`);
    expect(gradle).toMatch(new RegExp(`findProperty\\('appVersionName'\\) \\?: '${appJson.version.replace(/\./g, '\\.')}'`));
  });
});

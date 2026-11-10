const fs = require('fs');
const path = require('path');

describe('Security Regression Suite — N12: Android Permission Audit & Hardening', () => {
  const rootDir = path.resolve(__dirname, '..');
  const appJsonPath = path.join(rootDir, 'app.json');
  const manifestPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const pluginPath = path.join(rootDir, 'plugins', 'withTrimmedPermissions.js');
  const keystoreExamplePath = path.join(rootDir, 'android', 'keystore.properties.example');
  const proguardPath = path.join(rootDir, 'android', 'app', 'proguard-rules.pro');

  const FORBIDDEN_PERMISSIONS = [
    'RECORD_AUDIO',
    'MODIFY_AUDIO_SETTINGS',
    'SYSTEM_ALERT_WINDOW',
    'BIND_TELECOM_CONNECTION_SERVICE',
    'FOREGROUND_SERVICE_MICROPHONE',
    'READ_MEDIA_IMAGES',
    'READ_EXTERNAL_STORAGE',
    'WRITE_EXTERNAL_STORAGE',
  ];

  const ESSENTIAL_PERMISSIONS = [
    'ACCESS_FINE_LOCATION',
    'ACCESS_COARSE_LOCATION',
    'CAMERA',
    'INTERNET',
  ];

  test('[N12.1] app.json contains strictly authorized permissions and zero restricted permissions', () => {
    expect(fs.existsSync(appJsonPath)).toBe(true);
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const declaredPermissions = (appJson.expo && appJson.expo.android && appJson.expo.android.permissions) || [];

    // Verify essential permissions are declared (either short or fully-qualified)
    for (const perm of ESSENTIAL_PERMISSIONS) {
      const isPresent = declaredPermissions.some(p => p.includes(perm));
      expect(isPresent).toBe(true);
    }

    // Verify restricted/dangerous permissions are absent
    for (const forbidden of FORBIDDEN_PERMISSIONS) {
      const match = declaredPermissions.find(p => p.includes(forbidden));
      expect(match).toBeUndefined();
    }
  });

  test('[N12.2] app.json plugins list includes withTrimmedPermissions and excludes dangerous call/audio plugins', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const plugins = (appJson.expo && appJson.expo.plugins) || [];

    const stringPlugins = plugins.map(p => (typeof p === 'string' ? p : p[0]));
    expect(stringPlugins).toContain('./plugins/withTrimmedPermissions');
    expect(stringPlugins).not.toContain('./plugins/withCallKeepConnectionService');
    expect(stringPlugins).not.toContain('expo-audio');
  });

  test('[N12.3] AndroidManifest.xml requests no forbidden permission and strips each one from merged library manifests', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const entries = manifestContent.match(/<uses-permission\b[^>]*>/g) || [];

    // Libraries (expo-audio, expo-image-picker, react-native-callkeep) declare
    // several of these in their own manifests; the merger copies them into the
    // APK unless the app manifest carries tools:node="remove" for each (F-134).
    // So: no plain request, and a remove marker for every one.
    for (const forbidden of FORBIDDEN_PERMISSIONS) {
      const named = entries.filter((e) => e.includes(`android:name="android.permission.${forbidden}"`));
      expect(named.filter((e) => !/tools:node="remove"/.test(e))).toEqual([]);
      expect(named.some((e) => /tools:node="remove"/.test(e))).toBe(true);
    }

    // Ensure telecom connection service is not registered
    expect(manifestContent).not.toContain('VoiceConnectionService');
    expect(manifestContent).not.toMatch(/<service\b[^>]*BIND_TELECOM_CONNECTION_SERVICE/);
  });

  test('[N12.4] withTrimmedPermissions plugin file exists and exports a valid config plugin', () => {
    expect(fs.existsSync(pluginPath)).toBe(true);
    const plugin = require(pluginPath);
    expect(typeof plugin).toBe('function');
  });

  test('[N16.1] keystore.properties.example template exists for release toolchain guidance', () => {
    expect(fs.existsSync(keystoreExamplePath)).toBe(true);
    const content = fs.readFileSync(keystoreExamplePath, 'utf8');
    expect(content).toContain('MYAPP_UPLOAD_STORE_FILE');
    expect(content).toContain('MYAPP_UPLOAD_KEY_ALIAS');
    expect(content).toContain('MYAPP_UPLOAD_STORE_PASSWORD');
    expect(content).toContain('MYAPP_UPLOAD_KEY_PASSWORD');
  });

  test('[N16.2] proguard-rules.pro configures Hermes, TurboModules, and WebViews for release builds', () => {
    expect(fs.existsSync(proguardPath)).toBe(true);
    const content = fs.readFileSync(proguardPath, 'utf8');
    expect(content).toContain('keep class com.facebook.hermes');
    expect(content).toContain('keepclassmembers class * {');
    expect(content).toContain('@android.webkit.JavascriptInterface <methods>;');
  });
});

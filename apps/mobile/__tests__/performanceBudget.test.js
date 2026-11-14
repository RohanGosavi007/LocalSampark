/**
 * P13 on Android: what the app costs a low-end phone.
 *
 * Budgets are measured size plus headroom (2026-11-14). They stop a
 * regression; raise one on purpose, in a commit that says why.
 *
 *   images in assets/     4.3 MB in total, largest 1.6 MB (favicon.png, splash.png)
 *   Hermes JS bundle      12.8 MB (the last `expo export`)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const MB = 1024 * 1024;

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else yield p;
  }
}

describe('[P13.5] the images the app ships stay small', () => {
  const images = [...files(path.join(ROOT, 'assets'))].filter((p) => /\.(png|jpe?g|webp|gif)$/i.test(p));

  test('[P13.5] there are images to measure', () => {
    expect(images.length).toBeGreaterThan(2);
  });

  test('[P13.5] no single image is over 2 MB', () => {
    const tooBig = images.filter((p) => fs.statSync(p).size > 2 * MB).map((p) => `${path.relative(ROOT, p)} ${(fs.statSync(p).size / MB).toFixed(1)} MB`);
    expect(tooBig).toEqual([]);
  });

  test('[P13.5] all images together stay under 6 MB', () => {
    const total = images.reduce((sum, p) => sum + fs.statSync(p).size, 0);
    expect(total / MB).toBeLessThan(6);
  });
});

describe('[P13.6] long lists are virtualised, so a big catalogue does not render all at once', () => {
  test.each(['app/(tabs)/directory.js', 'app/(tabs)/orders.js', 'app/(tabs)/products.js'])('[P13.6] %s renders its rows with FlashList/FlatList', (rel) => {
    // (the directory wraps FlashList as AnimatedFlashList)
    expect(read(rel)).toMatch(/<(Animated)?(FlashList|FlatList)\b/);
  });

  test('[P13.6] those screens do not map the whole dataset into a ScrollView', () => {
    for (const rel of ['app/(tabs)/directory.js', 'app/(tabs)/orders.js', 'app/(tabs)/products.js']) {
      expect(read(rel)).not.toMatch(/<ScrollView[^>]*>\s*\{\s*(products|orders|shops)\.map\(/);
    }
  });
});

describe('[P13.7] the runtime and build are set up for low-end devices', () => {
  test('[P13.7] Hermes is on (faster start, lower memory than JavaScriptCore)', () => {
    expect(read('android/gradle.properties')).toMatch(/^hermesEnabled=true/m);
  });

  test('[P13.7] release builds target 64-bit and 32-bit ARM, so older low-end phones are not left out', () => {
    expect(read('android/gradle.properties')).toMatch(/^reactNativeArchitectures=.*arm64-v8a.*/m);
    expect(read('android/gradle.properties')).toMatch(/^reactNativeArchitectures=.*armeabi-v7a.*/m);
  });

  test('[P13.7] the production build is an app bundle, so the Play Store sends each phone only its own architecture', () => {
    const eas = JSON.parse(read('eas.json'));
    expect(eas.build.production.android.buildType).toBe('app-bundle');
  });
});

// The last `expo export` (G9 runs one every verification). Absent on a fresh
// checkout, so this one is skipped there rather than passing on nothing.
const exported = fs.existsSync(path.join(ROOT, 'dist/_expo/static/js/android'))
  ? fs.readdirSync(path.join(ROOT, 'dist/_expo/static/js/android')).filter((n) => n.endsWith('.hbc'))
  : [];
(exported.length ? describe : describe.skip)('[P13.8] the exported Hermes bundle', () => {
  test('[P13.8] stays under 16 MB', () => {
    const size = fs.statSync(path.join(ROOT, 'dist/_expo/static/js/android', exported[0])).size;
    expect(size / MB).toBeLessThan(16);
  });
});

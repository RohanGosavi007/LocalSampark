#!/usr/bin/env node
/**
 * Turn a minified release stack trace into file:line.
 *
 * Release bundles are Hermes bytecode, so a crash — whether it comes from the
 * on-screen error boundary, `adb logcat`, or a Sentry report before source-map
 * upload is configured — reads as opaque frames like:
 *
 *     at Image (address at index.android.bundle:1:3125598)
 *
 * Feeding that through the build's source map turns it into:
 *
 *     at Image (/node_modules/expo-image/src/Image.tsx:26:constructor)
 *
 * which is how the expo-image SharedRef crash was located.
 *
 * Usage:
 *   npm run symbolicate -- crash.txt      # from a file
 *   adb logcat | npm run symbolicate      # from stdin
 *
 * IMPORTANT: the source map must come from the same build as the crash. Every
 * release build overwrites it, so copy it aside if you need to keep one.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');

// The composed map (js -> original source). The .packager.map alone does not
// resolve Hermes frame addresses.
const CANDIDATES = [
  'android/app/build/generated/sourcemaps/react/release/index.android.bundle.map',
  'android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map',
];

// An explicit map wins. Release builds overwrite the map in build/, so a stack
// from an older APK will silently resolve to the wrong files against it — the
// frames still look plausible, which makes this a genuinely dangerous default.
// Archived maps live in dist/sourcemaps/<versionCode>-<versionName>.map.
const mapFlagIndex = process.argv.indexOf('--map');
const explicitMap = mapFlagIndex !== -1 ? process.argv[mapFlagIndex + 1] : null;

const mapPath = explicitMap
  ? path.resolve(explicitMap)
  : CANDIDATES.map((p) => path.join(mobileRoot, p)).find((p) => fs.existsSync(p));

if (explicitMap && !fs.existsSync(mapPath)) {
  console.error('[symbolicate] --map not found: ' + mapPath);
  process.exit(1);
}

if (!explicitMap) {
  const archived = path.join(mobileRoot, 'dist', 'sourcemaps');
  if (fs.existsSync(archived)) {
    const maps = fs.readdirSync(archived).filter((f) => f.endsWith('.map'));
    if (maps.length) {
      console.error('[symbolicate] archived maps available - pass --map to target a specific build:');
      for (const m of maps) console.error('    dist/sourcemaps/' + m);
    }
  }
}

if (!mapPath) {
  console.error('No source map found. Looked for:');
  for (const c of CANDIDATES) console.error('  ' + c);
  console.error('\nRun a release build first (npm run build:android:release), or');
  console.error('generate one with: npx expo export:embed --platform android --dev false \\');
  console.error('  --entry-file index.js --bundle-output /tmp/b.js --sourcemap-output /tmp/b.map');
  process.exit(1);
}

const stat = fs.statSync(mapPath);
console.error(`[symbolicate] using ${path.relative(mobileRoot, mapPath)}`);
console.error(`[symbolicate] map built ${stat.mtime.toISOString()} - it must match the crashing build\n`);

// Positional arg = stack file. Skip --map and its value so the two can combine.
const positional = process.argv.slice(2).filter((a, i, arr) => {
  if (a === '--map') return false;
  if (i > 0 && arr[i - 1] === '--map') return false;
  return true;
});
const inputFile = positional[0];
const stack = inputFile ? fs.readFileSync(inputFile, 'utf8') : fs.readFileSync(0, 'utf8');

if (!stack.trim()) {
  console.error('No input. Pass a file path or pipe a stack trace on stdin.');
  process.exit(1);
}

// Resolved and invoked directly rather than through `npx ... shell:true`,
// which mangles this project's paths — they contain spaces, so the shell
// splits the argument at "C:\localsampark".
// The package's "exports" map blocks resolving the bin subpath directly, so go
// via package.json (always exported) and read its declared bin.
let cli;
try {
  const pkgJsonPath = require.resolve('metro-symbolicate/package.json', { paths: [mobileRoot] });
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const binRel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.['metro-symbolicate'];
  cli = path.join(path.dirname(pkgJsonPath), binRel || 'src/index.js');
  if (!fs.existsSync(cli)) throw new Error('bin not found at ' + cli);
} catch (e) {
  console.error('[symbolicate] cannot locate metro-symbolicate:', e.message);
  process.exit(1);
}

try {
  const out = execFileSync(process.execPath, [cli, mapPath], {
    input: stack,
    encoding: 'utf8',
    cwd: mobileRoot,
    maxBuffer: 64 * 1024 * 1024,
  });
  process.stdout.write(out);
} catch (err) {
  console.error('[symbolicate] failed:', err.message);
  process.exit(1);
}

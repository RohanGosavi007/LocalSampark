/**
 * G13 dependency fixes, proved by behaviour rather than by the audit count.
 *
 * Two high advisories reached the mobile app through packages Expo SDK 54
 * pins, and the upstream fix is SDK 58:
 *
 *   decode-uri-component <=0.5.0 (GHSA-vcc3-ghjq-m6fr, GHSA-qr28-fpjm-wq7f),
 *     via query-string 7 via expo-router. Ships in the APK.
 *   image-size 0.6.3-2.0.2 (GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr),
 *     via metro. Runs at bundle time only.
 *
 * package.json overrides move them to query-string 9.5.1 (with
 * decode-uri-component 0.5.1) and image-size 2.1.0. Both are API breaks for
 * their consumers, which patches/ repair:
 *
 *   - query-string 9 is ESM and its entry has only a default export, so
 *     expo-router's __importStar(require("query-string")) would return an
 *     object without stringify(), and every navigation with search params
 *     would throw. The patch accepts either module shape.
 *   - image-size 2 takes bytes only; metro passed a file path. The patch
 *     reads the file first.
 *
 * If a later install drops a patch (patch-package fails loudly, but a version
 * bump can make it silently inapplicable), these tests fail.
 */
const fs = require('fs');
const path = require('path');

// Only validatePathConfig uses it, and appendQueryAndHash does not call that.
jest.mock('@react-navigation/native', () => ({ validatePathConfig: () => {} }));

const MOBILE = path.resolve(__dirname, '..');
const pkgVersion = (rel) =>
  JSON.parse(fs.readFileSync(path.join(MOBILE, 'node_modules', rel, 'package.json'), 'utf8')).version;

// Parsed as major.minor.patch; enough for the plain release versions involved.
const parse = (v) => v.split('-')[0].split('.').map(Number);
const lte = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return true;
};

describe('installed versions are outside the advisory ranges', () => {
  test('decode-uri-component > 0.5.0', () => {
    expect(lte(pkgVersion('decode-uri-component'), '0.5.0')).toBe(false);
  });

  test('query-string > 9.4.1', () => {
    expect(lte(pkgVersion('query-string'), '9.4.1')).toBe(false);
  });

  test('image-size > 2.0.2, for both metro copies', () => {
    expect(lte(pkgVersion('image-size'), '2.0.2')).toBe(false);
    const nested = path.join(MOBILE, 'node_modules/@expo/metro/node_modules/image-size');
    if (fs.existsSync(nested)) {
      expect(lte(pkgVersion('@expo/metro/node_modules/image-size'), '2.0.2')).toBe(false);
    }
  });
});

describe('expo-router builds query strings exactly as it did on query-string 7', () => {
  // Recorded from query-string@7.1.3 stringify(params, { sort: false }), the
  // call expo-router makes. Key order, null/undefined handling, arrays and
  // strict RFC 3986 encoding all have to survive the upgrade.
  const BASELINE = [
    [{ q: 'test x' }, 'q=test%20x'],
    [{ category: 'food & drink', page: 2 }, 'category=food%20%26%20drink&page=2'],
    [{ tags: ['a', 'b'] }, 'tags=a&tags=b'],
    [{ name: 'मराठी दुकान' }, 'name=%E0%A4%AE%E0%A4%B0%E0%A4%BE%E0%A4%A0%E0%A5%80%20%E0%A4%A6%E0%A5%81%E0%A4%95%E0%A4%BE%E0%A4%A8'],
    [{ empty: '', nul: null, undef: undefined }, 'empty=&nul'],
    [{ z: '1', a: '2', m: '3' }, 'z=1&a=2&m=3'],
    [{ special: "!'()*" }, 'special=%21%27%28%29%2A'],
    [{ bool: true, zero: 0 }, 'bool=true&zero=0'],
    [{ path: 'a/b?c=d#e' }, 'path=a%2Fb%3Fc%3Dd%23e'],
    [{ pct: '100%' }, 'pct=100%25'],
  ];

  const forks = require('expo-router/build/fork/getPathFromState-forks');

  test.each(BASELINE)('%j', (params, query) => {
    expect(forks.appendQueryAndHash('/shops', { ...params })).toBe(`/shops?${query}`);
  });

  test('a hash is still appended after the query', () => {
    expect(forks.appendQueryAndHash('/shops', { q: 'x', '#': 'top' })).toBe('/shops?q=x#top');
  });

  test('no params, no question mark', () => {
    expect(forks.appendQueryAndHash('/shops', {})).toBe('/shops');
  });

  test('the full getPathFromState module loads with the patched import', () => {
    expect(typeof require('expo-router/build/fork/getPathFromState').getPathFromState).toBe('function');
  });

  test('without the patch the import would be broken (guards the reason for it)', () => {
    // What __importStar hands back for an ES module after Babel's CJS
    // transform: the namespace, whose only member is default.
    const ns = require('query-string');
    expect(typeof ns.stringify).toBe('undefined');
    expect(typeof ns.default.stringify).toBe('function');
  });
});

describe('metro still measures image assets with image-size 2', () => {
  // Width and height read straight from the PNG IHDR chunk, independently of
  // image-size, so a parser regression cannot agree with itself.
  const ihdr = (file) => {
    const b = fs.readFileSync(file);
    expect(b.toString('latin1', 12, 16)).toBe('IHDR');
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  };

  const pngs = fs.readdirSync(path.join(MOBILE, 'assets'))
    .filter((f) => f.endsWith('.png'))
    .map((f) => path.join(MOBILE, 'assets', f));

  const metros = [
    'node_modules/@expo/metro/node_modules/metro/src/Assets.js', // used by expo export:embed (the release build)
    'node_modules/metro/src/Assets.js', // used by react-native-community/cli
  ].filter((rel) => fs.existsSync(path.join(MOBILE, rel)));

  test('there is something to measure', () => {
    expect(pngs.length).toBeGreaterThan(0);
    expect(metros.length).toBeGreaterThan(0);
  });

  test.each(metros)('%s getAssetData reports the real dimensions', async (rel) => {
    const { getAssetData } = require(path.join(MOBILE, rel));
    for (const file of pngs) {
      const data = await getAssetData(file, path.relative(MOBILE, file), [], 'android', '/assets');
      expect({ file, width: data.width, height: data.height }).toEqual({ file, ...ihdr(file) });
    }
  });
});

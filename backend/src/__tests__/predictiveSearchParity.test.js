/**
 * Predictive search parity between web and mobile.
 *
 * The two clients duplicate this component rather than share it, for the same
 * reason the telemetry clients do: Metro is configured without watchFolders, so
 * apps/mobile cannot resolve modules outside its own tree. Duplication is the
 * only option available, which makes drift the thing to guard against.
 *
 * It matters here because both surfaces report suggestion clicks against the
 * same telemetry surface. If one debounced at 180ms and the other at 600, or
 * one required two characters and the other four, the admin console would be
 * comparing two different behaviours under one label and nothing would fail.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const WEB = path.join(ROOT, 'apps', 'web', 'src', 'components', 'PredictiveSearchBar.js');
const MOBILE = path.join(ROOT, 'apps', 'mobile', 'src', 'components', 'PredictiveSearchBar.js');

const read = (f) => fs.readFileSync(f, 'utf8');

function numericConst(source, name) {
  const m = source.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
}

describe('both clients have a predictive search bar', () => {
  test.each([['web', WEB], ['mobile', MOBILE]])('%s component exists', (_n, file) => {
    expect(fs.existsSync(file)).toBe(true);
  });
});

describe('behaviour parity', () => {
  const web = read(WEB);
  const mobile = read(MOBILE);

  test('same debounce', () => {
    const w = numericConst(web, 'DEBOUNCE_MS');
    expect(w).toBe(numericConst(mobile, 'DEBOUNCE_MS'));
    expect(w).toBeGreaterThan(0);
  });

  test('same minimum query length', () => {
    const w = numericConst(web, 'MIN_QUERY');
    expect(w).toBe(numericConst(mobile, 'MIN_QUERY'));
    // The server refuses anything shorter than two characters, so a client
    // asking below that only ever gets an empty list back.
    expect(w).toBeGreaterThanOrEqual(2);
  });

  test('both call the suggest endpoint', () => {
    for (const source of [web, mobile]) {
      expect(source).toMatch(/\/ml\/search\/suggest/);
    }
  });

  test('both request the same number of suggestions', () => {
    const limitOf = (s) => (s.match(/suggest\?q=\$\{encodeURIComponent\(q\)\}&limit=(\d+)/) || [])[1];
    expect(limitOf(web)).toBe(limitOf(mobile));
  });

  test('both abort an in-flight request when the query changes', () => {
    // Without this, a slow response for "gro" can land after the one for
    // "grocery" and replace a correct list with a stale one.
    for (const source of [web, mobile]) {
      expect(source).toMatch(/AbortController/);
      expect(source).toMatch(/abortRef\.current\.abort\(\)/);
    }
  });

  test('both attribute a selection to the suggestion surface', () => {
    // Not the feed. Crediting autocomplete clicks to the directory would
    // inflate the feed's CTR and hide how much traffic suggestions carry.
    for (const source of [web, mobile]) {
      expect(source).toMatch(/trackClick\('search_suggest', 'shop'/);
    }
  });

  test('neither breaks the search box when suggestions fail', () => {
    // Suggestions are an accelerator; a failed lookup must close the list and
    // nothing more.
    for (const source of [web, mobile]) {
      expect(source).toMatch(/setSuggestions\(\[\]\)/);
    }
  });
});

/**
 * P12 on Android: translations and screen-reader names.
 *
 * i18n-js answers a missing key with the text `[missing "en.nav_retail"
 * translation]`, so an undefined key is not an error: it is what a seller
 * reads on their dashboard tab. The shop dashboard asked for 11 keys that no
 * dictionary had, and two of them (Fleet, Analytics) are shown to every seller.
 *
 * A tappable element with no text and no accessibilityLabel (an arrow, a heart)
 * is announced as "button" and nothing else.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const NL = String.fromCharCode(10);
const BACKSLASH = String.fromCharCode(92);

// ─── translations ───────────────────────────────────────────────────────────

/** The dictionary object in src/i18n/index.js, evaluated without its imports. */
function dictionaries() {
  const src = read('src/i18n/index.js');
  const start = src.indexOf('const translations = ');
  const end = src.indexOf('const i18n = new I18n');
  // eslint-disable-next-line no-new-func
  return new Function(`${src.slice(start, end).replace('const translations = ', 'return ')}`)();
}

function* jsFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'android', 'dist', '__tests__', '.expo'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* jsFiles(p);
    else if (e.name.endsWith('.js')) yield p;
  }
}

describe('[P12.9] translations: Android shows no missing-key text', () => {
  const t = dictionaries();

  test('[P12.9] Hindi and Marathi have every English key, none empty, none extra', () => {
    const english = Object.keys(t.en);
    expect(english.length).toBeGreaterThan(20);
    for (const lang of ['hi', 'mr']) {
      const keys = Object.keys(t[lang]);
      expect(english.filter((k) => !(k in t[lang]))).toEqual([]);
      expect(keys.filter((k) => !(k in t.en))).toEqual([]);
      expect(keys.filter((k) => !String(t[lang][k]).trim())).toEqual([]);
    }
  });

  test('[P12.9] every key the app asks for is defined, so no "[missing …]" text is ever shown', () => {
    const asked = new Map();
    for (const dir of ['app', 'src']) {
      for (const file of jsFiles(path.join(ROOT, dir))) {
        const text = fs.readFileSync(file, 'utf8');
        for (const m of text.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]\s*[,)]/g)) {
          if (!asked.has(m[1])) asked.set(m[1], path.relative(ROOT, file));
        }
      }
    }
    expect(asked.size).toBeGreaterThan(5);
    const unknown = [...asked].filter(([k]) => !(k in t.en)).map(([k, f]) => `${k} (${f})`);
    expect(unknown).toEqual([]);
  });

  test('[P12.9] Hindi and Marathi are really translated, in Devanagari', () => {
    for (const lang of ['hi', 'mr']) {
      for (const [key, value] of Object.entries(t[lang])) {
        expect(value).not.toBe(t.en[key]);
        expect(value).toMatch(/[ऀ-ॿ]/);
      }
    }
  });
});

// ─── screen-reader names ────────────────────────────────────────────────────

const TAGS = ['TouchableOpacity', 'Pressable', 'TouchableHighlight', 'TouchableWithoutFeedback'];

/** Index of the '>' closing an opening tag, honouring {} nesting and quoted strings (onPress={() => …} contains '>'). */
function openingEnd(s, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < s.length; i += 1) {
    const c = s[i];
    if (quote) {
      if (c === quote && s[i - 1] !== BACKSLASH) quote = null;
      continue;
    }
    if (depth === 0 && (c === '"' || c === "'")) { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0 && s[i - 1] !== '=') return i;
  }
  return -1;
}

/** Tappable elements with neither visible text nor an accessibilityLabel. */
function unnamedTouchables(rel) {
  const s = read(rel);
  const found = [];
  for (const tag of TAGS) {
    let idx = 0;
    while ((idx = s.indexOf(`<${tag}`, idx)) >= 0) {
      const end = openingEnd(s, idx + tag.length + 1);
      if (end < 0) break;
      const attrs = s.slice(idx, end);
      if (attrs.trimEnd().endsWith('/')) { idx = end; continue; }
      const close = s.indexOf(`</${tag}>`, end);
      const body = close < 0 ? '' : s.slice(end + 1, close);
      const named = /accessibilityLabel|aria-label/.test(attrs);
      const hasText = /<Text\b|<Button\b|\{\s*[a-zA-Z_.]*(label|title|text|name)[a-zA-Z_.]*\s*\}/i.test(body);
      if (!named && !hasText) found.push(`${rel}:${s.slice(0, idx).split(NL).length}`);
      idx = end;
    }
  }
  return found;
}

// The screens a customer or a seller uses first.
const SCREENS = [
  'app/(tabs)/index.js', 'app/(tabs)/directory.js', 'app/(tabs)/orders.js', 'app/(tabs)/products.js',
  'app/(tabs)/more.js', 'app/(tabs)/profile.js', 'app/(tabs)/reviews.js', 'app/login.js',
  'app/modules/checkout/index.js', 'app/modules/shops/index.js', 'app/modules/zone-selector/index.js',
  'app/modules/merchant/ShopDashboard.js', 'app/modules/merchant/coupons.js', 'app/modules/merchant/kyc.js',
  'app/modules/merchant/variants.js', 'app/modules/merchant/earnings.js',
  'src/components/ReviewReply.js', 'src/components/WaitlistPanel.js', 'src/components/PredictiveSearchBar.js',
];

describe('[P12.10] screen readers: every tappable element has a name', () => {
  test.each(SCREENS)('[P12.10] %s has no icon-only button without an accessibilityLabel', (rel) => {
    expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
    expect(unnamedTouchables(rel)).toEqual([]);
  });

  test('[P12.10] the scanner finds an unnamed button (so a clean result means something)', () => {
    const sample = '<TouchableOpacity onPress={() => go()}><Ionicons name="arrow-back" /></TouchableOpacity>';
    const named = '<TouchableOpacity onPress={() => go()} accessibilityLabel="Go back"><Ionicons name="arrow-back" /></TouchableOpacity>';
    const check = (text) => {
      const end = openingEnd(text, '<TouchableOpacity'.length);
      const attrs = text.slice(0, end);
      const body = text.slice(end + 1, text.indexOf('</TouchableOpacity>'));
      return !/accessibilityLabel/.test(attrs) && !/<Text\b/.test(body);
    };
    expect(check(sample)).toBe(true);
    expect(check(named)).toBe(false);
  });
});

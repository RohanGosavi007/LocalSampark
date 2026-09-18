/**
 * Theme token tests.
 *
 * The Android app had no theme system at all before this: no context, no
 * appearance setting, and one palette in design-tokens.js with nothing to
 * switch to. Three separate palette files were live at once and which brand a
 * screen got depended on which of the three it happened to import.
 *
 * These tests pin the properties that made that state possible, so it cannot
 * quietly return:
 *
 *   - the two modes expose exactly the same keys, so a screen written against
 *     one works in the other;
 *   - the three legacy palette modules agree on the brand;
 *   - dark is actually darker than light, and ink actually inverts;
 *   - text colours clear WCAG AA against the surfaces they sit on.
 *
 * Pure token logic, so it runs in the existing node-environment Jest setup
 * without a device or a native runtime.
 */

const tokensModule = require('../src/theme/design-tokens');
const tokens = tokensModule.default || tokensModule;

const APP_THEME = require('../app/theme');
const LEGACY_THEME = require('../src/theme/theme');

// ─── Contrast helpers (WCAG 2.1 relative luminance) ─────────────────────────

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('design tokens', () => {
  test('exposes both light and dark palettes', () => {
    expect(Object.keys(tokens.theme).sort()).toEqual(['dark', 'light']);
  });

  test('light and dark expose identical key sets', () => {
    // The whole point of generating both from one key set: a surface that
    // exists in one mode is guaranteed to exist in the other, so adding a token
    // to only one theme is a test failure rather than a silent gap.
    const light = Object.keys(tokens.theme.light).sort();
    const dark = Object.keys(tokens.theme.dark).sort();
    expect(dark).toEqual(light);
    expect(light.length).toBeGreaterThan(20);
  });

  test('publishes a 44pt minimum touch target', () => {
    // The audit measured 272 of 716 explicit height declarations under 44.
    expect(tokens.touch.min).toBe(44);
    expect(tokens.touch.comfortable).toBeGreaterThanOrEqual(tokens.touch.min);
  });
});

describe('dark palette', () => {
  const { light, dark } = tokens.theme;

  test('is genuinely darker than light, at every level of the ramp', () => {
    for (const key of ['ground', 'groundAlt', 'sunken', 'surface1', 'surface2', 'surface3', 'surface4']) {
      expect(luminance(dark[key])).toBeLessThan(luminance(light[key]));
    }
  });

  test('is a slate ramp, not a near-black', () => {
    // #060b18, the previous ground, sat at ~1% luminance, which left nowhere to
    // go below the base surface — a sunken well had to be faked with a border.
    expect(luminance(dark.ground)).toBeGreaterThan(0.005);
    expect(luminance(dark.ground)).toBeLessThan(0.05);
  });

  test('gives six distinct elevation steps', () => {
    const ramp = [dark.sunken, dark.ground, dark.groundAlt, dark.surface1, dark.surface2, dark.surface3, dark.surface4];
    expect(new Set(ramp).size).toBe(ramp.length);

    // And they must ascend, or "raised" would render below "card".
    const lums = ramp.map(luminance);
    for (let i = 1; i < lums.length; i += 1) {
      expect(lums[i]).toBeGreaterThan(lums[i - 1]);
    }
  });

  test('ink inverts between modes', () => {
    expect(luminance(dark.text)).toBeGreaterThan(0.5);
    expect(luminance(light.text)).toBeLessThan(0.5);
  });

  test('borders and glows stay on the emerald brand', () => {
    // Dark had drifted onto indigo rgba(99,102,241,...) for every card border
    // and every glow — a hue with no counterpart in the light brand, which is
    // the main reason the two themes read as different products.
    expect(dark.borderAccent).toContain('0, 200, 128');
    expect(dark.glow).toContain('0, 200, 128');
    expect(dark.borderAccent).not.toContain('99, 102, 241');
  });
});

describe('text contrast (WCAG AA)', () => {
  const { light, dark } = tokens.theme;

  const cases = [
    ['light body on ground', light.text, light.ground],
    ['light body on card', light.text, light.surface1],
    ['light muted on ground', light.textMuted, light.ground],
    ['light muted on card', light.textMuted, light.surface1],
    ['light accent text on card', light.accentText, light.surface1],
    ['dark body on ground', dark.text, dark.ground],
    ['dark body on card', dark.text, dark.surface1],
    ['dark muted on ground', dark.textMuted, dark.ground],
    ['dark muted on card', dark.textMuted, dark.surface1],
    ['dark accent text on card', dark.accentText, dark.surface1],
  ];

  test.each(cases)('%s clears 4.5:1', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  test('a label on the accent fill clears 4.5:1 in both modes', () => {
    // Button labels are 16px, which is not "large text", so the 3:1 UI floor
    // does not apply to them — 4.5:1 does. White on the full-chroma emerald
    // #00C880 is 2.2:1 and on #00A468 is 3.2:1; both were rejected for this
    // reason. Light uses a deeper #008453 fill, dark keeps the bright emerald
    // and puts near-black ink on it.
    expect(contrast(light.onAccent, light.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark.onAccent, dark.accent)).toBeGreaterThanOrEqual(4.5);
  });

  test.each([
    ['light success', tokens.theme.light.success, tokens.theme.light.surface1],
    ['light warning', tokens.theme.light.warning, tokens.theme.light.surface1],
    ['light danger', tokens.theme.light.danger, tokens.theme.light.surface1],
    ['light info', tokens.theme.light.info, tokens.theme.light.surface1],
    ['dark success', tokens.theme.dark.success, tokens.theme.dark.surface1],
    ['dark warning', tokens.theme.dark.warning, tokens.theme.dark.surface1],
    ['dark danger', tokens.theme.dark.danger, tokens.theme.dark.surface1],
    ['dark info', tokens.theme.dark.info, tokens.theme.dark.surface1],
  ])('%s reads as text on a card', (_label, fg, bg) => {
    // These carry words — "Payment failed", "Delivered" — not just icons, so
    // they are held to the text threshold rather than the UI one.
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  test('textSubtle clears the 3:1 non-text floor', () => {
    // Deliberately below 4.5. It is for placeholders, timestamps and disabled
    // captions — never for content a user has to read to use the screen. Pinned
    // so it cannot drift down into illegibility.
    expect(contrast(light.textSubtle, light.surface1)).toBeGreaterThanOrEqual(3);
    expect(contrast(dark.textSubtle, dark.surface1)).toBeGreaterThanOrEqual(3);
  });
});

describe('palette convergence', () => {
  test('the three legacy theme modules agree on the brand', () => {
    // app/theme.js carried #F05A28 (Swiggy orange) while src/theme/theme.js
    // carried #00C880 (emerald). Four screens got one brand and eight got the
    // other, purely by import path.
    expect(APP_THEME.COLORS.primary).toBe(tokens.brand.primary);
    expect(LEGACY_THEME.COLORS.primary).toBe(tokens.brand.primary);
    expect(APP_THEME.COLORS.primary).toBe(LEGACY_THEME.COLORS.primary);
  });

  test('legacy modules agree on surfaces and ink', () => {
    expect(APP_THEME.COLORS.background).toBe(tokens.theme.light.ground);
    expect(LEGACY_THEME.COLORS.background).toBe(tokens.theme.light.ground);
    expect(APP_THEME.COLORS.text).toBe(LEGACY_THEME.COLORS.text);
  });

  test('legacy dark surfaces come off the shared ramp', () => {
    expect(APP_THEME.DARK_COLORS.background).toBe(tokens.theme.dark.ground);
    expect(LEGACY_THEME.DARK_COLORS.background).toBe(tokens.theme.dark.ground);
    expect(APP_THEME.DARK_COLORS.background).not.toBe('#060b18');
  });

  test('the legacy type scale has a 12pt floor', () => {
    // FONT_SIZES used to start at 10 and put body copy at 14. The audit found
    // 1,296 uses of fontSize 12 and 31 distinct sizes overall.
    const sizes = Object.values(APP_THEME.FONT_SIZES);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
    expect(APP_THEME.FONT_SIZES.base).toBeGreaterThanOrEqual(16);
  });
});

describe('buildTheme', () => {
  // Required lazily: src/theme/index.js imports react-native for Platform,
  // which the node test environment does not provide at module scope.
  let buildTheme;
  beforeAll(() => {
    jest.doMock('react-native', () => ({
      Platform: { select: (o) => o.android || o.default },
      StyleSheet: { create: (s) => s },
    }));
    // eslint-disable-next-line global-require
    buildTheme = require('../src/theme').buildTheme;
  });

  test('returns matching shapes for both modes', () => {
    const l = buildTheme('light');
    const d = buildTheme('dark');
    expect(Object.keys(d.colors).sort()).toEqual(Object.keys(l.colors).sort());
    expect(l.isDark).toBe(false);
    expect(d.isDark).toBe(true);
  });

  test('sets a status bar style that contrasts with its own ground', () => {
    // Getting this wrong is the most visible theming bug on Android: dark
    // status-bar icons over a dark header are simply unreadable.
    expect(buildTheme('dark').statusBarStyle).toBe('light');
    expect(buildTheme('light').statusBarStyle).toBe('dark');
  });

  test('falls back to light for an unknown mode rather than throwing', () => {
    expect(buildTheme('sepia').colors.ground).toBe(tokens.theme.light.ground);
  });
});

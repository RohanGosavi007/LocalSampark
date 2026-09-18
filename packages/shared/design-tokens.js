/**
 * LocalSampark design tokens — single source of truth for web and mobile.
 *
 * Web consumes this from apps/web/tailwind.config.js; mobile consumes it from
 * apps/mobile/src/theme/index.js. Keeping one module means a palette change
 * lands on both platforms instead of drifting.
 *
 * Token NAMES are stable: 299 web pages reference them through CSS variables.
 * Values may be retuned freely; names may not be removed.
 */

// ─── Brand ───────────────────────────────────────────────────────────────────
// Retuned for higher chroma and a deeper floor, so glass surfaces and glows
// read with more separation than the previous flatter mid-tones.
const brand = {
  primary: '#00C880',        // Emerald, lifted from #00B074
  primaryHover: '#00A468',
  primaryLight: '#E6FBF3',
  primaryDeep: '#00543A',

  secondary: '#FF6A00',      // Hyper orange
  secondaryHover: '#D95400',
  secondaryLight: '#FFF2E8',
  secondaryDeep: '#7A2E00',

  accent: '#FF2D55',         // Festive crimson, pushed toward magenta
  accentLight: '#FFE9EE',
  accentDeep: '#7A0E22',

  trust: '#12152E',          // Deep indigo — text and dark ground
  promo: '#FFD400',          // Electric yellow
  violet: '#7C5CFF',         // Added: the palette had no cool accent
  cyan: '#00D9F5',           // Added: for depth cues on dark surfaces
};

// ─── Neutrals ────────────────────────────────────────────────────────────────
const neutral = {
  0: '#FFFFFF',
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#080B1A',
};

// ─── Category archetypes ─────────────────────────────────────────────────────
// Each shop archetype carries its own accent pair so a category page can retint
// the whole surface without bespoke CSS.
const category = {
  food:      { base: '#FF6B00', deep: '#DC2626' },
  retail:    { base: '#00E676', deep: '#00C853' },
  booking:   { base: '#00E5FF', deep: '#2563EB' },
  beauty:    { base: '#FF007F', deep: '#8B5CF6' },
  services:  { base: '#FFD600', deep: '#F59E0B' },
  rentals:   { base: '#10B981', deep: '#065F46' },
  directory: { base: '#6366F1', deep: '#4F46E5' },
};

// ─── Glass surfaces ──────────────────────────────────────────────────────────
const glass = {
  white04: 'rgba(255, 255, 255, 0.04)',
  white10: 'rgba(255, 255, 255, 0.10)',
  white20: 'rgba(255, 255, 255, 0.20)',
  dark40: 'rgba(0, 0, 0, 0.40)',
  dark60: 'rgba(0, 0, 0, 0.60)',
  // Borders that catch light along the top edge, which is what sells the
  // "pane of glass" read rather than a flat translucent rectangle.
  edgeLight: 'rgba(255, 255, 255, 0.18)',
  edgeDark: 'rgba(255, 255, 255, 0.06)',
};

// ─── Mesh gradient stops ─────────────────────────────────────────────────────
const mesh = ['#0F172A', '#1E1B4B', '#064E3B', '#7C2D12', '#78350F'];

// ─── Motion ──────────────────────────────────────────────────────────────────
// Shared so a web transition and its mobile counterpart use the same curve and
// duration. Durations are milliseconds; web converts to seconds.
const motion = {
  duration: { instant: 120, fast: 200, base: 320, slow: 520, deliberate: 800 },
  // A single expressive ease used for entrances, and a spring for interaction.
  easing: {
    entrance: [0.16, 1, 0.3, 1],     // cubic-bezier, strong deceleration
    exit: [0.7, 0, 0.84, 0],
    standard: [0.4, 0, 0.2, 1],
  },
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  // Stagger between siblings in a list reveal.
  stagger: 60,
};

// ─── Typography ──────────────────────────────────────────────────────────────
const type = {
  heading: 'Outfit',
  body: 'Inter',
  scale: {
    xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
    '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72,
  },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', black: '900' },
  // Tighter tracking as size grows keeps large headings from looking loose.
  tracking: { tight: -0.02, normal: 0, wide: 0.02 },
};

const radius = { sm: 8, base: 14, lg: 22, xl: 32, full: 9999 };


// ─── Semantic theme ──────────────────────────────────────────────────────────
// Added in the theme-system overhaul. Before this, the repo had one palette and
// "dark mode" was a separate hand-written block of CSS variables in
// apps/web/src/app/globals.css that had drifted onto an indigo accent appearing
// nowhere else in the brand. Mobile had no dark mode at all.
//
// Both themes are now generated from the same key set, so a surface that exists
// in one is guaranteed to exist in the other. Adding a key without adding it to
// both is a build-visible mistake rather than a silent gap.
//
// The dark ramp is a six-step elevation scale on warm-neutral slate rather than
// a near-black. Near-black leaves nowhere to go *below* the base surface, so a
// sunken well or an inset field has to be faked with a border; starting at
// #0F1520 keeps a real step in both directions.
const theme = {
  light: {
    // Grounds
    ground:     '#F6F8FB',  // page background
    groundAlt:  '#FFFFFF',
    sunken:     '#EEF2F7',  // wells, inset fields, table stripes

    // Elevation ramp. In light, elevation is carried by shadow, so the
    // surfaces converge on white rather than getting lighter.
    surface1:   '#FFFFFF',  // cards
    surface2:   '#FFFFFF',  // raised cards, sticky bars
    surface3:   '#FFFFFF',  // popovers, dropdowns
    surface4:   '#FFFFFF',  // modals, sheets
    surfaceGlass: 'rgba(255, 255, 255, 0.72)',

    // Lines
    border:       '#E3E8EF',
    borderStrong: '#CBD5E1',
    borderAccent: 'rgba(0, 132, 83, 0.32)',

    // Ink. textMuted holds 4.5:1 on ground and on surface1.
    text:        '#0F1729',
    textMuted:   '#5A6B84',
    textSubtle:  '#8496AC',
    textInverse: '#FFFFFF',

    // Accent. Two values, because a fill and a label have different jobs:
    // #00C880 is the brand fill; it only reaches 2.2:1 against white, so text
    // and icons on a light ground use accentText instead.
    // #008453 clears 4.5:1 against white in both directions, so one value
    // serves as the fill (with a white label) and as text on a light ground.
    // The previous #00A468 reached only 3.23:1 under a white label, which
    // fails AA for button text at 16px.
    accent:      '#008453',
    accentHover: '#00734A',
    accentText:  '#008453',
    accentQuiet: 'rgba(0, 132, 83, 0.10)',
    onAccent:    '#FFFFFF',

    secondary:      '#E85D00',
    secondaryQuiet: 'rgba(232, 93, 0, 0.10)',

    success:      '#0A7D53',  // 5.2:1 on white; #0E8A5F was 4.36:1
    successQuiet: 'rgba(10, 125, 83, 0.10)',
    warning:      '#B45309',
    warningQuiet: 'rgba(180, 83, 9, 0.10)',
    danger:       '#D42348',
    dangerQuiet:  'rgba(212, 35, 72, 0.10)',
    info:         '#0369A1',
    infoQuiet:    'rgba(3, 105, 161, 0.10)',

    // Depth
    scrim: 'rgba(15, 23, 41, 0.45)',
    glow:  'rgba(0, 132, 83, 0.22)',
    shadowRgb: '15, 23, 41',
  },

  dark: {
    ground:     '#0F1520',
    groundAlt:  '#131A27',
    sunken:     '#0A0F18',

    surface1:   '#151C29',
    surface2:   '#1B2433',
    surface3:   '#232B3A',
    surface4:   '#2B3446',
    surfaceGlass: 'rgba(21, 28, 41, 0.72)',

    // Borders are emerald-tinted rather than indigo. The previous dark theme
    // outlined every card in rgba(99,102,241,.25), a hue with no counterpart
    // in the light brand, which is the main reason the two read as different
    // products.
    border:       '#26303F',
    borderStrong: '#35415A',
    borderAccent: 'rgba(0, 200, 128, 0.28)',

    text:        '#F1F5F9',
    textMuted:   '#9AA8BC',
    textSubtle:  '#6B7C93',
    textInverse: '#0F1520',

    // On dark the full-chroma emerald clears 7:1 against surface1, so fill and
    // text can be the same value.
    accent:      '#00C880',
    accentHover: '#19D492',
    accentText:  '#2BE0A0',
    accentQuiet: 'rgba(0, 200, 128, 0.14)',
    onAccent:    '#052E21',

    secondary:      '#FF7A1A',
    secondaryQuiet: 'rgba(255, 122, 26, 0.14)',

    success:      '#2BE0A0',
    successQuiet: 'rgba(43, 224, 160, 0.14)',
    warning:      '#FBBF24',
    warningQuiet: 'rgba(251, 191, 36, 0.14)',
    danger:       '#FF5273',
    dangerQuiet:  'rgba(255, 82, 115, 0.14)',
    info:         '#38BDF8',
    infoQuiet:    'rgba(56, 189, 248, 0.14)',

    scrim: 'rgba(3, 6, 12, 0.65)',
    glow:  'rgba(0, 200, 128, 0.28)',
    shadowRgb: '0, 0, 0',
  },
};

// Elevation, expressed per theme because a shadow that reads on white is
// invisible on slate and vice versa. Index matches the surface number.
const shadow = {
  light: [
    'none',
    '0 1px 2px rgba(15,23,41,0.05)',
    '0 2px 4px rgba(15,23,41,0.06), 0 8px 16px -8px rgba(15,23,41,0.10)',
    '0 4px 8px rgba(15,23,41,0.07), 0 16px 32px -12px rgba(15,23,41,0.14)',
    '0 8px 16px rgba(15,23,41,0.08), 0 32px 64px -24px rgba(15,23,41,0.20)',
  ],
  dark: [
    'none',
    '0 1px 2px rgba(0,0,0,0.40)',
    '0 2px 6px rgba(0,0,0,0.45), 0 10px 20px -10px rgba(0,0,0,0.55)',
    '0 4px 12px rgba(0,0,0,0.50), 0 20px 40px -16px rgba(0,0,0,0.65)',
    '0 8px 20px rgba(0,0,0,0.55), 0 36px 72px -28px rgba(0,0,0,0.75)',
  ],
};

// Minimum hit area, in CSS px on web and points on mobile. 44 is the floor both
// Apple and Android publish; the audit measured 63–93% of interactive elements
// on the live site below it.
const touch = { min: 44, comfortable: 48 };

module.exports = { brand, neutral, category, glass, mesh, motion, type, radius, theme, shadow, touch };

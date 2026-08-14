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

module.exports = { brand, neutral, category, glass, mesh, motion, type, radius };

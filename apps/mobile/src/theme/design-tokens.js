/**
 * Mobile copy of design tokens to ensure hermetic bundler resolution.
 */
const brand = {
  primary: '#00C880',
  primaryHover: '#00A468',
  primaryLight: '#E6FBF3',
  primaryDeep: '#00543A',

  secondary: '#FF6A00',
  secondaryHover: '#D95400',
  secondaryLight: '#FFF2E8',
  secondaryDeep: '#7A2E00',

  accent: '#FF2D55',
  accentLight: '#FFE9EE',
  accentDeep: '#7A0E22',

  trust: '#12152E',
  promo: '#FFD400',
  violet: '#7C5CFF',
  cyan: '#00D9F5',
};

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

const category = {
  food:      { base: '#FF6B00', deep: '#DC2626' },
  retail:    { base: '#00E676', deep: '#00C853' },
  booking:   { base: '#00E5FF', deep: '#2563EB' },
  beauty:    { base: '#FF007F', deep: '#8B5CF6' },
  services:  { base: '#FFD600', deep: '#F59E0B' },
  rentals:   { base: '#10B981', deep: '#065F46' },
  directory: { base: '#6366F1', deep: '#4F46E5' },
};

const glass = {
  white04: 'rgba(255, 255, 255, 0.04)',
  white10: 'rgba(255, 255, 255, 0.10)',
  white20: 'rgba(255, 255, 255, 0.20)',
  dark40: 'rgba(0, 0, 0, 0.40)',
  dark60: 'rgba(0, 0, 0, 0.60)',
  edgeLight: 'rgba(255, 255, 255, 0.18)',
  edgeDark: 'rgba(255, 255, 255, 0.06)',
};

const mesh = ['#0F172A', '#1E1B4B', '#064E3B', '#7C2D12', '#78350F'];

const motion = {
  duration: { instant: 120, fast: 200, base: 320, slow: 520, deliberate: 800 },
  easing: {
    entrance: [0.16, 1, 0.3, 1],
    exit: [0.7, 0, 0.84, 0],
    standard: [0.4, 0, 0.2, 1],
  },
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  stagger: 60,
};

const type = {
  heading: 'Outfit',
  body: 'Inter',
  scale: {
    xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
    '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72,
  },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', black: '900' },
  tracking: { tight: -0.02, normal: 0, wide: 0.02 },
  // RN has no CSS line-height keyword; these are multipliers applied to
  // fontSize at the call site (fontSize * lineHeight.snug, etc).
  lineHeight: { tight: 1.1, snug: 1.25, normal: 1.5, relaxed: 1.7 },
};

// LinearGradient `colors` arrays for expo-linear-gradient, mirroring the web
// aurora/holo backgroundImage utilities so the hero banner reads the same on
// both platforms.
const gradients = {
  aurora: ['#00C880', '#7C5CFF', '#FF6A00'],
  holo: ['#00C880', '#00D9F5', '#7C5CFF', '#FF2D55', '#FF6A00'],
  glassSheen: ['transparent', 'rgba(255,255,255,0.22)', 'transparent'],
};

const radius = { sm: 8, base: 14, lg: 22, xl: 32, full: 9999 };

module.exports = { brand, neutral, category, glass, mesh, motion, type, radius, gradients };
export default { brand, neutral, category, glass, mesh, motion, type, radius, gradients };

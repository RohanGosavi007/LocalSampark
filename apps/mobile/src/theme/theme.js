// apps/mobile/src/theme/theme.js
//
// Legacy fixed palette for the 8 screens that import it (ShopByCategory,
// ResidentDashboard, CheckoutScreen and friends). The brand was already
// reconciled with the shared tokens; the surfaces, ink and semantic colours
// were not, so they still carried their own literals and drifted from both
// design-tokens.js and the web app.
//
// Every value now derives from packages/shared/design-tokens.js. Exported names
// are unchanged, so no screen needs an edit.
//
// New work should use `useTheme()` from src/context/ThemeContext.js instead:
// these constants are one fixed palette and cannot respond to light/dark.
import tokens from './design-tokens';

const { brand, theme: palettes } = tokens;
const L = palettes.light;
const D = palettes.dark;

export const COLORS = {
  primary: brand.primary,
  primaryLight: brand.primaryLight,
  primaryDark: brand.primaryHover,
  secondary: brand.secondary,

  background: L.ground,
  surface: L.surface1,

  textPrimary: L.text,
  textSecondary: L.textMuted,
  textTertiary: L.textSubtle,
  textInverse: L.textInverse,
  // Aliases some screens (ResidentDashboard, etc.) read directly.
  text: L.text,
  textMuted: L.textMuted,
  cardBg: L.surface1,

  success: L.success,
  successLight: L.successQuiet,
  error: L.danger,
  errorLight: L.dangerQuiet,
  warning: L.warning,
  warningLight: L.warningQuiet,
  info: L.info,
  infoLight: L.infoQuiet,

  border: L.border,
  divider: L.sunken,
  overlay: L.scrim,
};

// Dark surfaces, from the shared six-step slate ramp. These were a near-black
// #060b18 ground with indigo-tinted borders, an accent hue that appears nowhere
// in the emerald/orange brand.
export const DARK_COLORS = {
  background: D.ground,
  backgroundAlt: D.groundAlt,
  surface: D.surface1,
  surfaceGlass: D.surfaceGlass,
  text: D.text,
  textMuted: D.textMuted,
  border: D.border,
  borderGlass: D.borderStrong,
};

// Mesh gradient color arrays for LinearGradient
export const GRADIENTS = {
  // Hero / main backgrounds
  meshDark: ['#0F172A', '#1E1B4B', '#064E3B'],
  meshVibrant: ['#0F172A', '#312E81', '#065F46', '#0F172A'],
  meshWarm: ['#0F172A', '#7C2D12', '#78350F', '#0F172A'],

  // CTA buttons
  primary: ['#00C880', '#00D9A6', '#00A468'],
  primaryGlow: ['#00C880', '#00D9F5'],
  success: ['#10B981', '#059669'],
  violet: ['#8B5CF6', '#6366F1', '#4F46E5'],
  rose: ['#EC4899', '#E11D48'],
  
  // Glass overlay
  glassOverlay: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
  glassShine: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.04)'],
  
  // Section backgrounds
  sectionIndigo: ['rgba(99,102,241,0.15)', 'rgba(99,102,241,0.02)'],
  sectionEmerald: ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.02)'],
  sectionRose: ['rgba(225,29,72,0.10)', 'rgba(225,29,72,0.02)'],
};

// Pre-built glass card style objects
export const GLASS = {
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 24,
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
    borderColor: 'rgba(255, 255, 255, 0.80)',
    borderWidth: 1,
    borderRadius: 24,
  },
  surface: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderRadius: 16,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dock: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderRadius: 28,
  },
};

// Colored glow shadow presets
export const SPATIAL = {
  glowPrimary: {
    shadowColor: '#00C880',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  glowSuccess: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  glowViolet: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  glowRose: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  glowIndigo: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  depthCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 16,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,      // Standard for product cards
  xl: 16,
  xxl: 24,     // Standard for bottom sheets
  round: 9999, // Pills and circular avatars
};

export const TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  h2: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  h3: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  body1: { fontSize: 16, fontWeight: '400', color: COLORS.textPrimary },
  body2: { fontSize: 14, fontWeight: '400', color: COLORS.textSecondary },
  caption: { fontSize: 12, fontWeight: '400', color: COLORS.textTertiary },
  button: { fontSize: 16, fontWeight: '600', color: COLORS.textInverse },
  // Bare font-size lookup for screens that only need the number, e.g.
  // `fontSize: TYPOGRAPHY.sizes.h3` inside a StyleSheet.create() call where
  // spreading the full style object (with its own `color`) isn't wanted.
  sizes: { h1: 24, h2: 20, h3: 18, body1: 16, body2: 14, caption: 12, button: 16 },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const theme = {
  colors: COLORS,
  darkColors: DARK_COLORS,
  gradients: GRADIENTS,
  glass: GLASS,
  spatial: SPATIAL,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  typography: TYPOGRAPHY,
  shadows: SHADOWS,
};

export default theme;

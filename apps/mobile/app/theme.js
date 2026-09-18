// LocalSampark Mobile Design Tokens
//
// This module carried its own brand — a Swiggy-style orange #F05A28 — while
// src/theme/theme.js carried emerald #00C880 and src/theme/index.js carried the
// shared tokens. Three palettes were live at once, and which one a screen got
// depended on which of the three it happened to import. The four screens on
// this file (carpool, checkout, services, shop-detail) were the odd ones out.
//
// Values now derive from packages/shared/design-tokens.js via
// src/theme/design-tokens.js. Every exported NAME is unchanged, so those four
// screens need no edit; only the colours converge.
//
// New work should use `useTheme()` from src/context/ThemeContext.js instead,
// which is theme-aware. These constants are a single fixed palette and cannot
// respond to light/dark — they are kept for the screens not yet migrated.
import tokens from '../src/theme/design-tokens';

const { brand, theme: palettes } = tokens;
const L = palettes.light;
const D = palettes.dark;

export const COLORS = {
  primary: brand.primary,
  primaryHover: brand.primaryHover,
  primaryLight: brand.primaryLight,
  primaryGlass: L.accentQuiet,

  // Was #10b981, a second green that read as a near-duplicate of the primary.
  // The shared secondary is the brand orange, which gives an actual contrast.
  secondary: brand.secondary,
  secondaryHover: brand.secondaryHover,
  secondaryLight: brand.secondaryLight,
  secondaryGlass: L.secondaryQuiet,

  background: L.ground,
  backgroundAlt: L.groundAlt,
  cardBg: L.surface1,

  text: L.text,
  textMuted: L.textMuted,
  textLight: L.textSubtle,

  border: L.border,
  borderLight: L.sunken,

  success: L.success,
  warning: L.warning,
  error: L.danger,
  info: L.info,
};

// Dark surfaces. The previous values were a near-black (#060b18) with
// indigo-tinted borders; both now come from the shared six-step slate ramp.
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
  meshDark: ['#0F172A', '#1E1B4B', '#064E3B'],
  meshVibrant: ['#0F172A', '#312E81', '#065F46', '#0F172A'],
  meshWarm: ['#1a0a2e', '#16213e', '#0f3460'],
  heroLight: ['#e0e7ff', '#f0fdf4', '#ffffff'],

  // Was an orange ramp from the old brand; now the emerald CTA gradient the
  // web app and src/theme use, so a button looks the same on both platforms.
  primary: [brand.primary, '#00D9A6', brand.primaryHover],
  primaryGlow: [brand.primary, brand.cyan],
  success: ['#10B981', '#059669'],
  violet: ['#8B5CF6', '#6366F1', '#4F46E5'],
  rose: ['#EC4899', '#E11D48'],
  indigo: ['#6366F1', '#4F46E5'],
  
  glassOverlay: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
  glassShine: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.04)'],
};

// Pre-built glass card style objects
export const GLASS = {
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderRadius: 24,
  },
  cardLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.90)',
    borderWidth: 1,
    borderRadius: 24,
  },
  surface: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderRadius: 16,
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
    shadowColor: brand.primary,
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
  glowSuccess: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 56,
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System', 
    bold: 'System', 
    semiBold: 'System',
  },
  sizes: {
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    subtext: 14,
    caption: 12,
  },
  lineHeights: {
    h1: 40,
    h2: 32,
    h3: 28,
    body: 24,
    subtext: 20,
    caption: 16,
  },
};

// Aligned to the shared type scale. This file previously started at 10 and set
// body copy at 14; the audit found 1,296 uses of fontSize 12 across the app and
// no coherent scale at all (31 distinct values). 12 is now the smallest step and
// is for labels, not prose.
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 12,
  lg: 24,
  xl: 32,
  '2xl': 40,
  pill: 999,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Common reusable styles
export const COMMON_STYLES = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  heading: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '800',
    color: COLORS.text,
  },
  subheading: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  bodyText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryLight,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
  },
  // Glass card style for spatial UI
  glassCard: {
    ...GLASS.card,
    padding: SPACING.lg,
    ...SPATIAL.glowViolet,
  },
  input: {
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

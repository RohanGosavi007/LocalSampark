// LocalSampark Mobile Design Tokens
// Shared theme constants for consistent styling across all 66 modules
// Spatial Design System v2.0 — Unified with Web Design Language

export const COLORS = {
  // Vibrant Primary palette (Swiggy-style)
  primary: '#F05A28', 
  primaryHover: '#E04A1B',
  primaryLight: '#FFEDF1',
  primaryGlass: 'rgba(240, 90, 40, 0.1)',

  // Secondary
  secondary: '#10b981',
  secondaryHover: '#059669',
  secondaryLight: '#ecfdf5',
  secondaryGlass: 'rgba(16, 185, 129, 0.1)',

  // Backgrounds
  background: '#F8F9FA',
  backgroundAlt: '#FFFFFF',
  cardBg: '#FFFFFF',

  // Text
  text: '#1C1C1E',
  textMuted: '#8E8E93',
  textLight: '#C7C7CC',

  // Borders
  border: '#E5E5EA',
  borderLight: '#F2F2F7',

  // Semantic Status colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#3b82f6',
};

// Dark-mode-first surfaces for the spatial design language
export const DARK_COLORS = {
  background: '#060b18',
  backgroundAlt: '#0d1526',
  surface: 'rgba(13, 21, 38, 0.85)',
  surfaceGlass: 'rgba(255, 255, 255, 0.04)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#1e2d4a',
  borderGlass: 'rgba(255, 255, 255, 0.08)',
};

// Mesh gradient color arrays for LinearGradient
export const GRADIENTS = {
  meshDark: ['#0F172A', '#1E1B4B', '#064E3B'],
  meshVibrant: ['#0F172A', '#312E81', '#065F46', '#0F172A'],
  meshWarm: ['#1a0a2e', '#16213e', '#0f3460'],
  heroLight: ['#e0e7ff', '#f0fdf4', '#ffffff'],

  primary: ['#F05A28', '#f97316', '#ea580c'],
  primaryGlow: ['#F05A28', '#f59e0b'],
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
    shadowColor: '#F05A28',
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

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  base: 14,
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
    shadowColor: '#F05A28',
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

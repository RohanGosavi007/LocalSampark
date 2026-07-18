// LocalSampark Mobile Design Tokens
// Shared theme constants for consistent styling across all 66 modules

export const COLORS = {
  // Primary palette
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primaryLight: '#eef2ff',
  primaryGlass: 'rgba(99, 102, 241, 0.1)',

  // Secondary palette
  secondary: '#f97316',
  secondaryHover: '#ea580c',
  secondaryLight: '#fff7ed',
  secondaryGlass: 'rgba(249, 115, 22, 0.1)',

  // Accent
  accent: '#10b981',
  accentLight: '#ecfdf5',

  // Backgrounds
  background: '#f0f4ff',
  backgroundAlt: '#ffffff',
  cardBg: '#ffffff',

  // Text
  text: '#0f172a',
  textMuted: '#64748b',
  textLight: '#94a3b8',

  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Dark mode
  dark: {
    background: '#0f0f23',
    backgroundAlt: '#1a1a2e',
    cardBg: '#1a1a2e',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    border: '#2d2d44',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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

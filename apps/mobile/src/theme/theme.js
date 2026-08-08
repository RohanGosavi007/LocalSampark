// apps/mobile/src/theme/theme.js
// Spatial Design System v2.0 — Unified with Web Design Language

export const COLORS = {
  // Brand Colors (Vibrant Swiggy/Blinkit style)
  primary: '#fc8019',       // Vibrant Orange
  primaryLight: '#fff0e5',
  primaryDark: '#d8650a',
  secondary: '#1b1b1b',     // Deep almost-black for strong contrast
  
  // Backgrounds
  background: '#F8F9FA',    // Off-white for overall app background
  surface: '#FFFFFF',       // Pure white for cards and sheets
  
  // Typography
  textPrimary: '#1E1E1E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Semantic Colors
  success: '#10B981',       // Crisp green
  successLight: '#D1FAE5',
  error: '#EF4444',         // Crisp red
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  
  // Structural
  border: '#E5E7EB',
  divider: '#F3F4F6',
  overlay: 'rgba(0,0,0,0.4)',
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
  // Hero / main backgrounds
  meshDark: ['#0F172A', '#1E1B4B', '#064E3B'],
  meshVibrant: ['#0F172A', '#312E81', '#065F46', '#0F172A'],
  meshWarm: ['#0F172A', '#7C2D12', '#78350F', '#0F172A'],

  // CTA buttons
  primary: ['#fc8019', '#f97316', '#ea580c'],
  primaryGlow: ['#fc8019', '#f59e0b'],
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
    shadowColor: '#fc8019',
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

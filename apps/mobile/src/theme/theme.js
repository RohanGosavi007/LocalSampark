// apps/mobile/src/theme/theme.js
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
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  typography: TYPOGRAPHY,
  shadows: SHADOWS,
};

export default theme;

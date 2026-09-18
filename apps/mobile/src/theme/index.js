/**
 * Mobile theme.
 *
 * The mobile app had no design system: tailwind.config.js scanned nothing and
 * NativeWind was never installed, while 84 screens style themselves with
 * StyleSheet.create. Rather than convert all of them, this exposes the shared
 * tokens in the shape StyleSheet already consumes.
 *
 * Values come from packages/shared/design-tokens.js, so web and mobile cannot
 * drift apart.
 */
import { Platform } from 'react-native';
import tokens from './design-tokens';

const { brand, neutral, category, glass, mesh, motion, type, radius, gradients, theme: palettes, shadow, touch } =
  tokens;

export const colors = {
  primary: brand.primary,
  primaryHover: brand.primaryHover,
  primaryLight: brand.primaryLight,
  primaryDeep: brand.primaryDeep,

  secondary: brand.secondary,
  secondaryLight: brand.secondaryLight,

  accent: brand.accent,
  accentLight: brand.accentLight,

  violet: brand.violet,
  cyan: brand.cyan,
  promo: brand.promo,

  text: brand.trust,
  textMuted: neutral[500],
  textInverse: neutral[0],

  background: neutral[50],
  surface: neutral[0],
  surfaceAlt: neutral[100],
  border: neutral[200],

  // Dark ground, used by the immersive surfaces.
  ground: neutral[950],
  groundAlt: neutral[900],

  glass,
  category,
  mesh,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64 };

export const radii = radius;

export const typography = {
  heading: type.heading,
  body: type.body,
  size: type.scale,
  weight: type.weight,
  lineHeight: type.lineHeight,
  // React Native takes letterSpacing in points, not ems, so the shared
  // fractional tracking is scaled per size at the call site.
  tracking: (size, key = 'tight') => size * type.tracking[key],
};

export { gradients };

/**
 * Elevation. iOS and Android express depth differently: iOS reads shadow
 * colour and radius, Android only reads `elevation`. Returning both keeps a
 * card looking the same on each.
 */
export const elevation = (level = 1, tint = '#000000') => {
  const map = {
    1: { radius: 6, opacity: 0.10, y: 2 },
    2: { radius: 12, opacity: 0.14, y: 5 },
    3: { radius: 22, opacity: 0.18, y: 9 },
    4: { radius: 36, opacity: 0.24, y: 14 },
  };
  const s = map[level] || map[1];

  return Platform.select({
    ios: {
      shadowColor: tint,
      shadowOffset: { width: 0, height: s.y },
      shadowOpacity: s.opacity,
      shadowRadius: s.radius,
    },
    android: { elevation: s.y * 2, shadowColor: tint },
    default: {},
  });
};

/**
 * Coloured glow, the mobile counterpart of the web drop-shadow glows.
 * Android cannot tint a shadow before API 28, so it falls back to elevation.
 */
export const glow = (color = brand.primary, level = 3) => elevation(level, color);

/** Motion, shared with web so the two platforms animate at the same tempo. */
export const timing = {
  ...motion.duration,
  spring: motion.spring,
  stagger: motion.stagger,
  // Reanimated takes an easing function; these mirror the web cubic-beziers.
  bezier: motion.easing,
};

// ─── Light / dark palettes ───────────────────────────────────────────────────
// Added in the theme-system overhaul. The mobile app previously had no dark
// mode at all: no ThemeContext, no appearance setting, and a single palette in
// design-tokens.js with nothing to switch to. Grepping all 582 mobile source
// files for isDark / darkMode / useColorScheme / toggleTheme returned one hit,
// in an unrelated shop module.
//
// `buildTheme` returns the same shape for either mode, so a screen written
// against it works in both without conditionals. The brand values are shared;
// only the surfaces, lines and ink change.

/**
 * @param {'light'|'dark'} mode
 * @returns a full theme object for that mode.
 */
export function buildTheme(mode = 'light') {
  const p = palettes[mode] || palettes.light;
  const isDark = mode === 'dark';

  return {
    mode,
    isDark,

    colors: {
      // Brand, identical in both modes so identity does not shift.
      primary: brand.primary,
      primaryHover: brand.primaryHover,
      primaryLight: brand.primaryLight,
      primaryDeep: brand.primaryDeep,
      violet: brand.violet,
      cyan: brand.cyan,
      promo: brand.promo,

      // Surfaces, from the shared ramp.
      ground: p.ground,
      groundAlt: p.groundAlt,
      sunken: p.sunken,
      surface1: p.surface1,
      surface2: p.surface2,
      surface3: p.surface3,
      surface4: p.surface4,
      surfaceGlass: p.surfaceGlass,

      border: p.border,
      borderStrong: p.borderStrong,
      borderAccent: p.borderAccent,

      text: p.text,
      textMuted: p.textMuted,
      textSubtle: p.textSubtle,
      textInverse: p.textInverse,

      accent: p.accent,
      accentHover: p.accentHover,
      accentText: p.accentText,
      accentQuiet: p.accentQuiet,
      onAccent: p.onAccent,

      secondary: p.secondary,
      secondaryQuiet: p.secondaryQuiet,

      success: p.success,
      successQuiet: p.successQuiet,
      warning: p.warning,
      warningQuiet: p.warningQuiet,
      error: p.danger,
      errorQuiet: p.dangerQuiet,
      danger: p.danger,
      dangerQuiet: p.dangerQuiet,
      info: p.info,
      infoQuiet: p.infoQuiet,

      scrim: p.scrim,
      glow: p.glow,

      // Aliases for the ~570 screens that hardcode their colours today and
      // will be migrated onto tokens surface by surface. Keeping the old names
      // pointed at the new ramp means a screen can be converted with an import
      // change rather than a rewrite.
      background: p.ground,
      backgroundAlt: p.groundAlt,
      surface: p.surface1,
      cardBg: p.surface1,
      textPrimary: p.text,
      textSecondary: p.textMuted,
      textTertiary: p.textSubtle,
      divider: p.border,
      overlay: p.scrim,

      glass,
      category,
      mesh,
    },

    spacing,
    radii,
    typography,
    gradients,
    timing,
    touch,

    /** Native elevation, tinted per mode. */
    elevation: (level = 1) => elevation(level, isDark ? '#000000' : '#0F1729'),
    /** Coloured glow; falls back to plain elevation below Android API 28. */
    glow: (color = p.accent, level = 3) => elevation(level, color),

    /**
     * expo-status-bar style. Getting this wrong is the most visible theming
     * bug on Android: dark icons on a dark header are simply unreadable.
     */
    statusBarStyle: isDark ? 'light' : 'dark',
  };
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');

/** Kept so `import { touch } from '../theme'` works alongside the palettes. */
export { touch, shadow };

// The original flat export. Still the light theme, so the two modules that
// already import `colors` / `theme` directly keep working unchanged.
export const theme = { colors, spacing, radii, typography, elevation, glow, timing, gradients, touch };

export default theme;

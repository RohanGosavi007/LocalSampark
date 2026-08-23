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

const { brand, neutral, category, glass, mesh, motion, type, radius, gradients } = tokens;

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

export const theme = { colors, spacing, radii, typography, elevation, glow, timing, gradients };

export default theme;

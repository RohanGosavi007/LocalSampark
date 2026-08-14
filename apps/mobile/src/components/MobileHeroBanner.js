import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, withDelay, interpolate,
  Extrapolation, Easing, FadeInDown, FadeInUp,
} from 'react-native-reanimated';
import { ArrowRight, Sparkles, Zap } from 'lucide-react-native';
import { colors, radii, elevation, timing, glow } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

let LinearGradient;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  LinearGradient = ({ children, style }) => (
    <View style={[style, { backgroundColor: colors.ground }]}>{children}</View>
  );
}

/**
 * MobileHeroBanner
 *
 * An immersive hero section with:
 * - Drifting gradient orbs (Reanimated continuous animation)
 * - Staggered text reveal on mount
 * - Spring-physics CTA button
 * - Glowing accent badge
 *
 * All animations use Reanimated worklets for UI thread execution.
 */

export default function MobileHeroBanner({
  eyebrow = '🟢 Live in your area',
  headline = 'Your Neighbourhood,\nConnected.',
  subhead = 'Shops, services & neighbours within walking distance',
  ctaLabel = 'Explore Shops',
  ctaSecondaryLabel = 'List Your Shop',
  onCtaPress,
  onSecondaryPress,
}) {
  // ─── Orb Animations ───────────────────────────────────────
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb3Scale = useSharedValue(1);
  const shimmerX = useSharedValue(-1);

  useEffect(() => {
    // Orb 1: Slow drift
    orb1X.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(-18, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(12, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true
    );

    // Orb 2: Opposite phase
    orb2X.value = withRepeat(
      withSequence(
        withTiming(-25, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(18, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true
    );
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-20, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true
    );

    // Orb 3: Breathing scale
    orb3Scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, true
    );

    // CTA shimmer sweep
    shimmerX.value = withRepeat(
      withDelay(2000,
        withTiming(2, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1, false
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: orb1X.value },
      { translateY: orb1Y.value },
    ],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: orb2X.value },
      { translateY: orb2Y.value },
    ],
  }));

  const orb3Style = useAnimatedStyle(() => ({
    transform: [{ scale: orb3Scale.value }],
  }));

  // ─── CTA Press Animation ──────────────────────────────────
  const ctaScale = useSharedValue(1);

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const handleCtaPressIn = () => {
    ctaScale.value = withSpring(0.94, { stiffness: 500, damping: 12 });
  };
  const handleCtaPressOut = () => {
    ctaScale.value = withSpring(1, {
      damping: timing.spring.damping,
      stiffness: timing.spring.stiffness,
    });
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[colors.ground, `${colors.primary}08`, colors.ground]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated Orbs */}
      <Animated.View style={[styles.orb, styles.orbPrimary, orb1Style]} />
      <Animated.View style={[styles.orb, styles.orbViolet, orb2Style]} />
      <Animated.View style={[styles.orb, styles.orbCyan, orb3Style]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Eyebrow Badge */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.eyebrowContainer}
        >
          <View style={styles.eyebrowBadge}>
            <Sparkles size={12} color={colors.primary} />
            <Text style={styles.eyebrowText}>{eyebrow}</Text>
          </View>
        </Animated.View>

        {/* Headline */}
        <Animated.Text
          entering={FadeInDown.delay(200).springify()}
          style={styles.headline}
        >
          {headline}
        </Animated.Text>

        {/* Subhead */}
        <Animated.Text
          entering={FadeInDown.delay(350).springify()}
          style={styles.subhead}
        >
          {subhead}
        </Animated.Text>

        {/* CTA Buttons */}
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={styles.ctaRow}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={handleCtaPressIn}
            onPressOut={handleCtaPressOut}
            onPress={onCtaPress}
          >
            <Animated.View style={[styles.ctaPrimary, ctaStyle]}>
              <LinearGradient
                colors={[colors.primary, `${colors.primary}DD`]}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Zap size={16} color={colors.ground} />
                <Text style={styles.ctaPrimaryText}>{ctaLabel}</Text>
                <ArrowRight size={16} color={colors.ground} />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ctaSecondary}
            activeOpacity={0.7}
            onPress={onSecondaryPress}
          >
            <Text style={styles.ctaSecondaryText}>{ctaSecondaryLabel}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Live stats */}
        <Animated.View
          entering={FadeInUp.delay(650).springify()}
          style={styles.statsRow}
        >
          {[
            { label: 'Shops', value: '340+' },
            { label: 'Neighbors', value: '12K+' },
            { label: 'Deliveries', value: '50K+' },
          ].map((stat, i) => (
            <View key={stat.label} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 420,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    zIndex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 200,
    height: 200,
    backgroundColor: `${colors.primary}18`,
    top: -40,
    left: -40,
  },
  orbViolet: {
    width: 160,
    height: 160,
    backgroundColor: `${colors.violet}12`,
    top: 80,
    right: -30,
  },
  orbCyan: {
    width: 120,
    height: 120,
    backgroundColor: `${colors.cyan}10`,
    bottom: 20,
    left: 40,
  },
  eyebrowContainer: {
    marginBottom: 16,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
  },
  headline: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 42,
    marginBottom: 12,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    marginBottom: 28,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  ctaPrimary: {
    borderRadius: radii.base,
    overflow: 'hidden',
    ...glow(colors.primary, 3),
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.base,
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ground,
    letterSpacing: 0.2,
  },
  ctaSecondary: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ctaSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    letterSpacing: 0.3,
  },
});

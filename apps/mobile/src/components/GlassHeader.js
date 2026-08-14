import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle, interpolate, Extrapolation,
  interpolateColor, useAnimatedScrollHandler, useSharedValue,
} from 'react-native-reanimated';
import { MapPin, Bell, Search } from 'lucide-react-native';
import { colors, radii, elevation, timing } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const HEADER_MAX = 200;
const HEADER_MIN = 100;
const STATUS_BAR_H = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24);

let LinearGradient;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  LinearGradient = ({ children, style }) => (
    <View style={[style, { backgroundColor: colors.ground }]}>{children}</View>
  );
}

/**
 * GlassHeader
 *
 * A collapsing header that transitions from immersive dark gradient to a
 * compact frosted-glass bar on scroll. The title and location morph in size
 * and position, and a blur surface fades in at the collapsed height.
 *
 * Pass `scrollY` from the parent's useAnimatedScrollHandler so the header
 * can respond to scroll without owning the ScrollView itself.
 */

export default function GlassHeader({
  scrollY,
  location = 'Dhanori',
  greeting = 'Good morning',
  userName,
  unreadCount = 0,
  onSearchPress,
  onNotificationPress,
  onLocationPress,
}) {
  const collapseRange = HEADER_MAX - HEADER_MIN;

  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, collapseRange],
      [HEADER_MAX, HEADER_MIN],
      Extrapolation.CLAMP
    );

    return { height };
  });

  const gradientOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, collapseRange * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  const glassOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [collapseRange * 0.3, collapseRange], [0, 1], Extrapolation.CLAMP),
  }));

  const titleStyle = useAnimatedStyle(() => {
    const fontSize = interpolate(scrollY.value, [0, collapseRange], [26, 18], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, collapseRange], [0, -6], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, collapseRange * 0.5], [1, 0.9], Extrapolation.CLAMP);

    return {
      fontSize,
      transform: [{ translateY }],
      opacity,
    };
  });

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, collapseRange * 0.5], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, collapseRange * 0.5], [0, -10], Extrapolation.CLAMP) },
    ],
  }));

  const searchStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [collapseRange * 0.5, collapseRange], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(scrollY.value, [collapseRange * 0.5, collapseRange], [-20, 0], Extrapolation.CLAMP) },
    ],
  }));

  const displayName = userName ? userName.split(' ')[0] : '';
  const title = displayName ? `${greeting}, ${displayName}` : greeting;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Immersive gradient background */}
      <Animated.View style={[StyleSheet.absoluteFill, gradientOpacity]}>
        <LinearGradient
          colors={[colors.ground, `${colors.primary}22`, colors.ground]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {/* Decorative orbs */}
        <View style={[styles.orb, styles.orbPrimary]} />
        <View style={[styles.orb, styles.orbViolet]} />
      </Animated.View>

      {/* Frosted glass background (collapsed state) */}
      <Animated.View style={[styles.glassBackground, glassOpacity]}>
        <View style={styles.glassSurface} />
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          {/* Location pill */}
          <Animated.View style={styles.locationPill}>
            <MapPin size={14} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1} onPress={onLocationPress}>
              {location}
            </Text>
          </Animated.View>

          {/* Actions */}
          <View style={styles.actions}>
            {/* Collapsed search icon */}
            <Animated.View style={searchStyle}>
              <View style={styles.actionBtn} onTouchEnd={onSearchPress}>
                <Search size={18} color={colors.textInverse} />
              </View>
            </Animated.View>

            {/* Notification bell */}
            <View style={styles.actionBtn} onTouchEnd={onNotificationPress}>
              <Bell size={18} color={colors.textInverse} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Title */}
        <Animated.Text style={[styles.title, titleStyle]} numberOfLines={1}>
          {title}
        </Animated.Text>

        {/* Subtitle (fades on collapse) */}
        <Animated.Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>
          Discover shops & services in {location}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

/**
 * Hook for parent ScrollViews to get a scrollY value for the header.
 */
export function useHeaderScroll() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
  });
  return { scrollY, scrollHandler };
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    paddingTop: STATUS_BAR_H,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    maxWidth: 160,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.ground,
  },
  notifText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  title: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glassSurface: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 160,
    height: 160,
    backgroundColor: `${colors.primary}15`,
    top: -40,
    right: -30,
  },
  orbViolet: {
    width: 120,
    height: 120,
    backgroundColor: `${colors.violet}10`,
    bottom: -20,
    left: -20,
  },
});

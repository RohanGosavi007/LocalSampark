import React, { useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolateColor, interpolate, Extrapolation, useDerivedValue,
  useAnimatedReaction, runOnJS,
} from 'react-native-reanimated';
import { Home, ShoppingBag, User, Compass, LayoutGrid } from 'lucide-react-native';
import { colors, radii, timing, glow } from '../theme';

let Haptics;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = { impactAsync: () => {}, ImpactFeedbackStyle: { Light: 'light' } };
}

let LinearGradient;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  LinearGradient = ({ children, style }) => (
    <View style={[style, { backgroundColor: colors.ground }]}>{children}</View>
  );
}

const { width: SCREEN_W } = Dimensions.get('window');
const TAB_BAR_H = 72;
const TAB_BAR_MX = 20;
const TAB_BAR_W = SCREEN_W - TAB_BAR_MX * 2;
const PILL_H = 44;

const ICON_MAP = {
  index: Home, directory: Compass, community: LayoutGrid,
  wallet: ShoppingBag, profile: User,
  services: Compass, orders: ShoppingBag, products: ShoppingBag,
  appointments: LayoutGrid, available: Compass, active: Compass,
  earnings: ShoppingBag, bookings: LayoutGrid, reviews: User,
  onboard: Home, leads: Compass, shops: ShoppingBag,
  agents: User, revenue: ShoppingBag, more: LayoutGrid,
};

const ACTIVE_COLOR = colors.primary;
const INACTIVE_COLOR = '#64748B';
const GLOW_COLOR = colors.primary;

const SPRING_CONFIG = {
  damping: timing.spring.damping,
  stiffness: timing.spring.stiffness,
  mass: timing.spring.mass,
};

// ─── Morphing Pill Indicator ──────────────────────────────────────────────
function MorphingPill({ activeIndex, totalTabs }) {
  const tabWidth = useDerivedValue(() => TAB_BAR_W / totalTabs);
  const translateX = useDerivedValue(() =>
    withSpring(activeIndex.value * tabWidth.value + (tabWidth.value - PILL_H * 1.5) / 2, SPRING_CONFIG)
  );

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: PILL_H * 1.5,
    height: PILL_H,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value - (activeIndex.value * tabWidth.value + (tabWidth.value - PILL_H * 1.5) / 2)),
      [0, 30],
      [0.6, 0.2],
      Extrapolation.CLAMP
    ),
    transform: [
      { translateX: translateX.value },
      { scale: 1.3 },
    ],
  }));

  return (
    <>
      {/* Outer glow — larger and blurred */}
      <Animated.View style={[styles.pillGlow, glowStyle]} />
      {/* Active pill */}
      <Animated.View style={[styles.pill, pillStyle]}>
        <LinearGradient
          colors={[`${ACTIVE_COLOR}25`, `${ACTIVE_COLOR}12`]}
          style={styles.pillGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
    </>
  );
}

// ─── Tab Item ─────────────────────────────────────────────────────────────
function TabItem({ route, index, isFocused, onPress, totalTabs }) {
  const progress = useSharedValue(isFocused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);
  }, [isFocused]);

  const iconContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [1, 1.22], Extrapolation.CLAMP);
    const translateY = interpolate(progress.value, [0, 1], [0, -3], Extrapolation.CLAMP);
    return {
      transform: [
        { scale: scale * pressScale.value },
        { translateY },
      ],
    };
  });

  const dotStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 0.5, 1], [0, 0.5, 1], Extrapolation.CLAMP) },
    ],
    opacity: progress.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.6, 0.8, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [2, 0], Extrapolation.CLAMP) },
    ],
  }));

  const IconComp = ICON_MAP[route.name] || Home;
  const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

  const handlePress = useCallback(() => {
    pressScale.value = withSpring(0.82, { stiffness: 600, damping: 12 });
    setTimeout(() => {
      pressScale.value = withSpring(1, SPRING_CONFIG);
    }, 80);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    onPress();
  }, [onPress]);

  // Derive label from route name
  const label = route.name.charAt(0).toUpperCase() + route.name.slice(1);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabItem}
      activeOpacity={1}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={iconContainerStyle}>
        <IconComp
          color={iconColor}
          size={22}
          strokeWidth={isFocused ? 2.5 : 1.8}
        />
      </Animated.View>

      <Animated.Text
        style={[
          styles.tabLabel,
          { color: iconColor },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>

      {/* Active indicator dot with glow */}
      <Animated.View style={[styles.activeDot, dotStyle]} />
    </TouchableOpacity>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────
export default function MorphingBottomTabs({ state, descriptors, navigation }) {
  const activeIndex = useSharedValue(state.index);

  useEffect(() => {
    activeIndex.value = state.index;
  }, [state.index]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[`${colors.ground}F2`, `${colors.ground}FA`]}
        style={styles.bar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Glass shine top edge */}
        <View style={styles.glassEdge} />

        {/* Morphing pill that slides under the active tab */}
        <MorphingPill activeIndex={activeIndex} totalTabs={state.routes.length} />

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate({ name: route.name, merge: true });
            }
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              isFocused={isFocused}
              onPress={onPress}
              totalTabs={state.routes.length}
            />
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 14,
    left: TAB_BAR_MX,
    right: TAB_BAR_MX,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
      },
      android: { elevation: 20 },
    }),
  },
  bar: {
    flexDirection: 'row',
    borderRadius: radii.xl,
    height: TAB_BAR_H,
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  glassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  pill: {
    position: 'absolute',
    top: (TAB_BAR_H - PILL_H) / 2,
    left: 0,
    borderRadius: PILL_H / 2,
    overflow: 'hidden',
  },
  pillGradient: {
    flex: 1,
    borderRadius: PILL_H / 2,
    borderWidth: 1,
    borderColor: `${ACTIVE_COLOR}30`,
  },
  pillGlow: {
    position: 'absolute',
    top: (TAB_BAR_H - PILL_H) / 2,
    left: 0,
    width: PILL_H * 1.5,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    backgroundColor: `${ACTIVE_COLOR}18`,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
    position: 'absolute',
    bottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: ACTIVE_COLOR,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.7,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
});

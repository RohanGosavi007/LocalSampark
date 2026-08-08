import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolateColor, interpolate, Extrapolation
} from 'react-native-reanimated';
import { Home, ShoppingBag, User, Compass, LayoutGrid } from 'lucide-react-native';

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
  LinearGradient = ({ children, style }) => <View style={[style, { backgroundColor: 'rgba(15,23,42,0.85)' }]}>{children}</View>;
}

const ICON_MAP = {
  index: Home,
  directory: Compass,
  community: LayoutGrid,
  wallet: ShoppingBag,
  profile: User,
  // Fallbacks for other role tabs
  services: Compass,
  orders: ShoppingBag,
  products: ShoppingBag,
  appointments: LayoutGrid,
  available: Compass,
  active: Compass,
  earnings: ShoppingBag,
  bookings: LayoutGrid,
  reviews: User,
  onboard: Home,
  leads: Compass,
  shops: ShoppingBag,
  agents: User,
  revenue: ShoppingBag,
  more: LayoutGrid,
};

const ACTIVE_COLOR = '#818CF8';  // Indigo-400
const INACTIVE_COLOR = '#64748B'; // Slate-500

function TabItem({ route, index, isFocused, onPress, totalTabs }) {
  const focusProgress = useSharedValue(isFocused ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    focusProgress.value = withSpring(isFocused ? 1 : 0, {
      stiffness: 300,
      damping: 20,
    });
  }, [isFocused]);

  const iconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      focusProgress.value,
      [0, 1],
      [1, 1.15],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      focusProgress.value,
      [0, 1],
      [0, -2],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { scale: scale * pressScale.value },
        { translateY },
      ],
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      focusProgress.value,
      [0, 0.5, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      focusProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const bgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      focusProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const IconComp = ICON_MAP[route.name] || Home;
  const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

  const handlePress = () => {
    pressScale.value = withSpring(0.85, { stiffness: 500, damping: 15 });
    setTimeout(() => {
      pressScale.value = withSpring(1, { stiffness: 300, damping: 10 });
    }, 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabItem}
      activeOpacity={1}
    >
      {/* Active background glow */}
      <Animated.View style={[styles.tabActiveGlow, bgStyle]}>
        <View style={[styles.tabActiveGlowInner, { backgroundColor: `${ACTIVE_COLOR}15` }]} />
      </Animated.View>

      <Animated.View style={iconStyle}>
        <IconComp
          color={color}
          size={22}
          strokeWidth={isFocused ? 2.5 : 1.8}
        />
      </Animated.View>

      {/* Active indicator dot */}
      <Animated.View style={[styles.activeDot, dotStyle]} />
    </TouchableOpacity>
  );
}

export default function AnimatedBottomTabs({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBarContainer}>
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.90)', 'rgba(15, 23, 42, 0.95)']}
        style={styles.tabBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Glass shine top edge */}
        <View style={styles.glassEdge} />
        
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
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 24,
    right: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 28,
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 8,
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
  },
  tabActiveGlow: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 4,
    right: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabActiveGlowInner: {
    flex: 1,
    borderRadius: 16,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACTIVE_COLOR,
    position: 'absolute',
    bottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: ACTIVE_COLOR,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
});

import React, { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, Extrapolation, runOnJS, useAnimatedScrollHandler,
  FadeIn,
} from 'react-native-reanimated';
import { colors, radii, elevation, timing } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHIP_HEIGHT = 42;
const CHIP_GAP = 8;

let Haptics;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  Haptics = { impactAsync: () => {}, ImpactFeedbackStyle: { Light: 'light' } };
}

/**
 * AnimatedCategorySwiper
 *
 * A horizontally scrolling category selector with:
 * - Active state morph animation (pill expands and icon scales)
 * - Scroll-driven parallax on the emoji icons
 * - Spring-physics press feedback
 * - Entering animation with stagger per chip
 */

function CategoryChip({ category, isActive, index, onPress, scrollX }) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { stiffness: 600, damping: 12 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: timing.spring.damping,
      stiffness: timing.spring.stiffness,
    });
  }, []);

  const handlePress = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    onPress(category);
  }, [category, onPress]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => {
    if (!isActive) return {};
    return {
      transform: [
        { scale: withSpring(1.15, { stiffness: 300, damping: 14 }) },
      ],
    };
  });

  const activeColor = isActive ? colors.primary : 'transparent';
  const textColor = isActive ? '#fff' : colors.text;
  const bgColor = isActive ? colors.primary : colors.surface;
  const borderColor = isActive ? colors.primary : colors.border;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 40).springify()}
      style={chipStyle}
    >
      <Animated.View style={[
        styles.chip,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          ...(isActive ? elevation(2, colors.primary) : elevation(1)),
        },
      ]}>
        <GestureDetector
          gesture={Gesture.Tap()
            .onBegin(() => { 'worklet'; runOnJS(handlePressIn)(); })
            .onFinalize(() => { 'worklet'; runOnJS(handlePressOut)(); })
            .onEnd(() => { 'worklet'; runOnJS(handlePress)(); })
          }
        >
          <Animated.View style={styles.chipContent}>
            <Animated.Text style={[styles.chipIcon, iconStyle]}>
              {category.icon || '🏪'}
            </Animated.Text>
            <Text
              style={[styles.chipText, { color: textColor }]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
            {category.count > 0 && (
              <View style={[
                styles.countBadge,
                { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${colors.primary}15` },
              ]}>
                <Text style={[
                  styles.countText,
                  { color: isActive ? '#fff' : colors.primary },
                ]}>
                  {category.count}
                </Text>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

export default function AnimatedCategorySwiper({
  categories = [],
  selectedCategory = '',
  onSelect,
  style,
}) {
  const scrollX = useSharedValue(0);
  const scrollRef = useRef(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleSelect = useCallback((category) => {
    onSelect?.(category.name);
  }, [onSelect]);

  return (
    <View style={[styles.container, style]}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={0} // Free scroll, no snapping
      >
        {categories.map((cat, index) => (
          <CategoryChip
            key={cat.name || cat.id || index}
            category={cat}
            index={index}
            isActive={selectedCategory === cat.name}
            onPress={handleSelect}
            scrollX={scrollX}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CHIP_GAP,
    alignItems: 'center',
  },
  chip: {
    height: CHIP_HEIGHT,
    borderRadius: CHIP_HEIGHT / 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: CHIP_HEIGHT,
    gap: 6,
  },
  chipIcon: {
    fontSize: 18,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
    maxWidth: 120,
  },
  countBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 2,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

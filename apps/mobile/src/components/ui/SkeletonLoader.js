import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  interpolateColor
} from 'react-native-reanimated';

export default function SkeletonLoader({ width = '100%', height = 20, style, borderRadius = 8 }) {
  const animation = useSharedValue(0);

  useEffect(() => {
    animation.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animation.value,
      [0, 1],
      ['#e2e8f0', '#cbd5e1']
    );
    return { backgroundColor };
  });

  return (
    <Animated.View style={[{ width, height, borderRadius }, animatedStyle, style]} />
  );
}

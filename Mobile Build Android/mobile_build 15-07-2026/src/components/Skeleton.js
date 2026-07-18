import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function Skeleton({ width, height, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View 
      style={[
        styles.skeleton, 
        { width, height, opacity }, 
        style
      ]} 
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  }
});

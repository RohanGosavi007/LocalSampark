import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * High-Fidelity Animated Shimmer Skeleton for Mobile UI.
 * Eradicates basic spinners and provides layout-specific loading states.
 */
export default function SkeletonLoader({ type = 'bento', count = 4 }) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  if (type === 'bento') {
    return (
      <View style={styles.bentoContainer}>
        {Array.from({ length: count }).map((_, i) => (
          <Animated.View key={i} style={[styles.bentoCard, { opacity }]} />
        ))}
      </View>
    );
  }

  // Default Shop List Skeleton
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.listItem}>
          <Animated.View style={[styles.avatar, { opacity }]} />
          <View style={styles.textContainer}>
            <Animated.View style={[styles.titleLine, { opacity }]} />
            <Animated.View style={[styles.subLine, { opacity }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bentoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  bentoCard: {
    width: (width / 2) - 24,
    height: 120,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 16,
  },
  listContainer: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2E8F0',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  titleLine: {
    height: 20,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  subLine: {
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    width: '40%',
  },
});

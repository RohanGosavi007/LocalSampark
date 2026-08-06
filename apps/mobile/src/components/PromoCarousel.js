import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, Dimensions, Image, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme/theme';

const { width } = Dimensions.get('window');

const PROMOS = [
  { id: '1', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800&h=400' },
  { id: '2', image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800&h=400' },
  { id: '3', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800&h=400' },
];

export default function PromoCarousel() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= PROMOS.length) nextIndex = 0;
      
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      >
        {PROMOS.map((promo) => (
          <View key={promo.id} style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: promo.image }} style={styles.image} />
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.pagination}>
        {PROMOS.map((_, i) => {
          const widthAnim = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [6, 16, 6],
            extrapolate: 'clamp',
          });
          const bgColor = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: ['rgba(255, 255, 255, 0.5)', theme.colors.primary, 'rgba(255, 255, 255, 0.5)'],
            extrapolate: 'clamp',
          });
          return <Animated.View key={i} style={[styles.dot, { width: widthAnim, backgroundColor: bgColor }]} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  slide: {
    width,
    paddingHorizontal: theme.spacing.md,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
    backgroundColor: theme.colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.lg,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: theme.spacing.sm,
    alignSelf: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
});

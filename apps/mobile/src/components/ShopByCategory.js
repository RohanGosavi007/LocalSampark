import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { theme } from '../theme/theme';
import BouncyButton from './BouncyButton';

const CATEGORIES = [
  { id: '1', name: 'Grocery', icon: 'https://cdn-icons-png.flaticon.com/512/3082/3082008.png' },
  { id: '2', name: 'Fresh Fruits', icon: 'https://cdn-icons-png.flaticon.com/512/3194/3194591.png' },
  { id: '3', name: 'Carpool', icon: 'https://cdn-icons-png.flaticon.com/512/3082/3082383.png', route: '/advanced' },
  { id: '4', name: 'Marketplace', icon: 'https://cdn-icons-png.flaticon.com/512/3081/3081986.png', route: '/advanced' },
  { id: '5', name: 'Jobs & Gigs', icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', route: '/advanced' },
  { id: '6', name: 'Pharmacy', icon: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png' },
  { id: '7', name: 'Bakery', icon: 'https://cdn-icons-png.flaticon.com/512/3081/3081993.png' },
  { id: '8', name: 'Pet Care', icon: 'https://cdn-icons-png.flaticon.com/512/2990/2990714.png' },
];

export default function ShopByCategory() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shop by Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {CATEGORIES.map((cat, index) => (
          <Animated.View key={cat.id} entering={FadeInRight.delay(index * 60).springify().damping(16)}>
            <BouncyButton style={styles.categoryCard} scaleTo={0.92} onPress={() => {
              if (cat.route) {
                const { router } = require('expo-router');
                router.push(cat.route);
              }
            }}>
              <View style={styles.iconContainer}>
                <Image source={{ uri: cat.icon }} style={styles.icon} />
              </View>
              <Text style={styles.name} numberOfLines={2}>{cat.name}</Text>
            </BouncyButton>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h2,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.sm,
  },
  categoryCard: {
    alignItems: 'center',
    width: 80,
    marginHorizontal: theme.spacing.xs,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  icon: {
    width: 40,
    height: 40,
  },
  name: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import { Plus } from 'lucide-react-native';
import BouncyButton from './BouncyButton';

const TRENDING = [
  { id: '1', title: 'Farm Fresh Tomatoes', price: '₹45/kg', time: '10 MINS', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400&h=400' },
  { id: '2', title: 'Whole Wheat Bread', price: '₹40', time: '12 MINS', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400&h=400' },
  { id: '3', title: 'Amul Taaza Milk', price: '₹27', time: '8 MINS', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=400&h=400' },
];

export default function TrendingHighlights() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Trending Near You</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {TRENDING.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.time}</Text>
              </View>
            </View>
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <View style={styles.footer}>
                <Text style={styles.price}>{item.price}</Text>
                <BouncyButton style={styles.addButton} scaleTo={0.9}>
                  <Text style={styles.addText}>ADD</Text>
                </BouncyButton>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  card: {
    width: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: theme.colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  info: {
    padding: theme.spacing.sm,
  },
  title: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    height: 32,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round, // Pill shaped
  },
  addText: {
    color: theme.colors.textInverse,
    ...theme.typography.caption,
    fontWeight: '800',
  },
});

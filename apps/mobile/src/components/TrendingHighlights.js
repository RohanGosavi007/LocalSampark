import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import BouncyButton from './BouncyButton';

/**
 * "Trending Near You" strip on the resident dashboard.
 *
 * This shipped a hardcoded TRENDING array: "Farm Fresh Tomatoes ₹45/kg, 10
 * MINS", "Whole Wheat Bread ₹40, 12 MINS", "Amul Taaza Milk ₹27, 8 MINS". Three
 * invented products at invented prices, each with a delivery-time promise
 * nothing could keep, on the first screen a resident sees — and the ADD button
 * had no handler, so tapping it did nothing at all.
 *
 * There is no data source for this yet. Nothing in the backend ranks products by
 * popularity or proximity: products.popularity_score exists in the Prisma schema
 * but is never read, and there is no trending endpoint. Rather than keep the
 * fiction, the strip renders nothing until it is given real items.
 *
 * To light it up, add an endpoint that ranks shop_products for the caller's
 * region — ordering by recent order_items volume is the natural first cut — and
 * pass its rows in as `items`. Each needs: id, title, price, image, and a
 * delivery estimate only if one is actually computed for that shop.
 */
export default function TrendingHighlights({ items = [], onAdd }) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Trending Near You</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.imageContainer}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Text style={styles.imagePlaceholderText}>📦</Text>
                </View>
              )}
              {/* Only shown when a delivery estimate was actually supplied. */}
              {item.time ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.time}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <View style={styles.footer}>
                <Text style={styles.price}>{item.price}</Text>
                <BouncyButton
                  style={styles.addButton}
                  scaleTo={0.9}
                  onPress={() => onAdd?.(item)}
                  disabled={!onAdd}
                >
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
  container: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.text, marginBottom: 12, paddingHorizontal: 16 },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  card: { width: 150, backgroundColor: theme.colors.cardBg, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  imageContainer: { width: '100%', height: 110, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 28 },
  badge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(15,23,42,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  info: { padding: 10 },
  title: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8, minHeight: 34 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 14, fontWeight: '900', color: theme.colors.text },
  addButton: { minHeight: 32, minWidth: 52, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary },
  addText: { color: theme.colors.primary, fontWeight: '900', fontSize: 12 },
});

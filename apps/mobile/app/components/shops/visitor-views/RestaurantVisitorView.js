import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { Leaf, Flame } from 'lucide-react-native';

export default function RestaurantVisitorView({ shop, products = [] }) {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.indicatorContainer}>
        <View style={[styles.indicatorBox, item.is_veg ? styles.vegBox : styles.nonVegBox]}>
          <View style={[styles.indicatorCircle, item.is_veg ? styles.vegCircle : styles.nonVegCircle]} />
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {item.is_bestseller === 1 && <Text style={styles.bestseller}>Bestseller</Text>}
          {item.is_spicy === 1 && <Flame size={14} color="#ef4444" />}
        </View>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.price}>₹{item.price}</Text>
      </View>

      <View style={styles.imageContainer}>
        {item.image_url ? (
          <Image source={item.image_url } style={styles.image}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderEmoji}>{item.is_veg ? '🥗' : '🍖'}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>ADD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Menu ({products.length})</Text>
      {products.length > 0 ? (
        <FlashList estimatedItemSize={100}
          data={products}
          keyExtractor={(p, i) => p.id ? p.id.toString() : i.toString()}
          renderItem={renderItem}
          scrollEnabled={false} // Since it is inside a ScrollView in ShopDetailScreen
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Menu coming soon!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  indicatorContainer: { marginRight: 12, marginTop: 4 },
  indicatorBox: { width: 14, height: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 2 },
  indicatorCircle: { width: 6, height: 6, borderRadius: 3 },
  vegBox: { borderColor: '#22c55e' }, vegCircle: { backgroundColor: '#22c55e' },
  nonVegBox: { borderColor: '#ef4444' }, nonVegCircle: { backgroundColor: '#ef4444' },
  infoContainer: { flex: 1, marginRight: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  bestseller: { fontSize: 10, color: '#d97706', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold' },
  desc: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  price: { fontSize: 15, fontWeight: '900', color: '#f97316' },
  imageContainer: { width: 90, height: 90, position: 'relative' },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  placeholderImage: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  placeholderEmoji: { fontSize: 32 },
  addBtn: {
    position: 'absolute', bottom: -10, alignSelf: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f97316',
    paddingHorizontal: 20, paddingVertical: 6, borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
  },
  addBtnText: { color: '#f97316', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { padding: 32, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  emptyText: { color: '#9ca3af' }
});

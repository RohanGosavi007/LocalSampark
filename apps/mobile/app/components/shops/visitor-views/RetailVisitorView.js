import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ShoppingBag } from 'lucide-react-native';

export default function RetailVisitorView({ shop, products = [] }) {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {item.image_url ? (
          <Image source={item.image_url } style={styles.image}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={styles.placeholderImage}>
            <ShoppingBag size={24} color="#9ca3af" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.price}>₹{item.price}</Text>
        {item.category && <Text style={styles.category}>{item.category}</Text>}
      </View>
      <TouchableOpacity style={styles.addBtn}>
        <Text style={styles.addBtnText}>ADD</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Products ({products.length})</Text>
      {products.length > 0 ? (
        <View style={styles.gridContainer}>
          {products.map((p, i) => (
            <View key={p.id || i} style={styles.gridItemWrapper}>
              {renderItem({ item: p })}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products available.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItemWrapper: { width: '48%', marginBottom: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    overflow: 'hidden', paddingBottom: 12
  },
  imageContainer: { width: '100%', height: 120, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  image: { width: '100%', height: '100%' },
  placeholderImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  info: { padding: 12 },
  name: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 4, height: 36 },
  price: { fontSize: 15, fontWeight: '900', color: '#4f46e5', marginBottom: 2 },
  category: { fontSize: 10, color: '#6b7280' },
  addBtn: {
    marginHorizontal: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
    paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 4
  },
  addBtnText: { color: '#2563eb', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { padding: 32, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  emptyText: { color: '#9ca3af' }
});

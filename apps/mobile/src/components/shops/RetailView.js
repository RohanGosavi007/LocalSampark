import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Store, Tag, Package, ShoppingBag } from 'lucide-react-native';

export default function RetailView({ shop, products = [] }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Store size={24} color="#0f172a" />
          <Text style={styles.heroTitle}>Premium Retail</Text>
        </View>
        <Text style={styles.heroDesc}>Explore our extensive collection of quality products.</Text>
      </View>

      <Text style={styles.sectionHeader}>Our Collection</Text>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Package size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No products added yet.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.imagePlaceholder}>
                <ShoppingBag size={32} color="#e2e8f0" />
              </View>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
                {item.mrpPaise > item.pricePaise && (
                  <Text style={styles.mrpText}>₹{(item.mrpPaise / 100).toFixed(2)}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>ADD TO CART</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  heroCard: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  heroDesc: { fontSize: 13, color: '#64748b' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#0f172a', margin: 16 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15 },
  row: { justifyContent: 'space-between', paddingHorizontal: 16 },
  productCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  imagePlaceholder: { backgroundColor: '#f8fafc', height: 100, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  productName: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 6, height: 36 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  productPrice: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  mrpText: { fontSize: 11, color: '#94a3b8', textDecorationLine: 'line-through' },
  addButton: { backgroundColor: '#0f172a', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

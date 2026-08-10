import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Leaf, Clock, Package } from 'lucide-react-native';

export default function FreshProduceView({ shop, products = [] }) {
  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        <View style={styles.badgeCard}>
          <Leaf size={24} color="#10b981" />
          <Text style={styles.badgeTitle}>Farm Fresh</Text>
          <Text style={styles.badgeSub}>Harvested Today</Text>
        </View>
        <View style={styles.badgeCard}>
          <Clock size={24} color="#f59e0b" />
          <Text style={styles.badgeTitle}>Fast Delivery</Text>
          <Text style={styles.badgeSub}>Under 30 mins</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vegetables & Fruits</Text>
      </View>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Package size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No products added yet</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'} / {item.unit || 'kg'}</Text>
              </View>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>ADD</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  badgeCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  badgeTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 8, marginBottom: 4 },
  badgeSub: { fontSize: 12, color: '#64748b' },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#64748b', fontSize: 16 },
  productCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  addButton: { backgroundColor: '#10b981', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 16 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

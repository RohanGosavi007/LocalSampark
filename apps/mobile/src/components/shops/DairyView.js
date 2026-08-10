import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Droplet, Sunrise, Package } from 'lucide-react-native';

export default function DairyView({ shop, products = [] }) {
  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
            <Sunrise size={24} color="#3b82f6" />
          </View>
          <Text style={styles.actionTitle}>Morning Delivery</Text>
          <Text style={styles.actionSub}>Before 7:00 AM</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
            <Droplet size={24} color="#10b981" />
          </View>
          <Text style={styles.actionTitle}>Subscribe Daily</Text>
          <Text style={styles.actionSub}>Milk & Bread</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dairy Products</Text>
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
                <Text style={styles.productPrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
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
  actionCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  actionSub: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#64748b', fontSize: 16 },
  productCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
  addButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#3b82f6', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 16 },
  addButtonText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Scissors, Flame, Package } from 'lucide-react-native';

export default function MeatView({ shop, products = [] }) {
  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        <View style={styles.infoCard}>
          <Scissors size={20} color="#ef4444" />
          <Text style={styles.infoText}>Custom Cuts Available</Text>
        </View>
        <View style={styles.infoCard}>
          <Flame size={20} color="#f97316" />
          <Text style={styles.infoText}>Cleaned & Prepared</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fresh Meat & Seafood</Text>
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
                <Text style={styles.cutHint}>Select cut preferences after adding</Text>
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
  infoCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, gap: 8 },
  infoText: { fontSize: 12, fontWeight: '600', color: '#991b1b', flex: 1 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#64748b', fontSize: 16 },
  productCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#ef4444', marginBottom: 4 },
  cutHint: { fontSize: 11, color: '#64748b' },
  addButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 16 },
  addButtonText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
});

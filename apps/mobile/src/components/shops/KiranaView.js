import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { ShoppingCart, ListChecks, ArrowRight, Package } from 'lucide-react-native';
import { Image } from 'expo-image';

export default function KiranaView({ shop, products = [] }) {
  return (
    <View style={styles.container}>
      {/* Category Specific Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <ListChecks size={24} color="#f59e0b" />
          </View>
          <Text style={styles.actionTitle}>Monthly Ration</Text>
          <Text style={styles.actionSub}>Upload list or scan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <ShoppingCart size={24} color="#3b82f6" />
          </View>
          <Text style={styles.actionTitle}>Quick Reorder</Text>
          <Text style={styles.actionSub}>From past orders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Groceries</Text>
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
                {item.stockQuantity > 0 ? (
                  <Text style={styles.inStock}>In Stock</Text>
                ) : (
                  <Text style={styles.outOfStock}>Out of Stock</Text>
                )}
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
  container: {
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  inStock: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  outOfStock: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 14,
  },
});

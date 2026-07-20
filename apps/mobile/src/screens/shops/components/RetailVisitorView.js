import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../../store/cartStore';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

export default function RetailVisitorView({ shop, products = [], loading = false }) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAdd = (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem({
      id: product.id || product._id || Math.random().toString(),
      shop_id: shop?.id,
      shop_name: shop?.name,
      shop_category: 'retail',
      name: product.name,
      price: product.price,
    }, 1, { unit: '1 pc' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 16 }}>
           <SkeletonLoader height={60} width="100%" style={{ marginBottom: 20 }} />
           <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'}}>
             {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} height={180} width="48%" style={{ marginBottom: 15 }} borderRadius={16} />)}
           </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{shop?.name || 'Supermarket'}</Text>
        <Text style={styles.subtitle}>Retail & Groceries</Text>
      </View>
      
      <View style={styles.gridContainer}>
        {(products.length > 0 ? products : [
          { name: 'Aashirvaad Atta', price: 250, weight: '5kg' },
          { name: 'Tata Salt', price: 25, weight: '1kg' },
          { name: 'Amul Butter', price: 260, weight: '500g' }
        ]).map((item, idx) => (
          <View key={idx} style={styles.productCard}>
            <View style={styles.productImagePlaceholder} />
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.itemWeight}>{item.weight || '1 pc'}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => handleAdd(item)}>
                <Text style={styles.addText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  gridContainer: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: { 
    width: '48%', 
    backgroundColor: '#ffffff', 
    padding: 12, 
    borderRadius: 16, 
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 
  },
  productImagePlaceholder: { width: '100%', height: 100, backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 12 },
  itemName: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  itemWeight: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#00E676' },
  addButton: { 
    backgroundColor: '#00E676', 
    width: 32, height: 32, 
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center'
  },
  addText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18, marginTop: -2 }
});

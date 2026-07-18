import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';

const MOCK_PRODUCTS = [
  { id: 1, name: 'Amul Taaza Homogenised Milk (1L)', price: '₹68', oldPrice: '₹72', inStock: true, image: '🥛' },
  { id: 2, name: 'Ashirvaad Shudh Chakki Atta (5kg)', price: '₹240', oldPrice: '₹260', inStock: true, image: '🌾' },
  { id: 3, name: 'Surf Excel Matic Liquid (1kg)', price: '₹210', oldPrice: '₹225', inStock: false, image: '🧴' },
];

export default function RetailVisitorView({ shop }) {
  const [cart, setCart] = useState([]);
  
  const handleCheckout = () => {
    router.push('/modules/checkout');
  };

  return (
    <VisitorLayout 
      shopName={shop.name || 'Sharma Grocery'} 
      shopAddress="Block A, Dhanori Market, Pune"
      shopIcon="🏪"
      cartCount={cart.length}
      onCheckout={handleCheckout}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Store Items</Text>
        {MOCK_PRODUCTS.map(prod => (
          <View key={prod.id} style={styles.productCard}>
            <View style={styles.prodImgBox}><Text style={{fontSize: 32}}>{prod.image}</Text></View>
            <View style={styles.prodInfo}>
              <Text style={styles.prodName} numberOfLines={2}>{prod.name}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                <Text style={styles.prodPrice}>{prod.price}</Text>
                <Text style={styles.prodOldPrice}>{prod.oldPrice}</Text>
              </View>
              {!prod.inStock && <Text style={styles.outOfStock}>Out of Stock</Text>}
            </View>
            <TouchableOpacity 
              style={[styles.addBtn, !prod.inStock && styles.addBtnDisabled]}
              disabled={!prod.inStock}
              onPress={() => setCart([...cart, prod])}
            >
              <Text style={styles.addBtnText}>+ ADD</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  prodImgBox: { width: 60, height: 60, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  prodInfo: { flex: 1 },
  prodName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  prodPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginRight: 8 },
  prodOldPrice: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
  outOfStock: { fontSize: 11, color: '#ef4444', fontWeight: 'bold' },
  addBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnDisabled: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  addBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
});

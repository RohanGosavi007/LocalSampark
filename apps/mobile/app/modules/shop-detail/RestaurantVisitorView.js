import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';
import { Ionicons } from '@expo/vector-icons';

const MOCK_MENU = [
  { id: 1, name: 'Paneer Butter Masala', desc: 'Rich & creamy curry', price: '₹220', type: 'veg', image: '🍲' },
  { id: 2, name: 'Chicken Biryani', desc: 'Aromatic basmati rice with chicken', price: '₹280', type: 'non-veg', image: '🍗' },
  { id: 3, name: 'Garlic Naan', desc: 'Freshly baked', price: '₹45', type: 'veg', image: '🫓' },
];

export default function RestaurantVisitorView({ shop }) {
  const [cart, setCart] = useState([]);
  
  return (
    <VisitorLayout 
      shopName={shop.name || 'Spice Route'} 
      shopAddress="FC Road, Pune"
      shopIcon="🍽️"
      cartCount={cart.length}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>
        
        {/* Book Dine-in Action */}
        <TouchableOpacity style={styles.dineInBox} onPress={() => router.push('/modules/dine-in')}>
          <View style={styles.dineInIconBg}>
            <Ionicons name="restaurant" size={24} color="#ea580c" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dineInTitle}>Book a Table</Text>
            <Text style={styles.dineInSub}>Reserve your spot for dine-in.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Digital Menu</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={[styles.menuCat, styles.menuCatActive]}><Text style={styles.menuCatTextActive}>All</Text></View>
          <View style={styles.menuCat}><Text style={styles.menuCatText}>Starters</Text></View>
          <View style={styles.menuCat}><Text style={styles.menuCatText}>Mains</Text></View>
          <View style={styles.menuCat}><Text style={styles.menuCatText}>Breads</Text></View>
        </ScrollView>

        {MOCK_MENU.map(item => (
          <View key={item.id} style={styles.productCard}>
            <View style={styles.prodImgBox}><Text style={{fontSize: 32}}>{item.image}</Text></View>
            <View style={styles.prodInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <View style={[styles.vegBadge, { borderColor: item.type === 'veg' ? '#16a34a' : '#dc2626' }]}>
                  <View style={[styles.vegDot, { backgroundColor: item.type === 'veg' ? '#16a34a' : '#dc2626' }]} />
                </View>
                <Text style={styles.prodName}>{item.name}</Text>
              </View>
              <Text style={styles.prodDesc}>{item.desc}</Text>
              <Text style={styles.prodPrice}>{item.price}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setCart([...cart, item])}>
              <Text style={styles.addBtnText}>+ ADD</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  dineInBox: { flexDirection: 'row', backgroundColor: '#fff7ed', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#fed7aa' },
  dineInIconBg: { backgroundColor: '#fff', padding: 10, borderRadius: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  dineInTitle: { fontSize: 16, fontWeight: 'bold', color: '#9a3412', marginBottom: 4 },
  dineInSub: { fontSize: 12, color: '#ea580c' },
  
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  
  menuCat: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  menuCatActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  menuCatText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  menuCatTextActive: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  
  productCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  prodImgBox: { width: 60, height: 60, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  prodInfo: { flex: 1 },
  vegBadge: { width: 12, height: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  prodName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  prodDesc: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  prodPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  addBtn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#ea580c', fontWeight: 'bold', fontSize: 12 },
});

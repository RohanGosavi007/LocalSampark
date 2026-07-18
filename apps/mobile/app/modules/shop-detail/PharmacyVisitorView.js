import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';
import { Ionicons } from '@expo/vector-icons';

const MOCK_MEDS = [
  { id: 1, name: 'Dolo 650 Tablet', desc: '15 tablets in 1 strip', price: '₹30', image: '💊' },
  { id: 2, name: 'Vicks Vaporub (50g)', desc: 'Relief from cough & cold', price: '₹145', image: '🧴' },
];

export default function PharmacyVisitorView({ shop }) {
  const [cart, setCart] = useState([]);
  
  return (
    <VisitorLayout 
      shopName={shop.name || 'Apollo Pharmacy'} 
      shopAddress="Main Road, Viman Nagar"
      shopIcon="⚕️"
      cartCount={cart.length}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>
        
        {/* Upload Prescription */}
        <TouchableOpacity style={styles.uploadBox} onPress={() => router.push('/modules/pharmacy')}>
          <View style={styles.uploadIconBg}>
            <Ionicons name="document-text" size={24} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadTitle}>Order with Prescription</Text>
            <Text style={styles.uploadSub}>Upload image and we will arrange the medicines.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Frequently Ordered</Text>
        {MOCK_MEDS.map(prod => (
          <View key={prod.id} style={styles.productCard}>
            <View style={styles.prodImgBox}><Text style={{fontSize: 32}}>{prod.image}</Text></View>
            <View style={styles.prodInfo}>
              <Text style={styles.prodName}>{prod.name}</Text>
              <Text style={styles.prodDesc}>{prod.desc}</Text>
              <Text style={styles.prodPrice}>{prod.price}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => setCart([...cart, prod])}>
              <Text style={styles.addBtnText}>+ ADD</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  uploadBox: { flexDirection: 'row', backgroundColor: '#ecfdf5', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#a7f3d0' },
  uploadIconBg: { backgroundColor: '#fff', padding: 10, borderRadius: 12, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  uploadTitle: { fontSize: 16, fontWeight: 'bold', color: '#065f46', marginBottom: 4 },
  uploadSub: { fontSize: 12, color: '#10b981' },
  
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  prodImgBox: { width: 60, height: 60, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  prodInfo: { flex: 1 },
  prodName: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  prodDesc: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  prodPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  addBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
});

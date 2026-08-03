import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity , StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../../store/cartStore';
import SkeletonLoader from '../../../components/ui/SkeletonLoader';
import { ShoppingBag, Plus } from 'lucide-react-native';

export default function RetailVisitorView({ shop, products = [], loading = false }) {
  const addItem = useCartStore((state) => state.addItem);
  const [productList, setProductList] = useState([]);

  useEffect(() => {
    if (products && products.length > 0) {
      setProductList(products);
    } else {
      setProductList([
        { id: 'p1', name: 'Aashirvaad Atta', price: 250, weight: '5kg', stock_quantity: 10 },
        { id: 'p2', name: 'Tata Salt', price: 25, weight: '1kg', stock_quantity: 0 },
        { id: 'p3', name: 'Amul Butter', price: 260, weight: '500g', stock_quantity: 5 }
      ]);
    }
  }, [products]);

  const handleAdd = (product) => {
    if (product.stock_quantity === 0) return;
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
      <View style={s.s0}>
         <SkeletonLoader height={60} width="100%" style={{ marginBottom: 20 }} borderRadius={16} />
         <View style={s.s1}>
           {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} height={180} width="48%" style={{ marginBottom: 15 }} borderRadius={20} />)}
         </View>
      </View>
    );
  }

  return (
    <ScrollView style={s.s2}>
      <View style={s.s3}>
        <Text style={s.s4}>{shop?.name || 'Supermarket'}</Text>
        <Text style={s.s5}>Retail & Groceries • Real-time Sync Active</Text>
      </View>
      
      <View style={s.s6}>
        {productList.map((item, idx) => {
          const isOutOfStock = item.stock_quantity === 0;
          return (
            <View key={item.id || idx} style={[s.s15, isOutOfStock && s.s16]}>
              <View style={s.s7}>
                <ShoppingBag size={32} color="#475569" />
              </View>
              <Text style={s.s8} numberOfLines={2}>{item.name}</Text>
              <Text style={s.s9}>{item.weight || '1 pc'}</Text>
              <View style={s.s10}>
                <Text style={s.s11}>₹{item.price}</Text>
                {isOutOfStock ? (
                  <View style={s.s12}>
                    <Text style={s.s13}>SOLD OUT</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={s.s14} onPress={() => handleAdd(item)}>
                    <Plus size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617', padding: 16 },
  s1: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  s2: { flex: 1, backgroundColor: '#020617' },
  s3: { padding: 20, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b' },
  s4: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  s5: { color: '#94a3b8', fontWeight: '600', fontSize: 12, marginTop: 4 },
  s6: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  s7: { width: '100%', height: 96, backgroundColor: '#020617', borderWidth: 1, borderColor: 'rgba(30,41,59,0.8)', borderRadius: 12, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  s8: { fontWeight: '700', fontSize: 14, color: '#ffffff', marginBottom: 4 },
  s9: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginBottom: 12 },
  s10: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  s11: { fontWeight: '900', color: '#34d399', fontSize: 16 },
  s12: { backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  s13: { color: '#f87171', fontSize: 10, fontWeight: '900' },
  s14: { backgroundColor: '#059669', width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  s15: { width: '48%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 12, borderRadius: 16, marginBottom: 16 },
  s16: { opacity: 0.5 },
});

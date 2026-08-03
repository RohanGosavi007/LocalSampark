import { Image } from 'expo-image';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity , StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../../store/cartStore';
import SkeletonLoader from '../../../components/ui/SkeletonLoader';
import { Utensils, Plus, Clock } from 'lucide-react-native';

export default function FoodVisitorView({ shop, products = [], loading = false }) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAdd = (product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem({
      id: product.id || product._id || Math.random().toString(),
      shop_id: shop?.id,
      shop_name: shop?.name,
      shop_category: 'food',
      name: product.name,
      price: product.price,
    }, 1, { modifier: 'regular' });
  };

  if (loading) {
    return (
      <View style={s.s0}>
        <SkeletonLoader height={200} width="100%" />
        <View style={s.s1}>
           <SkeletonLoader height={40} width={200} style={{ marginBottom: 20 }} borderRadius={12} />
           {[1, 2, 3].map(i => <SkeletonLoader key={i} height={100} width="100%" style={{ marginBottom: 15 }} borderRadius={16} />)}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={s.s2}>
      <View style={s.s3}>
        {shop?.cover_image ? (
          <Image source={shop.cover_image} style={s.s4} contentFit="cover" transition={200} />
        ) : (
          <View style={s.s5}>
            <Utensils size={48} color="#f97316" />
          </View>
        )}
      </View>
      <View style={s.s6}>
        <Text style={s.s7}>{shop?.name || 'Restaurant'}</Text>
        <Text style={s.s8}>Food & Beverages • {shop?.delivery_time || '15-20 mins'}</Text>
      </View>
      
      <View style={s.s9}>
        <Text style={s.s10}>Recommended</Text>
        {products.length > 0 ? (
          products.map((item, idx) => (
            <View key={idx} style={s.s11}>
              <View style={s.s12}>
                <Text style={s.s13}>{item.name}</Text>
                <Text style={s.s14}>₹{item.price}</Text>
                <Text style={s.s15} numberOfLines={2}>{item.description}</Text>
              </View>
              <TouchableOpacity style={s.s16} onPress={() => handleAdd(item)}>
                <Plus size={14} color="#fff" />
                <Text style={s.s17}>ADD</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          [1, 2, 3].map((item) => (
            <View key={item} style={s.s18}>
              <View style={s.s19}>
                <Text style={s.s20}>Margherita Pizza</Text>
                <Text style={s.s21}>₹250</Text>
                <Text style={s.s22} numberOfLines={2}>Classic cheese and tomato pizza with basil.</Text>
              </View>
              <TouchableOpacity style={s.s23} onPress={() => handleAdd({ name: 'Margherita Pizza', price: 250 })}>
                <Plus size={14} color="#fff" />
                <Text style={s.s24}>ADD</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { padding: 16 },
  s2: { flex: 1, backgroundColor: '#020617' },
  s3: { height: 192, width: '100%', backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  s4: { width: '100%', height: '100%' },
  s5: { width: '100%', height: '100%', backgroundColor: 'rgba(249,115,22,0.2)', justifyContent: 'center', alignItems: 'center' },
  s6: { padding: 20, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b', marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  s7: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  s8: { color: '#94a3b8', fontWeight: '600', fontSize: 12, marginTop: 4 },
  s9: { padding: 16 },
  s10: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s11: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s12: { flex: 1, marginRight: 12 },
  s13: { fontWeight: '700', color: '#ffffff', fontSize: 16, marginBottom: 4 },
  s14: { color: '#fb923c', fontWeight: '900', fontSize: 14, marginBottom: 4 },
  s15: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  s16: { backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  s17: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  s18: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s19: { flex: 1, marginRight: 12 },
  s20: { fontWeight: '700', color: '#ffffff', fontSize: 16, marginBottom: 4 },
  s21: { color: '#fb923c', fontWeight: '900', fontSize: 14, marginBottom: 4 },
  s22: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  s23: { backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  s24: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});

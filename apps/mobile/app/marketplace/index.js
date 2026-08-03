import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput , StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, ShoppingCart, Store, Star, Plus, Minus } from 'lucide-react-native';
import { useCartStore } from '../../src/store/cartStore';
import { useAllProducts } from '../../src/hooks/useProducts';

export default function NativeMarketplaceScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const cartItems = useCartStore(state => state.items);
  const addToCart = useCartStore(state => state.addItem);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const cartItemCount = useCartStore(state => state.getItemCount());
  
  const categories = ['All', 'Groceries', 'Electronics', 'Fashion', 'Pharmacy', 'Services'];

  const { data: productsData, isLoading } = useAllProducts();
  
  // Use data from React Query or fallback to mock if empty
  const rawProducts = Array.isArray(productsData?.data) ? productsData.data : (Array.isArray(productsData?.items) ? productsData.items : (Array.isArray(productsData) ? productsData : []));
  
  const products = rawProducts.length > 0 ? rawProducts : [
    { id: '1', name: 'Farm Fresh Milk (1L)', price: 65, category: 'Groceries', shop_name: 'Dhanori Fresh', shop_id: 'shop_1', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=200&q=80', rating: 4.8 },
    { id: '2', name: 'Whole Wheat Bread', price: 45, category: 'Groceries', shop_name: 'Dhanori Fresh', shop_id: 'shop_1', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80', rating: 4.5 },
    { id: '3', name: 'Paracetamol 500mg', price: 30, category: 'Pharmacy', shop_name: 'City Medico', shop_id: 'shop_2', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80', rating: 4.9 },
    { id: '4', name: 'Wireless Earbuds', price: 1299, category: 'Electronics', shop_name: 'TechHub', shop_id: 'shop_3', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=200&q=80', rating: 4.2 }
  ];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.shop_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const getCartQuantity = (productId) => {
    const item = cartItems.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const renderProductCard = ({ item }) => {
    const qty = getCartQuantity(item.id);

    return (
      <View style={s.s0}>
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/200' }} 
          style={s.s1}
          contentFit="cover"
        />
        <View style={s.s2}>
          <View style={s.s3}>
            <Text style={s.s4} numberOfLines={2}>{item.name}</Text>
            <View style={s.s5}>
              <Star size={10} color="#eab308" style={{ marginRight: 4 }} />
              <Text style={s.s6}>{item.rating || '4.0'}</Text>
            </View>
          </View>
          
          <View style={s.s7}>
            <Store size={12} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={s.s8} numberOfLines={1}>{item.shop_name}</Text>
          </View>
          
          <View style={s.s9}>
            <Text style={s.s10}>?{item.price}</Text>
            
            {qty === 0 ? (
              <TouchableOpacity 
                onPress={() => addToCart(item, 1)}
                style={s.s11}
              >
                <Text style={s.s12}>Add</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.s13}>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, qty - 1)}
                  style={s.s14}
                >
                  <Minus color="#fff" size={16} />
                </TouchableOpacity>
                <Text style={s.s15}>{qty}</Text>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, qty + 1)}
                  style={s.s16}
                >
                  <Plus color="#fff" size={16} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.s17}>
      <View style={s.s18}>
        <TouchableOpacity onPress={() => router.back()} style={s.s19}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s20}>Marketplace</Text>
        <TouchableOpacity 
          onPress={() => router.push('/cart')}
          style={s.s21}
        >
          <ShoppingCart color="#fff" size={24} />
          {cartItemCount > 0 && (
            <View style={s.s22}>
              <Text style={s.s23}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.s24}>
        <View style={s.s25}>
          <Search size={20} color="#64748b" />
          <TextInput
            placeholder="Search stores, items, groceries..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={s.s26}
          />
        </View>

        <FlashList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          estimatedItemSize={80}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => setSelectedCategory(item)}
              style={s.s27}
            >
              <Text style={s.s28}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={s.s29}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlashList
          data={filteredProducts}
          keyExtractor={item => item.id.toString()}
          renderItem={renderProductCard}
          numColumns={2}
          estimatedItemSize={250}
          contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, overflow: 'hidden', marginBottom: 16, flex: 1, marginHorizontal: 8 },
  s1: { width: '100%', height: 144, backgroundColor: '#1e293b' },
  s2: { padding: 16 },
  s3: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  s4: { color: '#ffffff', fontWeight: '700', fontSize: 18, flex: 1, marginRight: 8 },
  s5: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(234,179,8,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(234,179,8,0.2)' },
  s6: { color: '#facc15', fontSize: 12, fontWeight: '700' },
  s7: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  s8: { color: '#94a3b8', fontSize: 12 },
  s9: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  s10: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  s11: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  s12: { color: '#ffffff', fontWeight: '700' },
  s13: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 4 },
  s14: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155', borderRadius: 8 },
  s15: { color: '#ffffff', fontWeight: '700', marginHorizontal: 12, width: 16, textAlign: 'center' },
  s16: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderRadius: 8 },
  s17: { flex: 1, backgroundColor: '#020617' },
  s18: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a' },
  s19: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s20: { color: '#ffffff', fontSize: 20, fontWeight: '900', flex: 1 },
  s21: { padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999, position: 'relative' },
  s22: { position: 'absolute', top: -4, right: -4, backgroundColor: '#3b82f6', width: 20, height: 20, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#020617' },
  s23: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  s24: { paddingHorizontal: 16, paddingVertical: 16 },
  s25: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  s26: { flex: 1, color: '#ffffff', marginLeft: 12, fontSize: 16 },
  s27: { marginRight: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  s28: { fontWeight: '700' },
  s29: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

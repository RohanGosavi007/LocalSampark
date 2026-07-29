import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput } from 'react-native';
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
      <View className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden mb-4 shadow-lg shadow-black/20 flex-1 mx-2">
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/200' }} 
          className="w-full h-36 bg-slate-800"
          contentFit="cover"
        />
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-white font-bold text-lg flex-1 mr-2" numberOfLines={2}>{item.name}</Text>
            <View className="flex-row items-center bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">
              <Star size={10} color="#eab308" style={{ marginRight: 4 }} />
              <Text className="text-yellow-400 text-xs font-bold">{item.rating || '4.0'}</Text>
            </View>
          </View>
          
          <View className="flex-row items-center mb-3">
            <Store size={12} color="#64748b" style={{ marginRight: 4 }} />
            <Text className="text-slate-400 text-xs" numberOfLines={1}>{item.shop_name}</Text>
          </View>
          
          <View className="flex-row justify-between items-end mt-2">
            <Text className="text-2xl font-black text-white">?{item.price}</Text>
            
            {qty === 0 ? (
              <TouchableOpacity 
                onPress={() => addToCart(item, 1)}
                className="bg-blue-600 px-4 py-2 rounded-xl shadow-lg shadow-blue-900"
              >
                <Text className="text-white font-bold">Add</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-row items-center bg-slate-800 rounded-xl border border-slate-700 p-1">
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, qty - 1)}
                  className="w-8 h-8 items-center justify-center bg-slate-700 rounded-lg"
                >
                  <Minus color="#fff" size={16} />
                </TouchableOpacity>
                <Text className="text-white font-bold mx-3 w-4 text-center">{qty}</Text>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, qty + 1)}
                  className="w-8 h-8 items-center justify-center bg-blue-600 rounded-lg"
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
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black flex-1">Marketplace</Text>
        <TouchableOpacity 
          onPress={() => router.push('/cart')}
          className="p-2 bg-slate-900 border border-slate-800 rounded-full relative"
        >
          <ShoppingCart color="#fff" size={24} />
          {cartItemCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-blue-500 w-5 h-5 rounded-full items-center justify-center border-2 border-slate-950">
              <Text className="text-white text-[10px] font-black">{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View className="px-4 py-4">
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 shadow-sm mb-4">
          <Search size={20} color="#64748b" />
          <TextInput
            placeholder="Search stores, items, groceries..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-white ml-3 text-base"
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
              className="mr-3 px-4 py-2 rounded-full border"
            >
              <Text className="font-bold">{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
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

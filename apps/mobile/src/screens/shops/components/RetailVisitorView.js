import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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
      <View className="flex-1 bg-slate-950 p-4">
         <SkeletonLoader height={60} width="100%" style={{ marginBottom: 20 }} borderRadius={16} />
         <View className="flex-row flex-wrap justify-between">
           {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} height={180} width="48%" style={{ marginBottom: 15 }} borderRadius={20} />)}
         </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-5 bg-slate-900 border-b border-slate-800">
        <Text className="text-2xl font-black text-white">{shop?.name || 'Supermarket'}</Text>
        <Text className="text-slate-400 font-semibold text-xs mt-1">Retail & Groceries • Real-time Sync Active</Text>
      </View>
      
      <View className="p-4 flex-row flex-wrap justify-between">
        {productList.map((item, idx) => {
          const isOutOfStock = item.stock_quantity === 0;
          return (
            <View key={item.id || idx} className={`w-[48%] bg-slate-900 border border-slate-800 p-3 rounded-2xl mb-4 ${isOutOfStock ? 'opacity-50' : ''}`}>
              <View className="w-full h-24 bg-slate-950 border border-slate-800/80 rounded-xl mb-3 items-center justify-center">
                <ShoppingBag size={32} color="#475569" />
              </View>
              <Text className="font-bold text-sm text-white mb-1" numberOfLines={2}>{item.name}</Text>
              <Text className="text-xs text-slate-400 font-medium mb-3">{item.weight || '1 pc'}</Text>
              <View className="flex-row justify-between items-center">
                <Text className="font-black text-emerald-400 text-base">₹{item.price}</Text>
                {isOutOfStock ? (
                  <View className="bg-red-500/20 border border-red-500/40 px-2 py-1 rounded-md">
                    <Text className="text-red-400 text-[10px] font-black">SOLD OUT</Text>
                  </View>
                ) : (
                  <TouchableOpacity className="bg-emerald-600 w-8 h-8 rounded-full items-center justify-center active:bg-emerald-500" onPress={() => handleAdd(item)}>
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

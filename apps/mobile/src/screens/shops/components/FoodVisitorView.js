import { Image } from 'expo-image';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '../../../store/cartStore';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
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
      <View className="flex-1 bg-slate-950">
        <SkeletonLoader height={200} width="100%" />
        <View className="p-4">
           <SkeletonLoader height={40} width={200} style={{ marginBottom: 20 }} borderRadius={12} />
           {[1, 2, 3].map(i => <SkeletonLoader key={i} height={100} width="100%" style={{ marginBottom: 15 }} borderRadius={16} />)}
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="h-48 w-full bg-slate-900 justify-center items-center">
        {shop?.cover_image ? (
          <Image source={shop.cover_image} className="w-full h-full" contentFit="cover" transition={200} />
        ) : (
          <View className="w-full h-full bg-orange-500/20 justify-center items-center">
            <Utensils size={48} color="#f97316" />
          </View>
        )}
      </View>
      <View className="p-5 bg-slate-900 border-b border-slate-800 -mt-5 rounded-t-3xl">
        <Text className="text-2xl font-black text-white">{shop?.name || 'Restaurant'}</Text>
        <Text className="text-slate-400 font-semibold text-xs mt-1">Food & Beverages • {shop?.delivery_time || '15-20 mins'}</Text>
      </View>
      
      <View className="p-4">
        <Text className="text-white font-bold text-lg mb-4">Recommended</Text>
        {products.length > 0 ? (
          products.map((item, idx) => (
            <View key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-bold text-white text-base mb-1">{item.name}</Text>
                <Text className="text-orange-400 font-black text-sm mb-1">₹{item.price}</Text>
                <Text className="text-slate-400 text-xs font-medium" numberOfLines={2}>{item.description}</Text>
              </View>
              <TouchableOpacity className="bg-orange-500 px-4 py-2 rounded-xl flex-row items-center active:bg-orange-400" onPress={() => handleAdd(item)}>
                <Plus size={14} color="#fff" className="mr-1" />
                <Text className="text-white font-black text-xs">ADD</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          [1, 2, 3].map((item) => (
            <View key={item} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-bold text-white text-base mb-1">Margherita Pizza</Text>
                <Text className="text-orange-400 font-black text-sm mb-1">₹250</Text>
                <Text className="text-slate-400 text-xs font-medium" numberOfLines={2}>Classic cheese and tomato pizza with basil.</Text>
              </View>
              <TouchableOpacity className="bg-orange-500 px-4 py-2 rounded-xl flex-row items-center active:bg-orange-400" onPress={() => handleAdd({ name: 'Margherita Pizza', price: 250 })}>
                <Plus size={14} color="#fff" className="mr-1" />
                <Text className="text-white font-black text-xs">ADD</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

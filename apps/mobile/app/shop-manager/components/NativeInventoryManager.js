import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { Package, Search, Edit2, Archive, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { apiGet } from '../../../src/lib/api';
import { useAppStore } from '../../../src/store/useAppStore';

export default function NativeInventoryManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { shopId } = useAppStore();

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (!shopId) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiGet(`/shops/${shopId}/products`);
      if (data && (Array.isArray(data) || Array.isArray(data.data) || Array.isArray(data.items))) {
        setProducts(data.data || data.items || data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const renderProductCard = ({ item }) => {
    const isOutOfStock = item.inventory_count <= 0 && item.track_inventory;
    const isActive = item.is_available !== false; // defaults to true

    return (
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mx-4 mb-4 flex-row items-center">
        {/* Thumbnail Placeholder or Image */}
        <View className="w-16 h-16 bg-slate-800 rounded-xl mr-4 overflow-hidden border border-slate-700 items-center justify-center">
          {item.image_url ? (
            <Image source={item.image_url } className="w-full h-full" resizeMode="cover"  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
          ) : (
            <Package size={24} color="#64748b" />
          )}
        </View>

        {/* Product Details */}
        <View className="flex-1">
          <Text className="text-white font-bold text-base mb-0.5" numberOfLines={1}>{item.name}</Text>
          <Text className="text-blue-400 font-black text-sm mb-1">₹{item.price || 0}</Text>
          
          <View className="flex-row items-center space-x-2">
            {/* Status Badge */}
            <View className={`flex-row items-center px-2 py-0.5 rounded-full mr-2 ${isActive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              {isActive ? <CheckCircle2 size={10} color="#34d399" style={{ marginRight: 4 }} /> : <AlertCircle size={10} color="#f87171" style={{ marginRight: 4 }} />}
              <Text className={`text-[10px] font-bold ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            {/* Stock Badge */}
            {item.track_inventory && (
              <View className={`px-2 py-0.5 rounded-full ${isOutOfStock ? 'bg-red-500/20 border border-red-500/30' : 'bg-slate-800 border border-slate-700'}`}>
                <Text className={`text-[10px] font-bold ${isOutOfStock ? 'text-red-400' : 'text-slate-400'}`}>
                  {isOutOfStock ? 'Out of Stock' : `${item.inventory_count} in stock`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions Menu */}
        <View className="items-end pl-2 space-y-2 flex-col gap-2">
          <TouchableOpacity className="p-2 bg-slate-800 rounded-lg border border-slate-700">
            <Edit2 size={16} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2 bg-slate-800 rounded-lg border border-slate-700">
            <Archive size={16} color={isActive ? '#94a3b8' : '#3b82f6'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!shopId && !loading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <AlertCircle size={48} color="#f59e0b" className="mb-4" />
        <Text className="text-white font-bold text-lg text-center">Shop ID Missing</Text>
        <Text className="text-slate-400 text-center mt-2">
          Unable to fetch inventory. Please ensure your shop dashboard is properly loaded.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Search Bar */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 shadow-sm">
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder="Search products by name..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-white ml-2 text-sm"
          />
        </View>
      </View>

      {/* Product List */}
      {loading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View className="items-center justify-center py-20 mx-4 border border-dashed border-slate-800 rounded-2xl">
          <Package size={48} color="#475569" className="mb-4" />
          <Text className="text-slate-500 font-bold text-lg">No products found</Text>
        </View>
      ) : (
        <FlashList estimatedItemSize={100}
          data={filteredProducts}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderProductCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} tintColor="#3b82f6" />
          }
        />
      )}
    </View>
  );
}

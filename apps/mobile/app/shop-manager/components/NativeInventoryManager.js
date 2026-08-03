import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput , StyleSheet } from 'react-native';
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
      <View style={s.s0}>
        {/* Thumbnail Placeholder or Image */}
        <View style={s.s1}>
          {item.image_url ? (
            <Image source={item.image_url } style={s.s2} resizeMode="cover"  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
          ) : (
            <Package size={24} color="#64748b" />
          )}
        </View>

        {/* Product Details */}
        <View style={s.s3}>
          <Text style={s.s4} numberOfLines={1}>{item.name}</Text>
          <Text style={s.s5}>₹{item.price || 0}</Text>
          
          <View style={s.s6}>
            {/* Status Badge */}
            <View style={[s.s20, isActive ? s.s21 : s.s22]}>
              {isActive ? <CheckCircle2 size={10} color="#34d399" style={{ marginRight: 4 }} /> : <AlertCircle size={10} color="#f87171" style={{ marginRight: 4 }} />}
              <Text style={[s.s23, isActive ? s.s24 : s.s25]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            {/* Stock Badge */}
            {item.track_inventory && (
              <View style={[s.s26, isOutOfStock ? s.s27 : s.s28]}>
                <Text style={[s.s29, isOutOfStock ? s.s30 : s.s31]}>
                  {isOutOfStock ? 'Out of Stock' : `${item.inventory_count} in stock`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions Menu */}
        <View style={s.s7}>
          <TouchableOpacity style={s.s8}>
            <Edit2 size={16} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={s.s9}>
            <Archive size={16} color={isActive ? '#94a3b8' : '#3b82f6'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!shopId && !loading) {
    return (
      <View style={s.s10}>
        <AlertCircle size={48} color="#f59e0b" />
        <Text style={s.s11}>Shop ID Missing</Text>
        <Text style={s.s12}>
          Unable to fetch inventory. Please ensure your shop dashboard is properly loaded.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.s13}>
      {/* Search Bar */}
      <View style={s.s14}>
        <View style={s.s15}>
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder="Search products by name..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={s.s16}
          />
        </View>
      </View>

      {/* Product List */}
      {loading ? (
        <View style={s.s17}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={s.s18}>
          <Package size={48} color="#475569" />
          <Text style={s.s19}>No products found</Text>
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

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  s1: { width: 64, height: 64, backgroundColor: '#1e293b', borderRadius: 12, marginRight: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  s2: { width: '100%', height: '100%' },
  s3: { flex: 1 },
  s4: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  s5: { color: '#60a5fa', fontWeight: '900', fontSize: 14, marginBottom: 4 },
  s6: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  s7: { alignItems: 'flex-end', paddingLeft: 8, gap: 8, flexDirection: 'column' },
  s8: { padding: 8, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  s9: { padding: 8, backgroundColor: '#1e293b', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  s10: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  s11: { color: '#ffffff', fontWeight: '700', fontSize: 18, textAlign: 'center' },
  s12: { color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  s13: { flex: 1 },
  s14: { paddingHorizontal: 16, marginBottom: 16 },
  s15: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  s16: { flex: 1, color: '#ffffff', marginLeft: 8, fontSize: 14 },
  s17: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  s18: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, marginHorizontal: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#1e293b', borderRadius: 16 },
  s19: { color: '#64748b', fontWeight: '700', fontSize: 18 },
  s20: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, marginRight: 8 },
  s21: { backgroundColor: 'rgba(16,185,129,0.2)' },
  s22: { backgroundColor: 'rgba(239,68,68,0.2)' },
  s23: { fontSize: 10, fontWeight: '700' },
  s24: { color: '#34d399' },
  s25: { color: '#f87171' },
  s26: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  s27: { backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  s28: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  s29: { fontSize: 10, fontWeight: '700' },
  s30: { color: '#f87171' },
  s31: { color: '#94a3b8' },
});

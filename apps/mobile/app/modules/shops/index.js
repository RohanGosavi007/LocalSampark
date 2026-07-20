import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Modal, useColorScheme, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useShops, useCategories } from '../../../src/hooks/useShops';

export default function ShopsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = {
    bg: isDark ? '#111827' : '#f9fafb',
    card: isDark ? '#1f2937' : '#ffffff',
    text: isDark ? '#f9fafb' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    primary: '#4f46e5',
    primaryHover: isDark ? '#4338ca' : '#6366f1',
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const [filterTopRated, setFilterTopRated] = useState(false);
  
  const { data: categoriesData } = useCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.rows || []);

  const { data: shopsData, isLoading } = useShops({ category: selectedCategory });
  const shops = shopsData?.shops || [];

  const categoryCounts = useMemo(() => {
    const counts = {};
    if (!selectedCategory) {
      shops.forEach(s => {
        counts[s.category_id] = (counts[s.category_id] || 0) + 1;
      });
    }
    return counts;
  }, [shops, selectedCategory]);

  const prioritySlugs = ['hospitals-clinics', '2-wheeler-garage', '4-wheeler-garage'];
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aPriority = prioritySlugs.indexOf(a.slug);
      const bPriority = prioritySlugs.indexOf(b.slug);
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      return 0;
    });
  }, [categories]);

  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const matchesSearch = (shop.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
      const matchesDelivery = filterDelivery ? shop.delivery_available === 1 : true;
      const matchesTopRated = filterTopRated ? (shop.rating >= 4.0) : true;
      return matchesSearch && matchesDelivery && matchesTopRated;
    });
  }, [shops, searchTerm, filterDelivery, filterTopRated]);

  const renderHeader = () => (
    <View style={{ padding: 16 }}>
      <View style={styles.bentoGrid}>
        <TouchableOpacity 
          style={[styles.bentoItem, { backgroundColor: selectedCategory === '' ? theme.primary : theme.card, borderColor: theme.border }]}
          onPress={() => setSelectedCategory('')}
        >
          <Text style={styles.bentoIcon}>??</Text>
          <Text style={[styles.bentoText, { color: selectedCategory === '' ? '#fff' : theme.text }]}>All</Text>
        </TouchableOpacity>
        
        {sortedCategories.slice(0, 10).map(cat => (
          <TouchableOpacity 
            key={cat.id}
            style={[styles.bentoItem, { backgroundColor: selectedCategory === cat.slug ? theme.primary : theme.card, borderColor: theme.border }]}
            onPress={() => setSelectedCategory(cat.slug)}
          >
            <Text style={styles.bentoIcon}>{cat.icon || '??'}</Text>
            <Text style={[styles.bentoText, { color: selectedCategory === cat.slug ? '#fff' : theme.text }]} numberOfLines={2}>{cat.name}</Text>
            {categoryCounts[cat.id] > 0 && (
                <View style={[styles.badge, { backgroundColor: selectedCategory === cat.slug ? '#fff' : theme.primary }]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: selectedCategory === cat.slug ? theme.primary : '#fff' }}>{categoryCounts[cat.id]}</Text>
                </View>
            )}
          </TouchableOpacity>
        ))}
        
        {sortedCategories.length > 10 && (
           <TouchableOpacity 
            style={[styles.bentoItem, styles.bentoItemWide, { backgroundColor: theme.card, borderColor: theme.primary, borderStyle: 'dashed' }]}
            onPress={() => setShowAllCategories(true)}
          >
            <Text style={styles.bentoIcon}>??</Text>
            <Text style={[styles.bentoText, { color: theme.text }]}>Explore All Categories</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Nearby Results</Text>
    </View>
  );

  const renderShopItem = ({ item: shop }) => {
    const shopCategory = categories.find(c => c.id === shop.category_id);
    const isRestaurant = shopCategory?.slug?.includes('restaurant') || shopCategory?.slug?.includes('food') || shopCategory?.slug?.includes('cafe');
    return (
      <TouchableOpacity style={[styles.masonryCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => router.push(/shops/ + shop.id)}>
        {shop.is_premium === 1 && <View style={styles.premiumBadge}><Text style={styles.premiumText}>? PRO</Text></View>}
        
        <View style={[styles.shopImageContainer, { backgroundColor: theme.bg }]}>
            {(() => {
              try {
                if (shop.photo_urls && shop.photo_urls !== '[]') {
                  const urls = JSON.parse(shop.photo_urls);
                  if (Array.isArray(urls) && urls.length > 0 && urls[0]) {
                    return <Image source={urls[0]} style={styles.shopImage} contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />;
                  }
                }
              } catch (e) {}
              return <Text style={{ fontSize: 40 }}>??</Text>;
            })()}
        </View>
        
        <View style={styles.shopInfo}>
            <Text style={[styles.shopName, { color: theme.text }]} numberOfLines={2}>{shop.name}</Text>
            <Text style={styles.shopDist}>?? {shop.distance_km || '0'} km</Text>
            {isRestaurant && (
              <TouchableOpacity 
                style={[styles.dineInBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]} 
                onPress={(e) => { e.stopPropagation(); router.push(/modules/dine-in?shopId= + shop.id); }}
              >
                <Text style={[styles.dineInText, { color: theme.primary }]}>??? Book Dine-in</Text>
              </TouchableOpacity>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Nearby Shops & Services</Text>
      </View>

      <View style={[styles.stickyFilterBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <TextInput 
            style={[styles.searchInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]} 
            placeholder="?? Search shops..." 
            placeholderTextColor={theme.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity onPress={() => setFilterOpen(!filterOpen)} style={[styles.filterPill, { borderColor: filterOpen ? theme.primary : theme.border, backgroundColor: filterOpen ? theme.primary : theme.card }]}>
                <Text style={{ color: filterOpen ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>?? Open Now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterDelivery(!filterDelivery)} style={[styles.filterPill, { borderColor: filterDelivery ? theme.primary : theme.border, backgroundColor: filterDelivery ? theme.primary : theme.card }]}>
                <Text style={{ color: filterDelivery ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>?? Delivery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilterTopRated(!filterTopRated)} style={[styles.filterPill, { borderColor: filterTopRated ? '#fbbf24' : theme.border, backgroundColor: filterTopRated ? '#fbbf24' : theme.card }]}>
                <Text style={{ color: filterTopRated ? '#000' : theme.text, fontSize: 12, fontWeight: '600' }}>? Top Rated</Text>
            </TouchableOpacity>
          </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : filteredShops.length === 0 ? (
          <>
            {renderHeader()}
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No shops found in this area.</Text>
          </>
        ) : (
          <FlashList
            data={filteredShops}
            renderItem={renderShopItem}
            estimatedItemSize={250}
            numColumns={2}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          />
        )}
      </View>

      <Modal visible={showAllCategories} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Explore All Categories</Text>
              <TouchableOpacity onPress={() => setShowAllCategories(false)}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlashList
              data={[{ id: 'all', name: 'All Shops', icon: '??', slug: '' }, ...categories]}
              numColumns={3}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              estimatedItemSize={100}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.gridCategoryItem, { backgroundColor: selectedCategory === item.slug ? theme.primary : theme.bg }]}
                  onPress={() => {
                    setSelectedCategory(item.slug);
                    setShowAllCategories(false);
                  }}
                >
                  <Text style={styles.gridCategoryIcon}>{item.icon || '??'}</Text>
                  <Text style={[styles.gridCategoryText, { color: selectedCategory === item.slug ? '#fff' : theme.text }]} numberOfLines={2}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  backButton: { padding: 4, marginRight: 12 },
  title: { fontSize: 18, fontWeight: 'bold' },
  stickyFilterBar: { padding: 16, borderBottomWidth: 1, zIndex: 10 },
  searchInput: { padding: 10, borderRadius: 8, borderWidth: 1, fontSize: 16 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24, justifyContent: 'space-between' },
  bentoItem: { width: '31%', padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center', position: 'relative' },
  bentoItemWide: { width: '66%', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  bentoIcon: { fontSize: 28, marginBottom: 6 },
  bentoText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  
  masonryCard: { flex: 1, margin: 8, borderRadius: 16, borderWidth: 1, padding: 8, position: 'relative' },
  shopImageContainer: { width: '100%', height: 100, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 },
  shopImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  shopInfo: { padding: 4 },
  shopName: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  shopDist: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  premiumBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#fbbf24', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, zIndex: 10 },
  premiumText: { color: '#000', fontSize: 9, fontWeight: 'bold' },
  
  dineInBtn: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  dineInText: { fontSize: 11, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', fontSize: 16, marginTop: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  gridCategoryItem: { width: '31%', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  gridCategoryIcon: { fontSize: 32, marginBottom: 8 },
  gridCategoryText: { fontSize: 12, fontWeight: '600', textAlign: 'center' }
});

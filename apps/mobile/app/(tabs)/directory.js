import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, FlatList, InteractionManager } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '../../src/context/AuthContext';
import { useZone } from '../../src/context/ZoneContext';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useShops, useCategories } from '../../src/hooks/useShops';

// Demo shops matching web data — shown as fallback when API returns empty
const DEMO_SHOPS = [
  { id: 'demo-1', name: 'Sharma Grocery & Dairy', category: 'Grocery & Supermarkets', category_name: 'Grocery & Supermarkets', rating: 4.8, distance: '0.5', has_delivery: true, type: 'product', address: 'Kalyani Nagar, Pune', description: 'Fresh vegetables, dairy products, and daily essentials.', approval_status: 'approved', is_demo: true },
  { id: 'demo-2', name: 'Apollo Pharmacy Plus', category: 'Pharmacy & Healthcare', category_name: 'Pharmacy & Healthcare', rating: 4.5, distance: '0.8', has_delivery: true, type: 'product', address: 'Viman Nagar, Pune', description: '24/7 medicines and healthcare products.', approval_status: 'approved', is_demo: true },
  { id: 'demo-3', name: 'QuickFix Garage & Auto', category: 'Automotive & Mechanic', category_name: 'Automotive & Mechanic', rating: 4.3, distance: '1.2', has_delivery: false, type: 'appointment', address: 'Dhanori, Pune', description: 'Expert car & bike repair services.', approval_status: 'approved', is_demo: true },
  { id: 'demo-4', name: 'Golden Crumb Bakery', category: 'Sweet Shops & Bakeries', category_name: 'Sweet Shops & Bakeries', rating: 4.7, distance: '0.3', has_delivery: true, type: 'product', address: 'Dhanori Main Road, Pune', description: 'Freshly baked cakes, pastries & breads.', approval_status: 'approved', is_demo: true },
  { id: 'demo-5', name: 'Glow & Glamour Salon', category: 'Salon, Beauty & Spa', category_name: 'Salon, Beauty & Spa', rating: 4.6, distance: '0.6', has_delivery: false, type: 'appointment', address: 'Lohegaon, Pune', description: 'Premium haircuts, facials & spa treatments.', approval_status: 'approved', is_demo: true },
  { id: 'demo-6', name: 'Sanjeevani Medical Store', category: 'Pharmacy & Healthcare', category_name: 'Pharmacy & Healthcare', rating: 4.4, distance: '1.0', has_delivery: true, type: 'product', address: 'Vishrantwadi, Pune', description: 'All medicines, surgical items & health supplements.', approval_status: 'approved', is_demo: true },
  { id: 'demo-7', name: 'Cafe Coffee Day', category: 'Restaurants & Cafes', category_name: 'Restaurants & Cafes', rating: 4.2, distance: '0.4', has_delivery: true, type: 'product', address: 'Dhanori Chowk, Pune', description: 'Premium coffee, snacks & beverages.', approval_status: 'approved', is_demo: true },
  { id: 'demo-8', name: 'Raj Electronics & Repair', category: 'Electricians & Electronics', category_name: 'Electricians & Electronics', rating: 4.1, distance: '1.5', has_delivery: false, type: 'hybrid', address: 'Lohegaon Road, Pune', description: 'TV, AC, fridge repair & electrical appliances.', approval_status: 'approved', is_demo: true },
  { id: 'demo-9', name: 'Fresh Veggie Mart', category: 'Vegetables & Fruits', category_name: 'Vegetables & Fruits', rating: 4.9, distance: '0.2', has_delivery: true, type: 'product', address: 'Dhanori Gaon, Pune', description: 'Farm-fresh organic vegetables & fruits daily.', approval_status: 'approved', is_demo: true },
  { id: 'demo-10', name: 'Patel Hardware & Sanitary', category: 'Hardware & Sanitary', category_name: 'Hardware & Sanitary', rating: 4.0, distance: '1.8', has_delivery: false, type: 'product', address: 'Vishrantwadi, Pune', description: 'Pipes, fittings, paints & construction material.', approval_status: 'approved', is_demo: true },
  { id: 'demo-11', name: 'Shree Ganesh Tiffin Service', category: 'Tiffin Services', category_name: 'Tiffin Services', rating: 4.5, distance: '0.7', has_delivery: true, type: 'product', address: 'Dhanori, Pune', description: 'Homestyle veg & non-veg meals delivered daily.', approval_status: 'approved', is_demo: true },
  { id: 'demo-12', name: 'FitZone Gym & Fitness', category: 'Gym & Fitness', category_name: 'Gym & Fitness', rating: 4.3, distance: '1.1', has_delivery: false, type: 'appointment', address: 'Lohegaon, Pune', description: 'Modern gym with personal trainers & group classes.', approval_status: 'approved', is_demo: true },
];

const FALLBACK_CATEGORIES = [
  { name: 'All Categories', icon: '🏪' },
  { name: 'Grocery & Supermarkets', icon: '🛒' },
  { name: 'Restaurants & Cafes', icon: '🍽️' },
  { name: 'Pharmacy & Healthcare', icon: '💊' },
  { name: 'Home Services & Plumbers', icon: '🔧' },
  { name: 'Salon, Beauty & Spa', icon: '✂️' },
  { name: 'Electricians & Electronics', icon: '🔌' },
  { name: 'Tutors & Education', icon: '📚' },
  { name: 'Hardware & Sanitary', icon: '🚰' },
  { name: 'Clothing & Fashion', icon: '👗' },
  { name: 'Gym & Fitness', icon: '🏋️' },
  { name: 'Real Estate & Brokers', icon: '🏢' },
  { name: 'Automotive & Mechanic', icon: '🚗' },
  { name: 'Pet Shops & Clinics', icon: '🐾' },
  { name: 'Stationery & Books', icon: '✏️' },
  { name: 'Sweet Shops & Bakeries', icon: '🧁' },
  { name: 'Vegetables & Fruits', icon: '🍎' },
  { name: 'Meat & Poultry', icon: '🥩' },
  { name: 'Dairy & Milk', icon: '🥛' },
  { name: 'Tailors & Boutiques', icon: '🧵' },
  { name: 'Pooja Samagri', icon: '🪔' },
  { name: 'Footwear', icon: '👟' },
  { name: 'Mobile Shops & Repair', icon: '📱' },
  { name: 'Computer & IT Services', icon: '💻' },
  { name: 'Furniture & Decor', icon: '🛋️' },
  { name: 'Opticals & Eyewear', icon: '👓' },
  { name: 'Jewellery & Watches', icon: '💍' },
  { name: 'Travel & Tours', icon: '✈️' },
  { name: 'Astrology & Vastu', icon: '🕉️' },
  { name: 'Event Planners & Decor', icon: '🎉' },
  { name: 'Photography & Studios', icon: '📸' },
  { name: 'Laundry & Dry Cleaning', icon: '🧺' },
  { name: 'Water Purifier Service', icon: '💧' },
  { name: 'Gas Agencies', icon: '🔥' },
  { name: 'Pest Control', icon: '🐜' },
  { name: 'Carpenters & Woodwork', icon: '🪚' },
  { name: 'Painters & Contractors', icon: '🖌️' },
  { name: 'Movers & Packers', icon: '🚚' },
  { name: 'Tiffin Services', icon: '🍱' },
  { name: 'Caterers', icon: '🥘' },
  { name: 'Bicycles & Accessories', icon: '🚲' },
  { name: 'Sports Goods', icon: '⚽' },
  { name: 'Musical Instruments', icon: '🎸' },
  { name: 'Toys & Games', icon: '🧸' },
  { name: 'Gift Shops', icon: '🎁' },
  { name: 'Florists & Plants', icon: '💐' },
  { name: 'Watches & Clocks', icon: '⌚' },
  { name: 'Bags & Luggage', icon: '🎒' },
  { name: 'Kitchenware & Utensils', icon: '🍳' },
  { name: 'Cosmetics & Perfumes', icon: '💄' },
  { name: 'Tyre Shops', icon: '🛞' },
  { name: 'Printers & Xerox', icon: '🖨️' },
  { name: 'Internet Cafes', icon: '🌐' },
  { name: 'Courier & Logistics', icon: '📦' },
  { name: 'Wedding Services', icon: '💒' },
  { name: 'Scrap Dealers', icon: '♻️' }
];

export default function DirectoryScreen() {
  const { API_URL } = useAuth();
  const { activeZone, switchZone } = useZone();
  const { category } = useLocalSearchParams();
  const [shops, setShops] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(category || 'All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('rating');
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (category) setSelectedCategory(category);
  }, [category]);

  // Request location on mount
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
        }
      } catch (e) { console.warn("Location error", e); }
    })();
  }, []);

  const [isInteractionReady, setIsInteractionReady] = useState(false);
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setIsInteractionReady(true);
    });
  }, []);

  const { data: shopsRes, isLoading: shopsLoading, isError: shopsError } = useShops({
    zoneId: activeZone?.id,
    category: selectedCategory === 'All Categories' ? undefined : selectedCategory,
    lat: userLocation?.lat,
    lng: userLocation?.lng
  });

  const { data: categoriesRes, isLoading: categoriesLoading } = useCategories();

  useEffect(() => {
    if (shopsRes) {
      const shopsData = Array.isArray(shopsRes) ? shopsRes : (shopsRes.data || shopsRes.shops || shopsRes.rows || []);
      if (shopsData.length > 0) {
        setShops(shopsData);
      } else {
        setShops(DEMO_SHOPS);
      }
    } else if (shopsError) {
      setShops(DEMO_SHOPS);
    }
  }, [shopsRes, shopsError]);

  useEffect(() => {
    if (categoriesRes) {
      const catsData = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.categories || []);
      if (catsData.length > 0) {
        const mergedCategories = [{ name: 'All Categories', icon: '🏪' }, ...catsData.map(c => {
          const fallback = FALLBACK_CATEGORIES.find(fc => fc.name === c.name || fc.name === c.title);
          return {
            name: c.name || c.title,
            icon: c.icon || fallback?.icon || '🏪',
            id: c.id,
            count: c.count || 0
          };
        })];
        setCategories(mergedCategories);
      }
    }
  }, [categoriesRes]);

  const isLoading = shopsLoading || categoriesLoading || !isInteractionReady;

  // 10x Scale: UI Thread Worklet for scroll animation (Reanimated v3)
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
  });
  
  const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

  const [filteredShops, setFilteredShops] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);

  // 10x Scale: Rely entirely on backend API filtering instead of blocking JS thread
  useEffect(() => {
    setIsFiltering(true);
    let filteredResults = [...shops];
    
    // Fallback client-side filtering ONLY for DEMO SHOPS (since API is empty)
    if (shops === DEMO_SHOPS) {
      filteredResults = filteredResults.filter(shop => {
        const matchesCategory = selectedCategory === 'All Categories' || shop.category === selectedCategory || shop.category_name === selectedCategory;
        const matchesSearch = (shop.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
        const matchesTopRated = !topRatedOnly || (shop.rating && shop.rating >= 4.0);
        const matchesDelivery = !deliveryOnly || shop.has_delivery;
        return matchesCategory && matchesSearch && matchesTopRated && matchesDelivery;
      });

      if (sortBy === 'rating') filteredResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      if (sortBy === 'name') filteredResults.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (sortBy === 'distance') filteredResults.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }
    
    setFilteredShops(filteredResults);
    setIsFiltering(false);
  }, [shops, selectedCategory, searchTerm, topRatedOnly, deliveryOnly, sortBy]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🏪 Local Directory</Text>
          <Text style={styles.subtitle}>Direct, zero-commission ordering</Text>
        </View>
        <TouchableOpacity style={styles.viewToggle} onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}>
          <Text style={{ fontSize: 24 }}>{viewMode === 'list' ? '🗺️' : '📋'}</Text>
        </TouchableOpacity>
      </View>

      {/* Zone Selector Banner */}
      <TouchableOpacity 
        style={styles.zoneBanner} 
        onPress={() => router.push('/modules/zone-selector')}
        activeOpacity={0.7}
      >
        <View style={styles.zoneBannerLeft}>
          <Text style={{ fontSize: 16 }}>📍</Text>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.zoneLabel}>Showing shops in</Text>
            <Text style={styles.zoneName}>{activeZone?.name || 'All Zones'}{activeZone?.city ? `, ${activeZone.city}` : ''}</Text>
          </View>
        </View>
        <View style={styles.zoneChangeBtn}>
          <Text style={styles.zoneChangeBtnText}>Change ▸</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput 
          style={styles.searchInput} 
          placeholder={`Search ${categories.length} categories...`}
          placeholderTextColor="#64748b"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.name} 
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
                setSelectedCategory(cat.name);
              }}
              style={[styles.categoryChip, selectedCategory === cat.name && styles.categoryChipActive]}
            >
              <Text style={{ marginRight: 6 }}>{cat.icon}</Text>
              <Text style={[styles.categoryText, selectedCategory === cat.name && styles.categoryTextActive]}>
                {cat.name} {cat.count ? `(${cat.count})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {showFilters && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Sort by:</Text>
          <View style={styles.filterRow}>
            {['rating', 'distance', 'name', 'newest'].map(s => (
              <TouchableOpacity key={s} onPress={() => setSortBy(s)} style={[styles.sortChip, sortBy === s && styles.sortChipActive]}>
                <Text style={[styles.sortText, sortBy === s && styles.sortTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.filterLabel}>Quick Filters:</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity onPress={() => setTopRatedOnly(!topRatedOnly)} style={[styles.sortChip, topRatedOnly && styles.sortChipActive]}>
              <Text style={[styles.sortText, topRatedOnly && styles.sortTextActive]}>⭐ Top Rated (4.0+)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeliveryOnly(!deliveryOnly)} style={[styles.sortChip, deliveryOnly && styles.sortChipActive]}>
              <Text style={[styles.sortText, deliveryOnly && styles.sortTextActive]}>🚚 Delivery Available</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>🗺️</Text>
          <Text style={{ fontSize: 16, color: '#64748b', fontWeight: '600' }}>Interactive Map View</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>(Requires react-native-maps integration)</Text>
        </View>
      ) : (
        <AnimatedFlashList
          data={filteredShops}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          numColumns={2}
          contentContainerStyle={styles.scrollContent}
          estimatedItemSize={250}
          getItemType={(item) => item.type || 'retail'}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No shops found. Try another category or adjust filters.</Text>
          }
          renderItem={({ item: shop }) => (
            <View style={styles.card}>
              <View style={styles.imageBox}>
                <Text style={{fontSize: 40}}>{categories.find(c => c.name === shop.category || c.name === shop.category_name)?.icon || '🏪'}</Text>
              </View>
              
              <View style={styles.badgesRow}>
                <View style={styles.badgePrimary}><Text style={styles.badgePrimaryText} numberOfLines={1}>{shop.category || shop.category_name || 'General'}</Text></View>
                {shop.is_demo && <View style={styles.demoBadge}><Text style={styles.demoBadgeText}>DEMO</Text></View>}
              </View>

              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              <Text style={styles.shopAddress} numberOfLines={1}>{shop.address || ''}</Text>
              <View style={styles.shopMetaRow}>
                <Text style={styles.shopMeta} numberOfLines={1}>⭐ {shop.rating || 'New'}</Text>
                <Text style={styles.shopMeta} numberOfLines={1}>📍 {shop.distance ? shop.distance + 'km' : 'Nearby'}</Text>
              </View>

              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => {
                  // For demo shops pass extra data so shop-detail doesn't show blank
                  const categorySlug = (shop.category || shop.category_name || 'retail')
                    .toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  router.push(
                    `/modules/shop-detail?id=${shop.id}&type=${shop.type || 'retail'}&category=${categorySlug}&name=${encodeURIComponent(shop.name)}`
                  );
                }}
              >
                <Text style={styles.actionBtnText}>{shop.type === 'appointment' ? 'Book Now' : 'View Shop'}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  viewToggle: { width: 44, height: 44, backgroundColor: '#f1f5f9', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  // Zone Banner
  zoneBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  zoneBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  zoneLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  zoneName: { fontSize: 14, color: '#1e40af', fontWeight: '800' },
  zoneChangeBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  zoneChangeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // Search & Filters
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginHorizontal: 16, marginTop: 12, elevation: 2 },
  searchIcon: { marginRight: 12, fontSize: 18 },
  searchInput: { flex: 1, paddingVertical: 14, color: '#0f172a', fontSize: 15 },
  filterBtn: { padding: 8, marginLeft: 8 },
  categoryScroll: { marginVertical: 16 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, elevation: 1 },
  categoryChipActive: { backgroundColor: '#3b82f6' },
  categoryText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  categoryTextActive: { color: '#fff', fontWeight: '800' },
  filterSection: { paddingHorizontal: 16, paddingBottom: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  filterLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 8 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f1f5f9' },
  sortChipActive: { backgroundColor: '#e0e7ff' },
  sortText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  sortTextActive: { color: '#4338ca', fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 16, elevation: 2 },
  imageBox: { height: 100, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', marginBottom: 8 },
  badgePrimary: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flex: 1 },
  badgePrimaryText: { color: '#4338ca', fontSize: 10, fontWeight: '700' },
  demoBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 },
  demoBadgeText: { color: '#d97706', fontSize: 8, fontWeight: '800' },
  shopName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  shopAddress: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic' },
  shopMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  shopMeta: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  actionBtn: { backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 15 },
  mapContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
});

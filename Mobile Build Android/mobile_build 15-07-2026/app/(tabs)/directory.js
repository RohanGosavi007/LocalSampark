import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, FlatList } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { apiGet } from '../../src/lib/api';

const CATEGORIES = [
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
];

export default function DirectoryScreen() {
  const { API_URL } = useAuth();
  const { category } = useLocalSearchParams();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(category || 'All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('rating');

  useEffect(() => {
    if (category) setSelectedCategory(category);
  }, [category]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/shops');
      // res might be { data: [...] } or { shops: [...] } or just [...]
      const shopsData = Array.isArray(res) ? res : (res.data || res.rows || []);
      setShops(shopsData);
    } catch (err) {
      console.warn("Error fetching shops:", err);
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  let filteredShops = shops.filter(shop => {
    const matchesCategory = selectedCategory === 'All Categories' || shop.category === selectedCategory;
    const matchesSearch = (shop.name || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (sortBy === 'rating') filteredShops.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sortBy === 'name') filteredShops.sort((a, b) => a.name.localeCompare(b.name));

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

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search 39+ categories..." 
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
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat.name} 
              onPress={() => setSelectedCategory(cat.name)}
              style={[styles.categoryChip, selectedCategory === cat.name && styles.categoryChipActive]}
            >
              <Text style={{ marginRight: 6 }}>{cat.icon}</Text>
              <Text style={[styles.categoryText, selectedCategory === cat.name && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {showFilters && (
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>Sort by:</Text>
          {['rating', 'distance', 'name'].map(s => (
            <TouchableOpacity key={s} onPress={() => setSortBy(s)} style={[styles.sortChip, sortBy === s && styles.sortChipActive]}>
              <Text style={[styles.sortText, sortBy === s && styles.sortTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>🗺️</Text>
          <Text style={{ fontSize: 16, color: '#64748b', fontWeight: '600' }}>Interactive Map View</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>(Requires react-native-maps integration)</Text>
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.scrollContent}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No shops found. Try another category.</Text>
          }
          renderItem={({ item: shop }) => (
            <View style={styles.card}>
              <View style={styles.imageBox}>
                <Text style={{fontSize: 40}}>{CATEGORIES.find(c => c.name === shop.category)?.icon || '🏪'}</Text>
              </View>
              
              <View style={styles.badgesRow}>
                <View style={styles.badgePrimary}><Text style={styles.badgePrimaryText} numberOfLines={1}>{shop.category}</Text></View>
              </View>

              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              <View style={styles.shopMetaRow}>
                <Text style={styles.shopMeta} numberOfLines={1}>⭐ {shop.rating}</Text>
                <Text style={styles.shopMeta} numberOfLines={1}>📍 {shop.distance}</Text>
              </View>

              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => router.push(`/modules/shop-detail?id=${shop.id}&type=${shop.type}`)}
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginHorizontal: 16, marginTop: 16, elevation: 2 },
  searchIcon: { marginRight: 12, fontSize: 18 },
  searchInput: { flex: 1, paddingVertical: 14, color: '#0f172a', fontSize: 15 },
  filterBtn: { padding: 8, marginLeft: 8 },
  categoryScroll: { marginVertical: 16 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, elevation: 1 },
  categoryChipActive: { backgroundColor: '#3b82f6' },
  categoryText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  categoryTextActive: { color: '#fff', fontWeight: '800' },
  filterBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  filterLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
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
  shopName: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  shopMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  shopMeta: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  actionBtn: { backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 15 },
  mapContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
});

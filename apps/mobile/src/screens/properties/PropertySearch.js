import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_PROPERTIES = [
  { id: '1', title: '2 BHK in Ganga Aria', location: 'Dhanori, Pune', price: '₹18,000/mo', type: 'Rent', beds: 2, baths: 2, sqft: 950, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400' },
  { id: '2', title: '3 BHK Premium Flat', location: 'Pride Aashiyana, Lohegaon', price: '₹85 L', type: 'Buy', beds: 3, baths: 3, sqft: 1200, image: 'https://images.unsplash.com/photo-1502672260266-1c1de2d92004?auto=format&fit=crop&q=80&w=400' },
  { id: '3', title: '1 BHK Fully Furnished', location: 'Tingre Nagar', price: '₹14,000/mo', type: 'Rent', beds: 1, baths: 1, sqft: 600, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=400' }
];

export default function PropertySearchScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState('All'); // All, Rent, Buy
  const [search, setSearch] = useState('');

  const filteredProperties = MOCK_PROPERTIES.filter(p => {
    if (filter !== 'All' && p.type !== filter) return false;
    if (search && !p.location.toLowerCase().includes(search.toLowerCase()) && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>{item.type}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.price}>{item.price}</Text>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.location}>{item.location}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Ionicons name="bed-outline" size={14} color="#64748b" /><Text style={styles.statText}>{item.beds} Bed</Text></View>
          <View style={styles.stat}><Ionicons name="water-outline" size={14} color="#64748b" /><Text style={styles.statText}>{item.baths} Bath</Text></View>
          <View style={styles.stat}><Ionicons name="expand-outline" size={14} color="#64748b" /><Text style={styles.statText}>{item.sqft} sqft</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Real Estate</Text>
        <TouchableOpacity onPress={() => navigation.navigate('screens/properties/PropertyListing')}>
          <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search localities, societies..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <View style={styles.filterTabs}>
          {['All', 'Rent', 'Buy'].map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.filterTab, filter === tab && styles.activeTab]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterText, filter === tab && styles.activeText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList 
        data={filteredProperties}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  searchSection: { padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 8, color: '#0f172a', fontSize: 16 },
  filterTabs: { flexDirection: 'row', gap: 10 },
  filterTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  activeTab: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterText: { color: '#475569', fontWeight: '500' },
  activeText: { color: '#0f172a' },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 5 },
  cardImage: { width: '100%', height: 180 },
  badgeContainer: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 12 },
  cardContent: { padding: 16 },
  price: { fontSize: 22, fontWeight: '900', color: '#10b981', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  location: { color: '#64748b', fontSize: 14, marginLeft: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#475569', fontSize: 13, fontWeight: '500' }
});

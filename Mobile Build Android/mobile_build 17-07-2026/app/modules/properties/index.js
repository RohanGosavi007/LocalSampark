import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_V1 } from '../../config/api';
export default function PropertiesScreen() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({ title: '', listing_type: 'Rent Flat', price: '', description: '' });

  useEffect(() => {
    fetchProperties();
  }, [filterType]); // Note: Search handles locally for mobile speed, or we can fetch. Let's do fetch on mount + filter locally or fetch with query.

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_V1}/properties?type=${filterType}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handlePostListing = async () => {
    if (!newProperty.title || !newProperty.price || !newProperty.description) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login to post a listing.');
        return;
      }
      const res = await fetch(`${API_V1}/properties`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newProperty,
          location: 'Dhanori', // Mock location for mobile demo
          type: newProperty.listing_type
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Property posted successfully');
        setIsModalOpen(false);
        setNewProperty({ title: '', listing_type: 'Rent Flat', price: '', description: '' });
        fetchProperties();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post listing');
    }
  };

  const filteredProps = properties.filter(p => 
    (p.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (p.location || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Real Estate</Text>
      </View>

      {/* Filter Row */}
      <View style={styles.filterContainer}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search e.g. 2 BHK, Viman Nagar..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Rent Flat', 'PG', 'Sell'].map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.filterChip, filterType === type && styles.filterChipActive]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                {type === 'All' ? 'All Types' : type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : filteredProps.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🏢</Text>
            <Text style={styles.emptyTitle}>No properties found</Text>
            <Text style={styles.emptyDesc}>Try adjusting filters or be the first to list!</Text>
            <TouchableOpacity style={[styles.fab, { position: 'relative', marginTop: 24, right: 0, bottom: 0 }]} onPress={() => setIsModalOpen(true)}>
              <Text style={styles.fabText}>Post Listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredProps.map(p => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.badgeRow}>
                      <View style={styles.badgeSec}><Text style={styles.badgeSecText}>{p.listing_type}</Text></View>
                      <View style={styles.badgePri}><Text style={styles.badgePriText}>Owner Direct</Text></View>
                    </View>
                    <Text style={styles.cardTitle}>{p.title}</Text>
                    <Text style={styles.cardLoc}>📍 {p.location}</Text>
                  </View>
                  <Text style={styles.cardPrice}>{p.price}</Text>
                </View>

                <Text style={styles.cardDesc} numberOfLines={3}>{p.description}</Text>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.cardStats}>Beds: {p.beds || 0} | Baths: {p.baths || 0}</Text>
                  <TouchableOpacity style={styles.contactBtn} onPress={() => Alert.alert('Contact', 'Owner contact info goes here')}>
                    <Text style={styles.contactBtnText}>Contact Owner</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {filteredProps.length > 0 && !loading && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsModalOpen(true)}>
          <Text style={styles.fabText}>+ Post Property</Text>
        </TouchableOpacity>
      )}

      {/* Post Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post a Property</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.label}>Property Title *</Text>
              <TextInput style={styles.input} placeholder="e.g. Spacious 2 BHK" value={newProperty.title} onChangeText={t => setNewProperty({...newProperty, title: t})} />
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.typeSelectorRow}>
                    {['Rent Flat', 'PG', 'Sell'].map(type => (
                      <TouchableOpacity 
                        key={type} 
                        style={[styles.typeBtn, newProperty.listing_type === type && styles.typeBtnActive]}
                        onPress={() => setNewProperty({...newProperty, listing_type: type})}
                      >
                        <Text style={[styles.typeBtnText, newProperty.listing_type === type && styles.typeBtnTextActive]}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Price (per month/total) *</Text>
              <TextInput style={styles.input} placeholder="e.g. ₹20,000/mo" value={newProperty.price} onChangeText={t => setNewProperty({...newProperty, price: t})} />

              <Text style={styles.label}>Description & Amenities *</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Describe the property..." multiline value={newProperty.description} onChangeText={t => setNewProperty({...newProperty, description: t})} />

              <TouchableOpacity style={styles.submitBtn} onPress={handlePostListing}>
                <Text style={styles.submitBtnText}>Publish Listing</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  filterContainer: { backgroundColor: '#fff', paddingBottom: 12, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { backgroundColor: '#f1f5f9', margin: 16, marginBottom: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 15 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterChipText: { color: '#64748b', fontWeight: '600' },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  content: { padding: 16, paddingBottom: 100 },
  
  grid: { gap: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badgeSec: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeSecText: { color: '#475569', fontSize: 10, fontWeight: '700' },
  badgePri: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePriText: { color: '#3b82f6', fontSize: 10, fontWeight: '800' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4, maxWidth: '80%' },
  cardLoc: { fontSize: 12, color: '#64748b' },
  cardPrice: { fontSize: 20, fontWeight: '900', color: '#3b82f6' },
  cardDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 16 },
  cardStats: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  contactBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyDesc: { color: '#64748b', textAlign: 'center' },

  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  closeBtn: { fontSize: 24, color: '#64748b', fontWeight: '600' },
  
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 16, color: '#0f172a' },
  
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeSelectorRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  typeBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  typeBtnTextActive: { color: '#3b82f6', fontWeight: '800' },

  submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../../src/lib/api';

const CATEGORIES = ['All', 'Electronics', 'Furniture', 'Home Appliances', 'Sports', 'Books', 'Clothing', 'Vehicles', 'Kitchen'];

/**
 * There is deliberately no MOCK_ITEMS here any more.
 *
 * fetchItems used to end with `setItems(MOCK_ITEMS); // Fallback to mock on fail`
 * with no __DEV__ guard, so in a release build any failed request -- an outage,
 * an expired token, no signal -- filled the marketplace with eight invented
 * listings carrying real prices and sellers: an "iPhone 12 — Pristine (64GB)"
 * at ₹22,000 from "Kavita M.", an LG washing machine at ₹9,000. A user could
 * tap through and try to buy something that has never existed.
 *
 * The guard in __tests__/noFabricatedData.test.js could not catch it: its shape
 * scanner skips any file that calls an API, and this file does.
 *
 * A failed load now surfaces as an error the user can retry, which is the same
 * contract src/utils/mockDataHelper.js already documents -- an empty list and a
 * broken request must not look alike.
 */

const conditionColor = { 'Like New': '#10b981', 'Excellent': '#4f46e5', 'Good': '#f97316', 'Fair': '#f59e0b' };

export default function MarketplaceScreen() {
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [showForm, setShowForm] = useState(false);


  
  const [formData, setFormData] = useState({ title: '', price: '', category: 'Electronics', condition: 'Good', desc: '', phone: '' });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet('/marketplace');
      setItems(Array.isArray(data) ? data : (data.rows || data.items || []));
    } catch (err) {
      console.warn('Failed to fetch marketplace items', err);
      setError(err?.message || 'Could not load listings.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = items
    .filter(i => selectedCat === 'All' || i.category === selectedCat)
    .filter(i => (i.title || '').toLowerCase().includes((searchQ || '').toLowerCase()) || (i.seller || i.seller_id?.toString() || '').toLowerCase().includes((searchQ || '').toLowerCase()));

  const handlePost = async () => {
    if (!formData.title || !formData.price || !formData.phone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    
    try {
      const payload = {
        title: formData.title,
        description: formData.desc,
        category: formData.category,
        condition: formData.condition,
        price: parseFloat(formData.price),
        isNegotiable: true
      };
      await apiPost('/marketplace', payload);
      
      Alert.alert('Success', 'Listing submitted! It will be live after quick moderation.');
      setShowForm(false);
      setFormData({ title: '', price: '', category: 'Electronics', condition: 'Good', desc: '', phone: '' });
      fetchItems();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marketplace</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search items or sellers..." 
          value={searchQ} 
          onChangeText={setSearchQ} 
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catScrollContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.catBtn, selectedCat === cat && styles.catBtnActive]}
              onPress={() => setSelectedCat(cat)}
            >
              <Text style={[styles.catBtnText, selectedCat === cat && styles.catBtnTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* A failed load is shown as a failure, not as "nothing for sale". The
            two used to be indistinguishable because the catch substituted mock
            listings instead. */}
        {error ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
            <Text style={styles.emptyTitle}>Could not load listings</Text>
            <Text style={styles.emptyDesc}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchItems}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🔍</Text>
            <Text style={styles.emptyTitle}>
              {loading ? 'Loading listings…' : 'No items match your filters'}
            </Text>
            <Text style={styles.emptyDesc}>
              {loading ? 'One moment.' : 'Try adjusting the category or search query.'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemImageContainer}>
                  <Text style={styles.itemIcon}>{item.icon}</Text>
                  <View style={[styles.conditionBadge, { backgroundColor: conditionColor[item.condition] + '22' }]}>
                    <Text style={[styles.conditionText, { color: conditionColor[item.condition] }]}>{item.condition}</Text>
                  </View>
                  <View style={styles.viewsBadge}>
                    <Text style={styles.viewsText}>👁 {item.views}</Text>
                  </View>
                </View>
                
                <View style={styles.itemDetails}>
                  <View style={styles.catBadge}><Text style={styles.catBadgeText}>{item.category}</Text></View>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.itemMeta}>📍 {item.zone} · {item.time}</Text>
                  
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemPrice}>₹{(item.price || 0).toLocaleString()}</Text>
                    <Text style={styles.itemSeller}>By {item.seller || `User #${item.seller_id}`}</Text>
                  </View>

                  <TouchableOpacity style={styles.chatBtn} onPress={() => Alert.alert('Chat', `Start conversation with ${item.seller || 'seller'}?`)}>
                    <Text style={styles.chatBtnText}>💬 Chat with Seller</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for Posting */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Text style={styles.fabText}>+ Post Item</Text>
      </TouchableOpacity>

      {/* Post Item Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post a New Item</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.label}>Item Title *</Text>
              <TextInput style={styles.input} placeholder="e.g. Hero Bicycle 24T" value={formData.title} onChangeText={t => setFormData({...formData, title: t})} />
              
              <Text style={styles.label}>Asking Price (₹) *</Text>
              <TextInput style={styles.input} placeholder="e.g. 2500" keyboardType="numeric" value={formData.price} onChangeText={t => setFormData({...formData, price: t})} />

              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Describe the item..." multiline value={formData.desc} onChangeText={t => setFormData({...formData, desc: t})} />

              <Text style={styles.label}>WhatsApp / Contact *</Text>
              <TextInput style={styles.input} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} />

              <TouchableOpacity style={styles.submitBtn} onPress={handlePost}>
                <Text style={styles.submitBtnText}>Submit Listing</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  searchContainer: { padding: 16, backgroundColor: '#fff' },
  searchInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 8, fontSize: 16 },

  catScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  catScrollContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  catBtnActive: { backgroundColor: '#3b82f6' },
  catBtnText: { color: '#64748b', fontWeight: '600' },
  catBtnTextActive: { color: '#fff', fontWeight: '700' },

  content: { padding: 16, paddingBottom: 100 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  itemCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  itemImageContainer: { height: 120, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  itemIcon: { fontSize: 48 },
  conditionBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  conditionText: { fontSize: 10, fontWeight: '800' },
  viewsBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  viewsText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  
  itemDetails: { padding: 12 },
  catBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  catBadgeText: { fontSize: 10, color: '#475569', fontWeight: '700' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4, height: 40 },
  itemMeta: { fontSize: 10, color: '#64748b', marginBottom: 12 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemPrice: { fontSize: 16, fontWeight: '900', color: '#3b82f6' },
  itemSeller: { fontSize: 10, color: '#64748b' },
  
  chatBtn: { backgroundColor: '#3b82f6', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  chatBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyDesc: { color: '#64748b', textAlign: 'center' },

  retryBtn: { marginTop: 16, backgroundColor: '#4f46e5', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  closeBtn: { fontSize: 24, color: '#64748b', fontWeight: '600' },
  
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 16 },
  
  submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});

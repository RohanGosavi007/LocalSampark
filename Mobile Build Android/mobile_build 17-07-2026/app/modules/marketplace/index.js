import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../../src/lib/api';


const CATEGORIES = ['All', 'Electronics', 'Furniture', 'Home Appliances', 'Sports', 'Books', 'Clothing', 'Vehicles', 'Kitchen'];

const ITEMS = [
  { id: 1, title: 'Hero Bicycle (24T) — Barely Used', price: 3500, category: 'Sports', condition: 'Good', icon: '🚲', seller: 'Rahul K.', zone: 'Dhanori', time: '2 hrs ago', views: 42 },
  { id: 2, title: 'Wooden Study Table + Ergonomic Chair', price: 2200, category: 'Furniture', condition: 'Like New', icon: '🪑', seller: 'Meera S.', zone: 'Viman Nagar', time: '5 hrs ago', views: 28 },
  { id: 3, title: 'Sony ExtraBass Bluetooth Speaker', price: 1500, category: 'Electronics', condition: 'Fair', icon: '🔊', seller: 'Amit P.', zone: 'Dhanori', time: '1 day ago', views: 71 },
  { id: 4, title: 'LG Washing Machine 6.5Kg', price: 9000, category: 'Home Appliances', condition: 'Excellent', icon: '🫧', seller: 'Sunita R.', zone: 'Kharadi', time: '2 days ago', views: 56 },
  { id: 5, title: 'Microwave Oven (Samsung 23L)', price: 4500, category: 'Kitchen', condition: 'Good', icon: '📦', seller: 'Priya N.', zone: 'Baner', time: '3 days ago', views: 33 },
  { id: 6, title: 'MTB Trek 3-speed Mountain Bike', price: 7500, category: 'Sports', condition: 'Good', icon: '🚵', seller: 'Sanjay V.', zone: 'Dhanori', time: '4 days ago', views: 19 },
  { id: 7, title: 'iPhone 12 — Pristine (64GB)', price: 22000, category: 'Electronics', condition: 'Like New', icon: '📱', seller: 'Kavita M.', zone: 'Kalyani Nagar', time: '5 days ago', views: 145 },
  { id: 8, title: 'Ikea Kallax Shelf — 4 Cubes', price: 1800, category: 'Furniture', condition: 'Good', icon: '📚', seller: 'Rohan D.', zone: 'Aundh', time: '6 days ago', views: 22 },
];

const conditionColor = { 'Like New': '#10b981', 'Excellent': '#4f46e5', 'Good': '#f97316', 'Fair': '#f59e0b' };

export default function MarketplaceScreen() {
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({ title: '', price: '', category: 'Electronics', condition: 'Good', desc: '', phone: '' });

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/marketplace');
      setItems(Array.isArray(data) ? data : (data.rows || []));
    } catch (err) {
      console.warn("Failed to fetch marketplace items", err);
      setItems(ITEMS); // Fallback to mock on fail
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
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🔍</Text>
            <Text style={styles.emptyTitle}>No items match your filters</Text>
            <Text style={styles.emptyDesc}>Try adjusting the category or search query.</Text>
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

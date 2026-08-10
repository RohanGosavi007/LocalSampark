import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { PackagePlus, CalendarPlus, Settings, Trash2 } from 'lucide-react-native';
import { API_BASE } from '../../../config';

export default function CatalogManagerView({ shop, shopCategoryType, themeColor = '#0ea5e9', onRefresh }) {
  const [activeTab, setActiveTab] = useState(shopCategoryType === 'APPOINTMENT' ? 'services' : 'products');
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', duration: '' });

  const products = shop?.products || [];
  
  // Aggregate unique services from slots
  const services = useMemo(() => {
    const slots = shop?.serviceSlots || [];
    const unique = new Map();
    slots.forEach(s => {
      const key = `${s.serviceName}-${s.providerName}`;
      if (!unique.has(key)) {
        unique.set(key, { 
          id: s.id, 
          name: s.serviceName, 
          duration: s.durationMinutes, 
          price: (s.pricePaise / 100).toString(),
          providerName: s.providerName 
        });
      }
    });
    return Array.from(unique.values());
  }, [shop?.serviceSlots]);

  const handleAdd = async () => {
    if (!newItem.name) return;
    setLoading(true);
    
    try {
      const endpoint = activeTab === 'products' ? '/my-shop/products' : '/my-shop/service-slots';
      const body = activeTab === 'products' ? {
        name: newItem.name,
        price: newItem.price,
        is_available: true
      } : {
        serviceName: newItem.name,
        price: newItem.price,
        durationMinutes: newItem.duration
      };

      const res = await fetch(`${API_BASE}/shop${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shop?.ownerToken || ''}` // Assuming token is handled by the auth context in a real app, but for now we just pass if we have it
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setNewItem({ name: '', price: '', duration: '' });
        if (onRefresh) onRefresh();
      } else {
        Alert.alert('Error', data.error || 'Failed to save item');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type) => {
    setLoading(true);
    try {
      const endpoint = type === 'products' ? `/my-shop/products/${id}` : `/my-shop/service-slots/${id}`;
      const res = await fetch(`${API_BASE}/shop${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${shop?.ownerToken || ''}`
        }
      });
      const data = await res.json();
      if (data.success) {
        if (onRefresh) onRefresh();
      } else {
        Alert.alert('Error', data.error || 'Failed to delete item');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const isHybrid = shopCategoryType === 'HYBRID';

  return (
    <View style={s.root}>
      <Text style={s.title}>Catalog & Service Manager</Text>

      {isHybrid && (
        <View style={s.tabRow}>
          <TouchableOpacity 
            style={[s.tabBtn, activeTab === 'products' && { backgroundColor: themeColor }]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[s.tabText, activeTab === 'products' && { color: '#fff' }]}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tabBtn, activeTab === 'services' && { backgroundColor: themeColor }]}
            onPress={() => setActiveTab('services')}
          >
            <Text style={[s.tabText, activeTab === 'services' && { color: '#fff' }]}>Services (Appointments)</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[s.addCard, { borderColor: themeColor + '40' }]}>
        <Text style={[s.sectionLabel, { color: themeColor }]}>
          {activeTab === 'products' ? 'Add New Product' : 'Add New Service'}
        </Text>
        
        <TextInput 
          style={s.input}
          placeholder={activeTab === 'products' ? "Product Name" : "Service Name (e.g. Dental Checkup)"}
          placeholderTextColor="#64748b"
          value={newItem.name}
          onChangeText={(t) => setNewItem({...newItem, name: t})}
        />
        
        <View style={s.row}>
          <TextInput 
            style={[s.input, { flex: 1, marginRight: 8 }]}
            placeholder="Price (₹)"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={newItem.price}
            onChangeText={(t) => setNewItem({...newItem, price: t})}
          />
          {activeTab === 'services' && (
            <TextInput 
              style={[s.input, { flex: 1 }]}
              placeholder="Duration (Mins)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={newItem.duration}
              onChangeText={(t) => setNewItem({...newItem, duration: t})}
            />
          )}
        </View>

        <TouchableOpacity style={[s.addBtn, { backgroundColor: themeColor }]} onPress={handleAdd}>
          {activeTab === 'products' ? <PackagePlus size={18} color="#fff" /> : <CalendarPlus size={18} color="#fff" />}
          <Text style={s.addBtnText}>Save {activeTab === 'products' ? 'Product' : 'Service'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.listHeader}>Current Active {activeTab === 'products' ? 'Products' : 'Services'}</Text>
      
      <ScrollView style={s.listContainer}>
        {(activeTab === 'products' ? products : services).map((item) => (
          <View key={item.id} style={s.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemMeta}>
                ₹{item.price} {item.duration ? `• ${item.duration} mins` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id, activeTab)} style={s.deleteBtn}>
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  tabRow: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 8, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  addCard: { backgroundColor: '#0f172a', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 24 },
  sectionLabel: { fontWeight: '700', fontSize: 14, marginBottom: 12 },
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  row: { flexDirection: 'row' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, marginTop: 4, gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  listHeader: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  listContainer: { backgroundColor: '#0f172a', borderRadius: 16, padding: 8, minHeight: 200 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  itemName: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  itemMeta: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  deleteBtn: { padding: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8 },
});

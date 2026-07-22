const fs = require('fs');
const path = require('path');

const content = `import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, Modal, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';

export default function ShopsModule() {
  const { authToken } = useAuth();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'register'

  // Register State
  const [newShop, setNewShop] = useState({ name: '', category: 'Grocery', address: '', phone: '' });

  // Details State
  const [selectedShop, setSelectedShop] = useState(null); // shop ID
  const [shopDetails, setShopDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'directory') fetchShops();
  }, [activeTab]);

  const apiFetch = async (endpoint, options = {}) => {
    try {
      const res = await fetch(\`http://10.0.2.2:5000/api/v1/\${endpoint}\`, {
        ...options,
        headers: { 'Authorization': \`Bearer \${authToken}\`, 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network Error' };
    }
  };

  const fetchShops = async () => {
    setLoading(true);
    const json = await apiFetch('shops');
    if (json.success) setShops(json.data || []);
    setLoading(false);
  };

  const loadShopDetails = async (id) => {
    setSelectedShop(id);
    setDetailsLoading(true);
    const json = await apiFetch(\`shops/\${id}\`);
    if (json.success) setShopDetails(json.data);
    setDetailsLoading(false);
  };

  const handleRegisterShop = async () => {
    if (!newShop.name || !newShop.address) return Alert.alert('Error', 'Name and Address required');
    const json = await apiFetch('shops/register', { method: 'POST', body: JSON.stringify(newShop) });
    if (json.success) {
      Alert.alert('Success', 'Shop registration request submitted to Territory Admin for approval!');
      setNewShop({ name: '', category: 'Grocery', address: '', phone: '' });
      setActiveTab('directory');
    } else {
      Alert.alert('Error', json.error);
    }
  };

  const renderDirectory = () => (
    <ScrollView contentContainerStyle={styles.list}>
      {loading && <ActivityIndicator size="large" color="#f43f5e" />}
      {!loading && shops.length === 0 && <Text style={styles.emptyText}>No local shops listed yet.</Text>}
      {shops.map(shop => (
        <TouchableOpacity key={shop.id} style={styles.card} onPress={() => loadShopDetails(shop.id)}>
          <View style={{flexDirection:'row', alignItems:'center', gap:15}}>
            <View style={styles.iconBox}><Text style={{fontSize:24}}>🏪</Text></View>
            <View style={{flex:1}}>
              <Text style={styles.cardTitle}>{shop.name}</Text>
              <Text style={styles.cardMeta}>{shop.category} • ⭐ {shop.rating || 'New'}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{shop.address}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderRegister = () => (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={[styles.card, {padding:20}]}>
        <Text style={styles.sectionTitle}>🛍️ Register Local Shop</Text>
        <Text style={{color:'#94a3b8', marginBottom:20}}>Onboard your business to the local community marketplace.</Text>
        
        <TextInput style={styles.input} placeholder="Shop Name" placeholderTextColor="#64748b" value={newShop.name} onChangeText={t=>setNewShop({...newShop, name:t})} />
        <TextInput style={styles.input} placeholder="Category (e.g. Grocery, Salon)" placeholderTextColor="#64748b" value={newShop.category} onChangeText={t=>setNewShop({...newShop, category:t})} />
        <TextInput style={styles.input} placeholder="Address" placeholderTextColor="#64748b" value={newShop.address} onChangeText={t=>setNewShop({...newShop, address:t})} />
        <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#64748b" value={newShop.phone} onChangeText={t=>setNewShop({...newShop, phone:t})} />
        
        <TouchableOpacity style={styles.primaryBtn} onPress={handleRegisterShop}>
          <Text style={styles.primaryBtnText}>Submit for Approval</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDetails = () => (
    <Modal transparent visible animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {detailsLoading ? <ActivityIndicator size="large" color="#f43f5e" /> : (
            <>
              {shopDetails ? (
                <>
                  <Text style={styles.modalTitle}>{shopDetails.name}</Text>
                  <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:15}}>
                    <Text style={{color:'#f43f5e', fontWeight:'bold'}}>{shopDetails.category}</Text>
                    <Text style={{color:'#fbbf24', fontWeight:'bold'}}>⭐ {shopDetails.rating || 'N/A'}</Text>
                  </View>
                  <Text style={{color:'#fff', marginBottom:10}}>📍 {shopDetails.address}</Text>
                  <Text style={{color:'#fff', marginBottom:20}}>📞 {shopDetails.phone}</Text>
                  
                  <Text style={styles.sectionTitle}>Products & Services</Text>
                  <View style={{height:150, justifyContent:'center', alignItems:'center', backgroundColor:'#0f172a', borderRadius:8, marginBottom:20}}>
                    <Text style={{color:'#64748b'}}>Catalogue currently empty</Text>
                  </View>
                  
                  <TouchableOpacity style={styles.primaryBtn} onPress={()=>setSelectedShop(null)}>
                    <Text style={styles.primaryBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={{color:'#fff'}}>Failed to load details.</Text>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🛒 Local Marketplace</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab==='directory' && styles.activeTab]} onPress={()=>setActiveTab('directory')}>
          <Text style={[styles.tabText, activeTab==='directory' && styles.activeTabText]}>Directory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab==='register' && styles.activeTab]} onPress={()=>setActiveTab('register')}>
          <Text style={[styles.tabText, activeTab==='register' && styles.activeTabText]}>Onboard Shop</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'directory' ? renderDirectory() : renderRegister()}
      {selectedShop && renderDetails()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#f43f5e', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  tabs: { flexDirection: 'row', backgroundColor: '#1e293b' },
  tab: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#f43f5e' },
  tabText: { color: '#94a3b8', fontWeight: 'bold' },
  activeTabText: { color: '#fff' },
  
  list: { padding: 15 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 15 },
  iconBox: { width: 50, height: 50, backgroundColor: '#334155', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { color: '#94a3b8', fontSize: 13 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  primaryBtn: { backgroundColor: '#f43f5e', padding: 15, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: '60%' },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5 }
});
`;

const targetPath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules', 'shops', 'index.js');
fs.writeFileSync(targetPath, content);
console.log('Successfully expanded shops module!');

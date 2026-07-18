import { apiGet, apiPost, apiPut, apiDelete } from '../../../../../../../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';

import { API_V1 } from '../../config/api';
export default function MobileCommunityHub() {
  const [activeTab, setActiveTab] = useState('lost'); // 'lost', 'garage', or 'admin'
  
  // Lost & Found State
  const [lostItems, setLostItems] = useState([]);
  const [lostForm, setLostForm] = useState({ itemName: '', description: '', bountyCoins: '500' });
  
  // Garage Sale State
  const [garageItems, setGarageItems] = useState([]);
  const [garageForm, setGarageForm] = useState({ itemName: '', description: '', priceCoins: '100' });
  const [weekendMode, setWeekendMode] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(null);
  const [deliveryData, setDeliveryData] = useState({ requested: false, dropoffLocation: '' });

  useEffect(() => {
    fetchLostItems();
    fetchGarageItems();
    fetchWeekendMode();
  }, []);

  const fetchLostItems = async () => {
    try {
      const data = await apiGet('/community-hub/lost/active?pincode=400001');
      if (data.success) setLostItems(data.data);
    } catch(e) {}
  };

  const fetchGarageItems = async () => {
    try {
      const data = await apiGet('/community-hub/garage/items');
      if (data.success) setGarageItems(data.data);
    } catch(e) {}
  };

  const fetchWeekendMode = async () => {
    try {
      const data = await apiGet('/community-hub/garage/admin/mode');
      if (data.success) setWeekendMode(data.data.enabled);
    } catch(e) {}
  };

  // --- LOST & FOUND ACTIONS ---
  const handlePostLost = async () => {
    try {
      const data = await apiPost('/community-hub/lost/post', {...lostForm, pincode: '400001'});
      if (data.success) {
        Alert.alert('Alert Broadcasted!', `Your Coins (${lostForm.bountyCoins}) are in escrow. Ping sent!`);
        setLostForm({ itemName: '', description: '', bountyCoins: '500' });
        fetchLostItems();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch(e) {}
  };

  const handleResolveLost = async (alertId) => {
    // In reality, the owner would select WHO found it. For demo, we auto-assign finder ID 2.
    try {
      const data = await apiPost('/community-hub/lost/${alertId}/resolve', { finderId: 2 });
      if (data.success) {
        Alert.alert('Success', data.message);
        fetchLostItems();
      }
    } catch(e) {}
  };

  // --- GARAGE SALE ACTIONS ---
  const handlePostGarage = async () => {
    try {
      const data = await apiPost('/community-hub/garage/post', garageForm);
      if (data.success) {
        Alert.alert('Success', 'Item posted to Garage Sale!');
        setGarageForm({ itemName: '', description: '', priceCoins: '100' });
        fetchGarageItems();
      }
    } catch(e) {}
  };

  const handleBuyGarage = async () => {
    try {
      const payload = {
        deliveryRequested: deliveryData.requested,
        dropoffLocation: deliveryData.dropoffLocation
      };
      const data = await apiPost('/community-hub/garage/${checkoutModal.id}/buy', payload);
      if (data.success) {
        Alert.alert('Purchased!', `${data.message}\n${data.data.deliveryJobId ? 'Delivery Agent Pinged!' : 'Contact seller to pick up.'}`);
        setCheckoutModal(null);
        fetchGarageItems();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch(e) {}
  };

  const handleToggleWeekendMode = async (enabled) => {
    try {
      const data = await apiPost('/community-hub/garage/admin/mode', { enabled });
      if (data.success) {
        Alert.alert('Admin', data.message);
        fetchWeekendMode();
      }
    } catch(e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community Hub</Text>
        <Text style={styles.subtitle}>Together We Thrive</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'lost' && styles.tabActiveLost]} onPress={() => setActiveTab('lost')}>
          <Text style={[styles.tabText, activeTab === 'lost' && styles.tabTextActive]}>🚨 Lost&Found</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'garage' && styles.tabActiveGarage]} onPress={() => setActiveTab('garage')}>
          <Text style={[styles.tabText, activeTab === 'garage' && styles.tabTextActive]}>📦 Garage</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'admin' && {backgroundColor: '#374151'}]} onPress={() => setActiveTab('admin')}>
          <Text style={[styles.tabText, activeTab === 'admin' && styles.tabTextActive]}>⚙️ Admin</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* --- LOST AND FOUND TAB --- */}
        {activeTab === 'lost' && (
          <View>
            <View style={styles.postBoxLost}>
              <Text style={styles.boxTitle}>Lost something?</Text>
              <TextInput style={styles.input} placeholder="e.g., Golden Retriever 'Max'" placeholderTextColor="#64748b" value={lostForm.itemName} onChangeText={t=>setLostForm({...lostForm, itemName:t})} />
              <TextInput style={styles.input} placeholder="Last seen near..." placeholderTextColor="#64748b" value={lostForm.description} onChangeText={t=>setLostForm({...lostForm, description:t})} />
              <TextInput style={styles.input} placeholder="Coin Bounty (Escrow)" keyboardType="numeric" placeholderTextColor="#64748b" value={lostForm.bountyCoins} onChangeText={t=>setLostForm({...lostForm, bountyCoins:t})} />
              <TouchableOpacity style={styles.btnDanger} onPress={handlePostLost}>
                <Text style={styles.btnText}>Broadcast Amber Alert to Pincode</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Active Neighborhood Alerts</Text>
            {lostItems.map(item => (
              <View key={item.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertItemName}>{item.item_name}</Text>
                  <Text style={styles.alertBounty}>🪙 {item.bounty_coins} Bounty</Text>
                </View>
                <Text style={styles.alertDesc}>{item.description}</Text>
                <Text style={styles.alertPoster}>Lost by: {item.poster_name}</Text>
                <TouchableOpacity style={styles.btnResolve} onPress={() => handleResolveLost(item.id)}>
                  <Text style={styles.btnResolveText}>Mark as Found & Pay Finder</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* --- GARAGE SALE TAB --- */}
        {activeTab === 'garage' && (
          <View>
            {weekendMode && (
              <View style={styles.weekendBanner}>
                <Text style={styles.weekendBannerText}>🔥 WEEKEND GARAGE SALE IS ACTIVE! 🔥</Text>
              </View>
            )}
            
            <View style={styles.postBoxGarage}>
              <Text style={styles.boxTitle}>Sell Old Items for Coins</Text>
              <TextInput style={styles.input} placeholder="Item Name (e.g. Harry Potter Books)" placeholderTextColor="#64748b" value={garageForm.itemName} onChangeText={t=>setGarageForm({...garageForm, itemName:t})} />
              <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#64748b" value={garageForm.description} onChangeText={t=>setGarageForm({...garageForm, description:t})} />
              <TextInput style={styles.input} placeholder="Price in Coins 🪙" keyboardType="numeric" placeholderTextColor="#64748b" value={garageForm.priceCoins} onChangeText={t=>setGarageForm({...garageForm, priceCoins:t})} />
              <TouchableOpacity style={styles.btnPrimary} onPress={handlePostGarage}>
                <Text style={styles.btnText}>List Item</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Available in Garage Sale</Text>
            <View style={styles.grid}>
              {garageItems.map(item => (
                <View key={item.id} style={styles.garageCard}>
                  <Text style={styles.garageTitle}>{item.item_name}</Text>
                  <Text style={styles.garagePrice}>🪙 {item.price_coins}</Text>
                  <Text style={styles.garageDesc} numberOfLines={2}>{item.description}</Text>
                  <Text style={styles.garageSeller}>Seller: {item.seller_name}</Text>
                  <TouchableOpacity style={styles.btnBuy} onPress={() => setCheckoutModal(item)}>
                    <Text style={styles.btnBuyText}>Buy for {item.price_coins} 🪙</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* --- ADMIN TAB --- */}
        {activeTab === 'admin' && (
          <View style={{backgroundColor: '#ffffff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0'}}>
            <Text style={{color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 10}}>Admin Dashboard</Text>
            <Text style={{color: '#64748b', fontSize: 13, marginBottom: 20}}>Toggle Weekend Garage Sale Mode for the entire neighborhood.</Text>
            
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 15, borderRadius: 10}}>
              <View>
                <Text style={{color: '#0f172a', fontWeight: 'bold'}}>Weekend Mode</Text>
                <Text style={{color: weekendMode ? '#10b981' : '#ef4444', fontSize: 12, marginTop: 4}}>{weekendMode ? 'ACTIVE' : 'INACTIVE'}</Text>
              </View>
              {weekendMode ? (
                <TouchableOpacity style={{backgroundColor: '#ef4444', padding: 10, borderRadius: 8}} onPress={() => handleToggleWeekendMode(false)}>
                  <Text style={{color: '#0f172a', fontWeight: 'bold'}}>Turn OFF</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={{backgroundColor: '#10b981', padding: 10, borderRadius: 8}} onPress={() => handleToggleWeekendMode(true)}>
                  <Text style={{color: '#0f172a', fontWeight: 'bold'}}>Turn ON</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Garage Checkout Modal */}
      <Modal visible={!!checkoutModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            {checkoutModal && (
              <>
                <Text style={styles.modalTitle}>Checkout</Text>
                <Text style={styles.modalSubtitle}>{checkoutModal.item_name}</Text>
                <Text style={styles.modalCost}>Cost: {checkoutModal.price_coins} SamparkCoins</Text>

                <View style={styles.deliveryToggleRow}>
                  <TouchableOpacity style={[styles.toggleBtn, !deliveryData.requested && styles.toggleBtnActive]} onPress={() => setDeliveryData({...deliveryData, requested: false})}>
                    <Text style={[styles.toggleBtnText, !deliveryData.requested && styles.toggleBtnTextActive]}>🚶 I'll pick it up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, deliveryData.requested && styles.toggleBtnActiveDel]} onPress={() => setDeliveryData({...deliveryData, requested: true})}>
                    <Text style={[styles.toggleBtnText, deliveryData.requested && styles.toggleBtnTextActive]}>🛵 Ping Delivery (₹30 Cash)</Text>
                  </TouchableOpacity>
                </View>

                {deliveryData.requested && (
                  <TextInput 
                    style={[styles.input, {marginTop: 15}]} 
                    placeholder="Your Drop-off Address" 
                    placeholderTextColor="#64748b" 
                    value={deliveryData.dropoffLocation} 
                    onChangeText={t=>setDeliveryData({...deliveryData, dropoffLocation: t})} 
                  />
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckoutModal(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleBuyGarage}><Text style={styles.confirmBtnText}>Pay Coins & Complete</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 16, marginTop: 4 },
  
  tabBar: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#ffffff', borderRadius: 10, p: 2 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActiveLost: { backgroundColor: '#7f1d1d' },
  tabActiveGarage: { backgroundColor: '#1e40af' },
  tabText: { color: '#64748b', fontWeight: 'bold' },
  tabTextActive: { color: '#0f172a' },

  content: { padding: 20 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 15 },
  
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, color: '#0f172a', marginBottom: 10 },
  boxTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
  
  // Lost Box
  postBoxLost: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#ef4444' },
  btnDanger: { backgroundColor: '#ef4444', padding: 15, borderRadius: 10, alignItems: 'center' },
  alertCard: { backgroundColor: '#450a0a', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#7f1d1d' },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  alertItemName: { color: '#fca5a5', fontSize: 18, fontWeight: 'bold', flex: 1 },
  alertBounty: { color: '#fde047', fontWeight: 'bold' },
  alertDesc: { color: '#f87171', marginBottom: 10 },
  alertPoster: { color: '#b91c1c', fontSize: 12, marginBottom: 15 },
  btnResolve: { backgroundColor: '#b91c1c', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnResolveText: { color: '#0f172a', fontWeight: 'bold' },

  // Garage Box
  weekendBanner: { backgroundColor: '#c2410c', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  weekendBannerText: { color: '#0f172a', fontWeight: 'bold' },
  postBoxGarage: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#3b82f6' },
  btnPrimary: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 10, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  garageCard: { width: '48%', backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  garageTitle: { color: '#0f172a', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  garagePrice: { color: '#fde047', fontWeight: 'bold', marginBottom: 5 },
  garageDesc: { color: '#64748b', fontSize: 12, marginBottom: 10 },
  garageSeller: { color: '#64748b', fontSize: 11, marginBottom: 15 },
  btnBuy: { backgroundColor: '#059669', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnBuyText: { color: '#0f172a', fontWeight: 'bold', fontSize: 12 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 5 },
  modalSubtitle: { fontSize: 16, color: '#3b82f6', fontWeight: 'bold', marginBottom: 10 },
  modalCost: { color: '#fde047', fontWeight: 'bold', marginBottom: 20 },
  deliveryToggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  toggleBtnActiveDel: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  toggleBtnText: { color: '#64748b', fontWeight: 'bold' },
  toggleBtnTextActive: { color: '#0f172a' },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: '#e2e8f0', padding: 15, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#0f172a', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#059669', padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#0f172a', fontWeight: 'bold' },
});

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';

import { apiGet, apiPost } from '../../../src/lib/api';

export default function MobileScrapNetwork() {
  const [viewMode, setViewMode] = useState('resident'); // 'resident' or 'dealer'
  
  // Resident State
  const [formData, setFormData] = useState({
    scrapType: 'Newspapers',
    approxWeight: '',
    address: '',
    payoutPreference: 'donate', 
    pincode: '400001'
  });

  // Dealer State
  const [activePings, setActivePings] = useState([]);

  useEffect(() => {
    if (viewMode === 'dealer') {
      fetchPings();
    }
  }, [viewMode]);

  const fetchPings = async () => {
    try {
      const data = await apiGet('/scrap/pings?pincode=400001');
      if (data.success) setActivePings(data.data);
    } catch(e) {
      console.warn('Failed to load scrap pings:', e);
    }
  };

  const handleAcceptJob = async (id) => {
    try {
      const data = await apiPost(`/scrap/${id}/accept`, {});
      if (data.success) { Alert.alert('Success', data.message); fetchPings(); }
    } catch(e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCompleteJob = async (id) => {
    try {
      const data = await apiPost(`/scrap/${id}/complete`, {});
      if (data.success) { Alert.alert('Success', data.message); fetchPings(); }
    } catch(e) {
      Alert.alert('Error', e.message);
    }
  };

  const handlePingDealer = async () => {
    if (!formData.approxWeight || !formData.address) {
      Alert.alert('Error', 'Please fill in the approximate weight and your address.');
      return;
    }

    try {
      // In the backend, the scrap endpoint is /scrap/schedule
      const payload = {
        scrap_type: formData.scrapType,
        approx_weight: formData.approxWeight,
        address: formData.address,
        payout_preference: formData.payoutPreference,
        pincode: formData.pincode
      };
      
      const data = await apiPost('/scrap/schedule', payload);
      
      if (data.success) {
        Alert.alert(
          'Success!', 
          `${data.message || 'Scrap pickup scheduled'}\n${formData.payoutPreference === 'donate' ? 'Thank you for donating to the Old Age Fund! You will receive 500 Coins upon pickup.' : 'The dealer will pay you in cash/UPI.'}`
        );
        setFormData({...formData, approxWeight: '', address: ''});
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>RaddiWala Network</Text>
        <Text style={styles.subtitle}>Recycle & Give Back</Text>
      </View>

      <View style={{flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: '#ffffff', borderRadius: 8}}>
        <TouchableOpacity style={[styles.mainTab, viewMode === 'resident' && styles.mainTabActive]} onPress={() => setViewMode('resident')}>
          <Text style={[styles.mainTabText, viewMode === 'resident' && styles.mainTabTextActive]}>Resident Ping</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainTab, viewMode === 'dealer' && styles.mainTabActive]} onPress={() => setViewMode('dealer')}>
          <Text style={[styles.mainTabText, viewMode === 'dealer' && styles.mainTabTextActive]}>Dealer Dispatch</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {viewMode === 'resident' ? (
          <View style={styles.formContainer}>
            <Text style={styles.formNote}>Ping verified local scrap dealers to come to your doorstep.</Text>
            
            <Text style={styles.inputLabel}>What are you recycling?</Text>
            <View style={styles.typeRow}>
              {['Newspapers', 'E-Waste', 'Metal', 'Plastic'].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.typeBtn, formData.scrapType === type && styles.typeBtnActive]}
                  onPress={() => setFormData({...formData, scrapType: type})}
                >
                  <Text style={[styles.typeBtnText, formData.scrapType === type && styles.typeBtnTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Approximate Weight (e.g., 5kg, 1 Box)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 10 kg" 
              placeholderTextColor="#64748b" 
              value={formData.approxWeight} 
              onChangeText={t=>setFormData({...formData, approxWeight:t})} 
            />
            
            <Text style={styles.inputLabel}>Your Pickup Address</Text>
            <TextInput 
              style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
              placeholder="Flat no, Building name..." 
              placeholderTextColor="#64748b" 
              multiline
              value={formData.address} 
              onChangeText={t=>setFormData({...formData, address:t})} 
            />

            <Text style={styles.inputLabel}>Payout Preference</Text>
            <View style={styles.payoutToggleRow}>
              <TouchableOpacity 
                style={[styles.toggleBtn, formData.payoutPreference === 'donate' && styles.toggleBtnActiveDonate]}
                onPress={() => setFormData({...formData, payoutPreference: 'donate'})}
              >
                <Text style={[styles.toggleBtnText, formData.payoutPreference === 'donate' && styles.toggleBtnTextActive]}>❤ Donate to Old Age Fund (Earn 500 🪙)</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.toggleBtn, formData.payoutPreference === 'cash' && styles.toggleBtnActiveCash]}
                onPress={() => setFormData({...formData, payoutPreference: 'cash'})}
              >
                <Text style={[styles.toggleBtnText, formData.payoutPreference === 'cash' && styles.toggleBtnTextActive]}>💵 I want Cash/UPI from Dealer</Text>
              </TouchableOpacity>
            </View>

            {formData.payoutPreference === 'donate' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>By donating your scrap, the dealer pays the equivalent value directly to the Local Old Age Community Fund. We reward you with 500 SamparkCoins for your good deed!</Text>
              </View>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handlePingDealer}>
              <Text style={styles.submitBtnText}>📡 Ping Local Dealers (WebSocket)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={{color: '#0f172a', fontSize: 18, fontWeight: 'bold', mb: 10}}>📡 Live Pings (400001)</Text>
            {activePings.length === 0 && <Text style={{color: '#64748b', mt: 10}}>No active requests right now.</Text>}
            {activePings.map(ping => (
              <View key={ping.id} style={{backgroundColor: '#ffffff', p: 15, borderRadius: 10, mb: 15, borderWidth: 1, borderColor: '#e2e8f0'}}>
                <Text style={{color: '#0f172a', fontWeight: 'bold', fontSize: 16}}>{ping.resident_name}</Text>
                <Text style={{color: '#64748b', fontSize: 12}}>📦 {ping.scrap_type} ({ping.approx_weight})</Text>
                <Text style={{color: '#64748b', fontSize: 12, mb: 10}}>📍 {ping.address}</Text>
                
                {ping.payout_preference === 'donate' ? (
                   <Text style={{color: '#eab308', fontWeight: 'bold', fontSize: 12, mb: 10}}>❤ Donating (Resident gets 500 🪙)</Text>
                ) : (
                   <Text style={{color: '#10b981', fontWeight: 'bold', fontSize: 12, mb: 10}}>💵 Resident Needs Cash</Text>
                )}

                <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity style={{flex: 1, backgroundColor: '#2563eb', padding: 10, borderRadius: 8, alignItems: 'center'}} onPress={() => handleAcceptJob(ping.id)}>
                    <Text style={{color: '#0f172a', fontWeight: 'bold'}}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{flex: 1, backgroundColor: '#65a30d', padding: 10, borderRadius: 8, alignItems: 'center'}} onPress={() => handleCompleteJob(ping.id)}>
                    <Text style={{color: '#0f172a', fontWeight: 'bold'}}>Complete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#84cc16' },
  subtitle: { color: '#64748b', fontSize: 16, marginTop: 4 },
  
  mainTab: { flex: 1, padding: 12, alignItems: 'center' },
  mainTabActive: { backgroundColor: '#3f6212', borderRadius: 8 },
  mainTabText: { color: '#64748b', fontWeight: 'bold' },
  mainTabTextActive: { color: '#0f172a' },

  content: { padding: 20 },

  formContainer: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  formNote: { color: '#475569', fontSize: 13, marginBottom: 20 },
  
  inputLabel: { color: '#64748b', fontSize: 13, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, color: '#0f172a' },
  
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  typeBtnActive: { backgroundColor: '#65a30d', borderColor: '#65a30d' },
  typeBtnText: { color: '#64748b', fontWeight: 'bold' },
  typeBtnTextActive: { color: '#0f172a' },

  payoutToggleRow: { gap: 10 },
  toggleBtn: { paddingVertical: 15, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  toggleBtnActiveDonate: { backgroundColor: '#ca8a04', borderColor: '#ca8a04' },
  toggleBtnActiveCash: { backgroundColor: '#059669', borderColor: '#059669' },
  toggleBtnText: { color: '#64748b', fontWeight: 'bold', textAlign: 'center' },
  toggleBtnTextActive: { color: '#0f172a' },

  infoBox: { padding: 15, backgroundColor: 'rgba(202,138,4,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(202,138,4,0.3)', marginTop: 15 },
  infoBoxText: { color: '#fde047', fontSize: 12, lineHeight: 18 },

  submitBtn: { backgroundColor: '#84cc16', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  submitBtnText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
});

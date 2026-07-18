import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Switch, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_V1 } from '../../config/api';
export default function BloodDonationScreen() {
  const [activeTab, setActiveTab] = useState('requests'); // requests, donors, admin
  const [requests, setRequests] = useState([]);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [rewardEnabled, setRewardEnabled] = useState(true);

  // Forms
  const [newRequest, setNewRequest] = useState({ requestType: 'Blood', requiredItem: 'O+', description: '', location: '', urgency: 'Urgent' });
  const [donorForm, setDonorForm] = useState({ bloodGroup: 'O+', pincode: '400001' });

  useEffect(() => {
    fetchRequests();
    fetchDonors();
    fetchAdminConfig();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_V1}/medical/requests`);
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch(e) {}
  };

  const fetchDonors = async () => {
    try {
      const res = await fetch(`${API_V1}/medical/donors`);
      const data = await res.json();
      if (data.success) setDonors(data.data);
    } catch(e) {} finally {
      setLoading(false);
    }
  };

  const fetchAdminConfig = async () => {
    try {
      const res = await fetch(`${API_V1}/medical/admin/reward-status`);
      const data = await res.json();
      if (data.success) setRewardEnabled(data.data.enabled);
    } catch(e) {}
  };

  const handlePostRequest = async () => {
    if (!newRequest.requiredItem || !newRequest.location) {
      Alert.alert('Error', 'Please fill required item and location');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = { ...newRequest, location: newRequest.location || 'Dhanori' };
      const res = await fetch(`${API_V1}/medical/requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Medical Request Broadcasted Successfully!');
        setNewRequest({ requestType: 'Blood', requiredItem: 'O+', description: '', location: '', urgency: 'Urgent' });
        fetchRequests();
      }
    } catch(e) {}
  };

  const handleRegisterDonor = async () => {
    if (!donorForm.pincode) {
      Alert.alert('Error', 'Pincode is required');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/medical/donors`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...donorForm, location: 'Dhanori' })
      });
      const data = await res.json();
      if (data.success) {
        let msg = data.message;
        if (data.data && data.data.rewarded) msg += `\nYou earned ${data.data.rewardAmount} 🪙 SamparkCoins!`;
        Alert.alert('Success', msg);
        fetchDonors();
      } else {
        Alert.alert('Error', data.error || 'Failed to register');
      }
    } catch(e) {}
  };

  const toggleAdminReward = async (enabled) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/medical/admin/reward-toggle`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });
      const data = await res.json();
      if (data.success) {
        setRewardEnabled(enabled);
        Alert.alert('Admin Config', data.message);
      }
    } catch(e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blood Donation Center</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'requests' && styles.tabBtnActive]} onPress={() => setActiveTab('requests')}>
          <Text style={[styles.tabBtnText, activeTab === 'requests' && styles.tabBtnTextActive]}>Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'donors' && { borderBottomColor: '#10b981' }]} onPress={() => setActiveTab('donors')}>
          <Text style={[styles.tabBtnText, activeTab === 'donors' && { color: '#10b981' }]}>Donors</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'admin' && { borderBottomColor: '#ef4444' }]} onPress={() => setActiveTab('admin')}>
          <Text style={[styles.tabBtnText, activeTab === 'admin' && { color: '#ef4444' }]}>Admin</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Post Urgent Request</Text>
              
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Request Type</Text>
                  <TextInput style={styles.input} value={newRequest.requestType} onChangeText={t => setNewRequest({...newRequest, requestType: t})} placeholder="Blood / Equipment" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Required (e.g. O+)</Text>
                  <TextInput style={styles.input} value={newRequest.requiredItem} onChangeText={t => setNewRequest({...newRequest, requiredItem: t})} />
                </View>
              </View>

              <Text style={styles.label}>Details</Text>
              <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} multiline value={newRequest.description} onChangeText={t => setNewRequest({...newRequest, description: t})} placeholder="Patient / Need details" />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Hospital / Location</Text>
                  <TextInput style={styles.input} value={newRequest.location} onChangeText={t => setNewRequest({...newRequest, location: t})} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Urgency</Text>
                  <TextInput style={styles.input} value={newRequest.urgency} onChangeText={t => setNewRequest({...newRequest, urgency: t})} placeholder="Urgent / Standard" />
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handlePostRequest}>
                <Text style={styles.primaryBtnText}>Broadcast Request</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Active Requests</Text>
            {requests.length === 0 ? (
              <Text style={styles.emptyText}>No active medical requests found.</Text>
            ) : (
              requests.map(r => (
                <View key={r.id} style={styles.requestCard}>
                  {r.urgency && r.urgency.includes('Urgent') && (
                    <View style={styles.urgentBadge}><Text style={styles.urgentBadgeText}>URGENT</Text></View>
                  )}
                  <Text style={styles.reqItem}>Need: {r.requiredItem} <Text style={{fontSize:12, color:'#64748b'}}>({r.request_type})</Text></Text>
                  <Text style={styles.reqDesc}>{r.description}</Text>
                  <Text style={styles.reqMeta}>📍 {r.location}</Text>
                  <Text style={styles.reqContact}>📞 {r.requester_name} ({r.phone})</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Donors Tab */}
        {activeTab === 'donors' && (
          <View>
            <View style={[styles.formCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
              <Text style={[styles.formTitle, { color: '#10b981', textAlign: 'center' }]}>Become a Hero</Text>
              <Text style={{ textAlign: 'center', color: '#047857', marginBottom: 16 }}>Register as a Blood Donor to get notified during emergencies and earn rewards.</Text>
              
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Blood Group</Text>
                  <TextInput style={styles.input} value={donorForm.bloodGroup} onChangeText={t => setDonorForm({...donorForm, bloodGroup: t})} placeholder="e.g. O+" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Pincode</Text>
                  <TextInput style={styles.input} value={donorForm.pincode} onChangeText={t => setDonorForm({...donorForm, pincode: t})} keyboardType="numeric" />
                </View>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#10b981' }]} onPress={handleRegisterDonor}>
                <Text style={styles.primaryBtnText}>Register as Donor</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Local Donor Directory</Text>
            {loading ? <ActivityIndicator size="large" color="#10b981" /> : donors.length === 0 ? (
              <Text style={styles.emptyText}>No donors found in your area yet.</Text>
            ) : (
              donors.map(d => (
                <View key={d.id} style={styles.donorCard}>
                  <View style={styles.bloodIcon}><Text style={styles.bloodIconText}>{d.blood_group}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.donorName}>{d.full_name}</Text>
                    <Text style={styles.donorMeta}>Pincode: {d.pincode}</Text>
                    <Text style={styles.donorPhone}>📞 {d.phone}</Text>
                  </View>
                </View>
              ))
            )}

            {/* Donation Drives Section */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Upcoming Donation Drives</Text>
            <View style={[styles.requestCard, { borderLeftColor: '#f59e0b', marginBottom: 24 }]}>
              <View style={[styles.urgentBadge, { backgroundColor: '#f59e0b' }]}><Text style={styles.urgentBadgeText}>THIS WEEKEND</Text></View>
              <Text style={styles.reqItem}>Rotary Club Mega Camp</Text>
              <Text style={styles.reqDesc}>Join us for the mega blood donation camp organized by Rotary Club. Free health checkup included.</Text>
              <Text style={styles.reqMeta}>📍 Community Hall, Dhanori</Text>
              <Text style={styles.reqMeta}>📅 Sunday, 10:00 AM - 4:00 PM</Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#f59e0b', marginTop: 12 }]} onPress={() => Alert.alert('Registered', 'Thank you for registering for the drive!')}>
                <Text style={styles.primaryBtnText}>Register Now</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.requestCard, { borderLeftColor: '#f59e0b' }]}>
              <Text style={styles.reqItem}>Lions Club Drive</Text>
              <Text style={styles.reqDesc}>Annual blood donation drive. Refreshments provided.</Text>
              <Text style={styles.reqMeta}>📍 Lions Club, Viman Nagar</Text>
              <Text style={styles.reqMeta}>📅 Next Saturday, 9:00 AM - 2:00 PM</Text>
            </View>
          </View>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Medical Engine Config</Text>
            <Text style={{ color: '#64748b', marginBottom: 24 }}>Toggle system-wide settings for the Blood Bank module.</Text>
            
            <View style={styles.adminRow}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={styles.adminLabel}>Gamification Incentive</Text>
                <Text style={styles.adminDesc}>Award 500 SamparkCoins to users when they register as a Blood Donor to encourage participation.</Text>
              </View>
              <Switch 
                value={rewardEnabled} 
                onValueChange={toggleAdminReward}
                trackColor={{ false: "#cbd5e1", true: "#3b82f6" }}
                thumbColor={"#fff"}
              />
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabBtnActive: { borderColor: '#3b82f6' },
  tabBtnText: { fontWeight: '600', color: '#64748b' },
  tabBtnTextActive: { color: '#3b82f6', fontWeight: '700' },

  content: { padding: 16 },
  
  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 32 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 16, color: '#0f172a' },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  emptyText: { color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginVertical: 20 },
  
  requestCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4, borderLeftColor: '#3b82f6', marginBottom: 12 },
  urgentBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  urgentBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  reqItem: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, paddingRight: 60 },
  reqDesc: { fontSize: 14, color: '#475569', marginBottom: 12, lineHeight: 20 },
  reqMeta: { fontSize: 13, color: '#0f172a', fontWeight: '500', marginBottom: 4 },
  reqContact: { fontSize: 13, color: '#10b981', fontWeight: '700' },

  donorCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  bloodIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ecfdf5', borderWidth: 2, borderColor: '#10b981', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bloodIconText: { color: '#10b981', fontSize: 18, fontWeight: '900' },
  donorName: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  donorMeta: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  donorPhone: { fontSize: 14, color: '#3b82f6', fontWeight: '700' },

  adminRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  adminLabel: { fontSize: 16, fontWeight: '700', color: '#3b82f6', marginBottom: 6 },
  adminDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 }
});

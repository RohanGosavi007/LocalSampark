import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';

import { API_V1 } from '../../config/api';
export default function MobileMedical() {
  const [tab, setTab] = useState('requests'); // requests, register
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [newRequest, setNewRequest] = useState({ requestType: 'Blood', requiredItem: '', description: '', location: '', urgency: 'Standard' });
  const [donorForm, setDonorForm] = useState({ bloodGroup: 'O+', pincode: '400001' });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await apiGet('/medical/requests');
      if (data.success) setRequests(data.data);
    } catch(e) {}
    setLoading(false);
  };

  const handlePostRequest = async () => {
    if (!newRequest.requiredItem || !newRequest.location) {
      Alert.alert('Error', 'Please fill in item and location.');
      return;
    }
    try {
      const data = await apiPost('/medical/requests', newRequest);
      if (data.success) {
        Alert.alert('Broadcasted', 'Your medical request has been shared in your area.');
        setNewRequest({ requestType: 'Blood', requiredItem: '', description: '', location: '', urgency: 'Standard' });
        fetchRequests();
      }
    } catch (err) {}
  };

  const handleRegisterDonor = async () => {
    try {
      const data = await apiPost('/medical/donors', donorForm);
      if (data.success) {
        let msg = data.message;
        if (data.data.rewarded) msg += `\nYou earned ${data.data.rewardAmount} 🪙 SamparkCoins!`;
        Alert.alert('Hero Registered!', msg);
        setTab('requests');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f43f5e" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medical & Blood</Text>
        <Text style={styles.subtitle}>Community Support Engine</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'requests' && styles.activeTabReqs]} onPress={() => setTab('requests')}>
          <Text style={[styles.tabText, tab === 'requests' && styles.activeTabText]}>Live Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'register' && styles.activeTabReg]} onPress={() => setTab('register')}>
          <Text style={[styles.tabText, tab === 'register' && styles.activeTabText]}>Register Donor</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'requests' ? (
          <>
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Ask for Help</Text>
              
              <View style={styles.row}>
                <TouchableOpacity 
                  style={[styles.typeBtn, newRequest.requestType === 'Blood' && styles.typeBtnActive]} 
                  onPress={() => setNewRequest({...newRequest, requestType: 'Blood'})}
                >
                  <Text style={[styles.typeBtnText, newRequest.requestType === 'Blood' && styles.typeBtnTextActive]}>Blood</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeBtn, newRequest.requestType === 'Equipment' && styles.typeBtnActive]} 
                  onPress={() => setNewRequest({...newRequest, requestType: 'Equipment'})}
                >
                  <Text style={[styles.typeBtnText, newRequest.requestType === 'Equipment' && styles.typeBtnTextActive]}>Equipment</Text>
                </TouchableOpacity>
              </View>

              <TextInput style={styles.input} placeholder={newRequest.requestType === 'Blood' ? "Blood Group (e.g. O+)" : "Equipment (e.g. Wheelchair)"} placeholderTextColor="#64748b" value={newRequest.requiredItem} onChangeText={t=>setNewRequest({...newRequest, requiredItem:t})} />
              <TextInput style={styles.input} placeholder="Location / Hospital" placeholderTextColor="#64748b" value={newRequest.location} onChangeText={t=>setNewRequest({...newRequest, location:t})} />
              <TextInput style={[styles.input, styles.textArea]} placeholder="Additional Details" placeholderTextColor="#64748b" multiline value={newRequest.description} onChangeText={t=>setNewRequest({...newRequest, description:t})} />
              
              <TouchableOpacity style={styles.urgencyToggle} onPress={() => setNewRequest({...newRequest, urgency: newRequest.urgency === 'Standard' ? 'Urgent' : 'Standard'})}>
                <Text style={styles.urgencyText}>
                  {newRequest.urgency === 'Urgent' ? '🚨 URGENT (Will Ping Donors)' : 'Standard Priority'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handlePostRequest}>
                <Text style={styles.submitBtnText}>Broadcast Request</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Active Help Requests</Text>
            {requests.length === 0 && <Text style={styles.emptyText}>No active requests.</Text>}
            {requests.map(r => (
              <View key={r.id} style={styles.card}>
                {r.urgency && r.urgency.includes('Urgent') && (
                  <View style={styles.urgentBadge}><Text style={styles.urgentBadgeText}>URGENT</Text></View>
                )}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{r.requiredItem}</Text>
                  <View style={styles.typeTag}><Text style={styles.typeTagText}>{r.request_type}</Text></View>
                </View>
                <Text style={styles.cardDesc}>{r.description}</Text>
                <Text style={styles.metaText}>📍 {r.location}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.contactText}>📞 {r.requester_name} • {r.phone}</Text>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.heroIcon}>🦸</Text>
            </View>
            <Text style={styles.heroTitle}>Become a Hero</Text>
            <Text style={styles.heroDesc}>Register as a Blood Donor to get notified during emergencies in your area.</Text>

            <TextInput style={styles.input} placeholder="Blood Group (e.g. AB+)" placeholderTextColor="#64748b" value={donorForm.bloodGroup} onChangeText={t=>setDonorForm({...donorForm, bloodGroup:t})} />
            <TextInput style={styles.input} placeholder="Pincode" placeholderTextColor="#64748b" value={donorForm.pincode} onChangeText={t=>setDonorForm({...donorForm, pincode:t})} />
            
            <TouchableOpacity style={styles.registerBtn} onPress={handleRegisterDonor}>
              <Text style={styles.registerBtnText}>Register Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f43f5e' },
  subtitle: { color: '#64748b', fontSize: 16, marginTop: 4 },
  
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#ffffff' },
  activeTabReqs: { borderBottomColor: '#f43f5e' },
  activeTabReg: { borderBottomColor: '#fb7185' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
  activeTabText: { color: '#0f172a' },

  content: { padding: 20 },
  
  formContainer: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15, marginBottom: 25 },
  formTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
  typeBtnText: { color: '#64748b', fontWeight: 'bold' },
  typeBtnTextActive: { color: '#0f172a' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, color: '#0f172a', marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  urgencyToggle: { padding: 15, backgroundColor: 'rgba(244,63,94,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)', marginBottom: 15, alignItems: 'center' },
  urgencyText: { color: '#fca5a5', fontWeight: 'bold' },
  submitBtn: { backgroundColor: '#f43f5e', padding: 16, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },

  sectionTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  emptyText: { color: '#64748b', textAlign: 'center' },

  card: { backgroundColor: '#ffffff', borderRadius: 15, padding: 20, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#f43f5e' },
  urgentBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(244,63,94,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  urgentBadgeText: { color: '#f43f5e', fontWeight: 'bold', fontSize: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },
  typeTag: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  typeTagText: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  cardDesc: { color: '#475569', fontSize: 14, marginBottom: 10 },
  metaText: { color: '#64748b', fontSize: 13, marginBottom: 15 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 15 },
  contactText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 13 },

  iconContainer: { alignItems: 'center', marginBottom: 10 },
  heroIcon: { fontSize: 60 },
  heroTitle: { color: '#0f172a', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  heroDesc: { color: '#64748b', textAlign: 'center', marginBottom: 25, paddingHorizontal: 10 },
  registerBtn: { backgroundColor: '#fb7185', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  registerBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});

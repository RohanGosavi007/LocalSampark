import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';

import { API_V1 } from '../../config/api';
export default function MobileDeliveryAgent() {
  const [tab, setTab] = useState('available'); // available, active
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    fetchJobs();
    if (tab === 'active') fetchMyJobs();
    
    // In a real app with socket.io on client:
    // socket.on('delivery:alert', (job) => {
    //   if(isOnline) {
    //      Alert.alert('NEW JOB PING!', `${job.pickupLocation} -> Delivery`);
    //      fetchJobs();
    //   }
    // });
  }, [tab, isOnline]);

  const fetchJobs = async () => {
    try {
      const data = await apiGet('/delivery/jobs?pincode=400001');
      if (data.success) setAvailableJobs(data.data);
    } catch(e) {}
    setLoading(false);
  };

  const fetchMyJobs = async () => {
    try {
      const data = await apiGet('/delivery/my-jobs');
      if (data.success) setMyJobs(data.data);
    } catch(e) {}
  };

  const handleAcceptJob = async (jobId) => {
    try {
      const data = await apiPost('/delivery/jobs/${jobId}/accept');
      if (data.success) {
        Alert.alert('Job Accepted!', 'Head to the pickup location.');
        fetchJobs();
        setTab('active');
      } else {
        Alert.alert('Oops!', data.error);
        fetchJobs(); // Refresh in case someone else took it
      }
    } catch (err) {}
  };

  const handleCompleteJob = async (jobId) => {
    try {
      const data = await apiPost('/delivery/jobs/${jobId}/complete');
      if (data.success) {
        Alert.alert('Delivery Complete!', data.message); // Will show payout
        fetchMyJobs();
      }
    } catch (err) {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#10b981" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Agent Hub</Text>
            <Text style={styles.subtitle}>Hyperlocal Deliveries</Text>
          </View>
          <TouchableOpacity 
            style={[styles.statusToggle, isOnline ? styles.online : styles.offline]} 
            onPress={() => setIsOnline(!isOnline)}
          >
            <Text style={styles.statusToggleText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
          </TouchableOpacity>
        </View>
        {isOnline && (
          <View style={styles.pingNotice}>
            <Text style={styles.pingText}>📡 Listening for WebSocket pings in Pincode 400001...</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'available' && styles.activeTabAvail]} onPress={() => setTab('available')}>
          <Text style={[styles.tabText, tab === 'available' && styles.activeTabText]}>Available Pings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'active' && styles.activeTabActive]} onPress={() => setTab('active')}>
          <Text style={[styles.tabText, tab === 'active' && styles.activeTabText]}>My Active Jobs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!isOnline && tab === 'available' ? (
          <View style={styles.offlineBox}>
            <Text style={styles.offlineBoxIcon}>😴</Text>
            <Text style={styles.offlineBoxText}>You are currently Offline.</Text>
            <Text style={styles.offlineBoxSub}>Go online to receive WebSocket delivery pings.</Text>
          </View>
        ) : tab === 'available' ? (
          <>
            {availableJobs.length === 0 && <Text style={styles.emptyText}>No active pings. Waiting for requests...</Text>}
            {availableJobs.map(job => (
              <View key={job.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{job.item_details}</Text>
                </View>
                
                <View style={styles.metaRow}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{job.delivery_type === 'walker' ? '🚶 Walker' : '🛵 Vehicle'}</Text>
                  </View>
                  <View style={styles.payoutTag}>
                    <Text style={styles.payoutTagText}>
                      Payout: {job.payment_pref === 'coins' ? `${job.price_coins} 🪙` : `₹${job.price_fiat}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationBox}>
                  <Text style={styles.locText}><Text style={styles.locIcon}>🟢</Text> Pick: {job.pickup_location}</Text>
                  <View style={styles.locLine} />
                  <Text style={styles.locText}><Text style={styles.locIcon}>🔴</Text> Drop: {job.dropoff_location}</Text>
                </View>
                
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptJob(job.id)}>
                  <Text style={styles.acceptBtnText}>Accept Job (First Come)</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : (
          <>
            {myJobs.length === 0 && <Text style={styles.emptyText}>You have no active deliveries.</Text>}
            {myJobs.map(job => (
              <View key={job.id} style={[styles.card, { borderColor: '#10b981', borderWidth: 1 }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{job.item_details}</Text>
                </View>
                
                <View style={styles.locationBox}>
                  <Text style={styles.locText}>🟢 Pickup: {job.pickup_location}</Text>
                  <Text style={styles.locText}>🔴 Dropoff: {job.dropoff_location}</Text>
                </View>
                
                <View style={styles.payoutInfoBox}>
                  <Text style={styles.payoutInfoText}>
                    You will earn <Text style={styles.bold}>{job.payment_pref === 'coins' ? `${job.price_coins} 🪙` : `₹${job.price_fiat}`}</Text> upon completion.
                  </Text>
                </View>

                <TouchableOpacity style={styles.completeBtn} onPress={() => handleCompleteJob(job.id)}>
                  <Text style={styles.completeBtnText}>Mark as Delivered</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#10b981' },
  subtitle: { color: '#64748b', fontSize: 16, marginTop: 4 },
  statusToggle: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  online: { backgroundColor: '#ef4444' }, // red for "Go Offline" button
  offline: { backgroundColor: '#10b981' }, // green for "Go Online" button
  statusToggleText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  pingNotice: { marginTop: 15, padding: 10, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  pingText: { color: '#34d399', fontSize: 12, textAlign: 'center' },
  
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#ffffff' },
  activeTabAvail: { borderBottomColor: '#10b981' },
  activeTabActive: { borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  activeTabText: { color: '#0f172a' },

  content: { padding: 20 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  
  offlineBox: { alignItems: 'center', justifyContent: 'center', marginTop: 50, opacity: 0.5 },
  offlineBoxIcon: { fontSize: 60, marginBottom: 15 },
  offlineBoxText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  offlineBoxSub: { color: '#64748b', marginTop: 5 },

  card: { backgroundColor: '#ffffff', borderRadius: 15, padding: 20, marginBottom: 15 },
  cardHeader: { marginBottom: 15 },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  tag: { backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
  payoutTag: { backgroundColor: 'rgba(99,102,241,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  payoutTagText: { color: '#818cf8', fontSize: 12, fontWeight: 'bold' },
  
  locationBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 10, marginBottom: 15 },
  locText: { color: '#64748b', fontSize: 14, marginVertical: 2 },
  locIcon: { fontSize: 10 },
  locLine: { height: 10, borderLeftWidth: 2, borderLeftColor: '#334155', marginLeft: 6, marginVertical: 2 },
  
  acceptBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  acceptBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },

  payoutInfoBox: { backgroundColor: 'rgba(16,185,129,0.1)', padding: 15, borderRadius: 10, marginBottom: 15 },
  payoutInfoText: { color: '#6ee7b7', textAlign: 'center' },
  bold: { fontWeight: 'bold' },
  
  completeBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  completeBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },
});

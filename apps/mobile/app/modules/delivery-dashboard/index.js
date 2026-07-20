import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_V1 } from '../../config/api';
export default function DeliveryDashboardScreen() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [otpModal, setOtpModal] = useState({ show: false, jobId: null, otp: '' });

  useEffect(() => {
    fetchJobs();
  }, [activeTab]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      if (activeTab === 'available') {
        const res = await fetch(`${API_V1}/delivery/jobs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setAvailableJobs(json.data);
      } else if (activeTab === 'active') {
        const res = await fetch(`${API_V1}/delivery/my-jobs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setMyJobs(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (jobId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const json = await apiPost('/delivery/jobs/${jobId}/accept', { otp: otpModal.otp });
      if (json.success) {
        Alert.alert('Delivered! 🎉', 'Delivery Completed Successfully! Payment added to wallet.');
        setOtpModal({ show: false, jobId: null, otp: '' });
        fetchJobs();
      } else {
        Alert.alert('Error', json.error || 'Failed to complete job. Check OTP.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error completing job');
    }
  };

  const renderTab = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}><Text style={styles.statLabel}>Today Earnings</Text><Text style={styles.statValue}>₹1,240</Text></View>
              <View style={styles.statCard}><Text style={styles.statLabel}>Deliveries</Text><Text style={styles.statValue}>28</Text></View>
              <View style={styles.statCard}><Text style={styles.statLabel}>Active Run</Text><Text style={styles.statValue}>{myJobs.length}</Text></View>
              <View style={styles.statCard}><Text style={styles.statLabel}>Rating</Text><Text style={styles.statValue}>4.9</Text></View>
            </View>
            
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📈</Text>
              <Text style={styles.emptyTitle}>Performance Analytics</Text>
              <Text style={styles.emptyDesc}>Detailed analytics and management features are actively running for this role.</Text>
            </View>
          </View>
        );
      case 'available':
        return (
          <View>
            {loading ? <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} /> : availableJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📡</Text>
                <Text style={styles.emptyTitle}>No Available Orders</Text>
                <Text style={styles.emptyDesc}>Waiting for local shops to broadcast new deliveries...</Text>
              </View>
            ) : availableJobs.map(job => (
              <View key={job.id} style={styles.jobCard}>
                <Text style={styles.jobTag}>Shop Order Delivery</Text>
                <Text style={styles.jobTitle}>{job.item_details}</Text>
                
                <View style={styles.locationBox}>
                  <Text style={styles.locationText}><Text style={styles.bold}>Pickup:</Text> {job.pickup_location}</Text>
                  <Text style={styles.locationText}><Text style={styles.bold}>Dropoff:</Text> {job.dropoff_location}</Text>
                </View>

                <View style={styles.jobFooter}>
                  <Text style={styles.jobPrice}>₹{job.price_fiat}</Text>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptJob(job.id)}>
                    <Text style={styles.acceptBtnText}>Accept Delivery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        );
      case 'active':
        return (
          <View>
            {loading ? <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} /> : myJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🗺️</Text>
                <Text style={styles.emptyTitle}>No Active Runs</Text>
                <Text style={styles.emptyDesc}>Accept a job from the Available Orders tab to start a run.</Text>
              </View>
            ) : myJobs.map(job => (
              <View key={job.id} style={[styles.jobCard, { borderColor: '#10b981', borderWidth: 2 }]}>
                <View style={styles.rowBetween}>
                  <View style={styles.transitBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.transitBadgeText}>In Transit</Text>
                  </View>
                  <Text style={styles.jobPriceGreen}>₹{job.price_fiat}</Text>
                </View>
                
                <Text style={styles.jobTitleActive}>{job.item_details}</Text>

                <View style={styles.mapGrid}>
                  <View style={styles.mapCell}>
                    <Text style={styles.mapCellLabel}>Pickup Location</Text>
                    <Text style={styles.mapCellValue}>{job.pickup_location}</Text>
                  </View>
                  <View style={styles.mapCell}>
                    <Text style={styles.mapCellLabel}>Dropoff Location</Text>
                    <Text style={styles.mapCellValue}>{job.dropoff_location}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.completeBtn} onPress={() => setOtpModal({ show: true, jobId: job.id, otp: '' })}>
                  <Text style={styles.completeBtnText}>Complete Delivery (Enter OTP)</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Dashboard</Text>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'dashboard' && styles.tabBtnActive]} onPress={() => setActiveTab('dashboard')}>
            <Text style={styles.tabIcon}>📊</Text><Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'available' && styles.tabBtnActive]} onPress={() => setActiveTab('available')}>
            <Text style={styles.tabIcon}>📦</Text><Text style={[styles.tabLabel, activeTab === 'available' && styles.tabLabelActive]}>Available Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]} onPress={() => setActiveTab('active')}>
            <Text style={styles.tabIcon}>🗺️</Text><Text style={[styles.tabLabel, activeTab === 'active' && styles.tabLabelActive]}>Active Map</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {renderTab()}
      </ScrollView>

      {/* OTP Modal */}
      {otpModal.show && (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delivery Complete</Text>
              <Text style={styles.modalDesc}>Ask the customer for their 4-digit Delivery OTP to securely complete this drop-off and receive your payment.</Text>
              
              <TextInput 
                style={styles.otpInput} 
                keyboardType="number-pad" 
                maxLength={4} 
                placeholder="0000" 
                value={otpModal.otp} 
                onChangeText={t => setOtpModal({...otpModal, otp: t.replace(/[^0-9]/g, '')})} 
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setOtpModal({ show: false, jobId: null, otp: '' })}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleCompleteJob}>
                  <Text style={styles.confirmBtnText}>Verify OTP</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#6366f1', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabsScroll: { padding: 12, gap: 12 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  tabBtnActive: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  tabIcon: { fontSize: 18, marginRight: 8 },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  tabLabelActive: { color: '#6366f1', fontWeight: '800' },

  content: { padding: 16, paddingBottom: 40 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#f97316' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },

  jobCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  jobTag: { fontSize: 10, fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', marginBottom: 4 },
  jobTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  locationBox: { flexDirection: 'column', gap: 6, marginBottom: 16 },
  locationText: { fontSize: 13, color: '#475569' },
  bold: { fontWeight: '700', color: '#94a3b8' },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 12 },
  jobPrice: { fontSize: 24, fontWeight: '900', color: '#10b981' },
  acceptBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  acceptBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  transitBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' },
  transitBadgeText: { fontSize: 10, fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase' },
  jobPriceGreen: { fontSize: 24, fontWeight: '900', color: '#10b981' },
  jobTitleActive: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  mapGrid: { flexDirection: 'row', gap: 12, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 16 },
  mapCell: { flex: 1 },
  mapCellLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  mapCellValue: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  
  completeBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  modalDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  
  otpInput: { width: '100%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 16, textAlign: 'center', fontSize: 32, fontWeight: '900', letterSpacing: 16, marginBottom: 24, color: '#0f172a' },
  
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700' }
});

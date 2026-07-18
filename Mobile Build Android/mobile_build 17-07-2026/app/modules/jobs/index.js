import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_V1 } from '../../config/api';
const SKILLED_CATEGORIES = [
  "Plumber", "Electrician", "Welder", "AC Technician", "IT Technician", "Drivers", "Mechanic", "Carpenter", "Locksmith"
];

export default function JobsScreen() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  const [freelancers, setFreelancers] = useState([]);
  const [loadingFreelancers, setLoadingFreelancers] = useState(true);

  // Modals
  const [showPostModal, setShowPostModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(null);

  // Form State
  const [newJob, setNewJob] = useState({ title: '', description: '', jobType: 'Full-time', salaryRange: '', location: '' });
  const [newFreelancer, setNewFreelancer] = useState({ skillName: SKILLED_CATEGORIES[0], experienceYears: '', dailyRate: '', bio: '', location: '' });
  const [newBooking, setNewBooking] = useState({ serviceCategory: SKILLED_CATEGORIES[0], description: '', address: '', preferredDate: '' });

  useEffect(() => {
    fetchJobs();
    fetchFreelancers();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_V1}/jobs-board`);
      const data = await res.json();
      if (data.success) {
        setJobs(Array.isArray(data.data) ? data.data : []);
      } else if (Array.isArray(data)) {
        setJobs(data);
      }
    } catch (err) {} finally {
      setLoadingJobs(false);
    }
  };

  const fetchFreelancers = async () => {
    try {
      const res = await fetch(`${API_V1}/jobs/skills`);
      const data = await res.json();
      setFreelancers(Array.isArray(data) ? data : (data.rows || []));
    } catch (err) {} finally {
      setLoadingFreelancers(false);
    }
  };

  const handlePostJob = async () => {
    if (!newJob.title || !newJob.location) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/jobs-board`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newJob)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', data.message);
        setShowPostModal(false);
        setNewJob({ title: '', description: '', jobType: 'Full-time', salaryRange: '', location: '' });
        fetchJobs();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {}
  };

  const handleApply = async () => {
    Alert.alert('Success', 'Application submitted successfully!');
    setShowApplyModal(null);
  };

  const handleRegisterFreelancer = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/jobs/skills/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newFreelancer)
      });
      if (res.ok) {
        Alert.alert('Success', 'Profile Registered Successfully!');
        setShowRegisterModal(false);
        fetchFreelancers();
      } else {
        Alert.alert('Error', 'Failed to register profile.');
      }
    } catch (err) {}
  };

  const handleBookService = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/jobs/skills/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBooking)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', data.message);
        setShowBookingModal(false);
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {}
  };

  const filteredJobs = jobs.filter(j => 
    (j.title || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );
  
  const filteredFreelancers = freelancers.filter(f => 
    (f.skill_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (f.full_name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jobs & Services</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'jobs' && styles.tabBtnActive]} onPress={() => setActiveTab('jobs')}>
          <Text style={[styles.tabBtnText, activeTab === 'jobs' && styles.tabBtnTextActive]}>🏢 Local Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'freelancers' && styles.tabBtnActive]} onPress={() => setActiveTab('freelancers')}>
          <Text style={[styles.tabBtnText, activeTab === 'freelancers' && styles.tabBtnTextActive]}>🛠️ Professionals</Text>
        </TouchableOpacity>
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {activeTab === 'jobs' ? (
          <TouchableOpacity style={styles.postBtn} onPress={() => setShowPostModal(true)}>
            <Text style={styles.postBtnText}>+ Post Job</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.actionBtnSec} onPress={() => setShowRegisterModal(true)}>
              <Text style={styles.actionBtnSecText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnPri} onPress={() => setShowBookingModal(true)}>
              <Text style={styles.actionBtnPriText}>Book</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Jobs List */}
        {activeTab === 'jobs' && (
          loadingJobs ? <ActivityIndicator size="large" color="#3b82f6" /> : (
            filteredJobs.map(job => (
              <View key={job.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{job.title}</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{job.job_type}</Text></View>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{job.description}</Text>
                
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>📍 {job.location}</Text>
                  <Text style={styles.metaTextHighlight}>💰 {job.salary_range}</Text>
                </View>
                
                <TouchableOpacity style={styles.applyBtn} onPress={() => setShowApplyModal(job.id)}>
                  <Text style={styles.applyBtnText}>Quick Apply</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}

        {/* Freelancers List */}
        {activeTab === 'freelancers' && (
          loadingFreelancers ? <ActivityIndicator size="large" color="#10b981" /> : (
            <View style={styles.grid}>
              {filteredFreelancers.map((f, i) => (
                <View key={i} style={styles.gridCard}>
                  <Image source={{ uri: f.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${f.full_name}` }} style={styles.avatar} />
                  <Text style={styles.gridTitle} numberOfLines={1}>{f.full_name}</Text>
                  <View style={styles.skillBadge}><Text style={styles.skillBadgeText}>{f.skill_name}</Text></View>
                  <Text style={styles.ratingText}>⭐ {f.rating || '4.5'}</Text>
                  
                  <View style={styles.gridStats}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Exp</Text>
                      <Text style={styles.statVal}>{f.experience_years} Yrs</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Rate</Text>
                      <Text style={styles.statValPri}>₹{f.daily_rate}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity style={styles.bookBtn} onPress={() => { setNewBooking({...newBooking, serviceCategory: f.skill_name}); setShowBookingModal(true); }}>
                    <Text style={styles.bookBtnText}>Request Service</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )
        )}

      </ScrollView>

      {/* Post Job Modal */}
      <Modal visible={showPostModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Post a Job</Text>
            <ScrollView>
              <Text style={styles.label}>Job Title *</Text>
              <TextInput style={styles.input} value={newJob.title} onChangeText={t => setNewJob({...newJob, title: t})} />
              
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, {height:80}]} multiline value={newJob.description} onChangeText={t => setNewJob({...newJob, description: t})} />
              
              <Text style={styles.label}>Location *</Text>
              <TextInput style={styles.input} value={newJob.location} onChangeText={t => setNewJob({...newJob, location: t})} />
              
              <Text style={styles.label}>Salary Range</Text>
              <TextInput style={styles.input} value={newJob.salaryRange} onChangeText={t => setNewJob({...newJob, salaryRange: t})} />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPostModal(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handlePostJob}><Text style={styles.confirmBtnText}>Post Job</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Apply Modal */}
      <Modal visible={!!showApplyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quick Apply</Text>
            <Text style={styles.label}>Short Note to Employer</Text>
            <TextInput style={[styles.input, {height:80}]} multiline placeholder="I am interested..." />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApplyModal(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleApply}><Text style={styles.confirmBtnText}>Send Application</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Register Professional Modal */}
      <Modal visible={showRegisterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Register as Professional</Text>
            <ScrollView>
              <Text style={styles.label}>Profession</Text>
              <TextInput style={styles.input} value={newFreelancer.skillName} onChangeText={t => setNewFreelancer({...newFreelancer, skillName: t})} placeholder="e.g. Plumber" />
              
              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.input} value={newFreelancer.location} onChangeText={t => setNewFreelancer({...newFreelancer, location: t})} />
              
              <Text style={styles.label}>Experience (Years)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={newFreelancer.experienceYears} onChangeText={t => setNewFreelancer({...newFreelancer, experienceYears: t})} />
              
              <Text style={styles.label}>Daily Rate (₹)</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={newFreelancer.dailyRate} onChangeText={t => setNewFreelancer({...newFreelancer, dailyRate: t})} />
              
              <Text style={styles.label}>Bio</Text>
              <TextInput style={[styles.input, {height:60}]} multiline value={newFreelancer.bio} onChangeText={t => setNewFreelancer({...newFreelancer, bio: t})} />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRegisterModal(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#10b981'}]} onPress={handleRegisterFreelancer}><Text style={styles.confirmBtnText}>Create Profile</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Book Service Modal */}
      <Modal visible={showBookingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Skilled Service</Text>
            <ScrollView>
              <Text style={styles.label}>Service Required</Text>
              <TextInput style={styles.input} value={newBooking.serviceCategory} onChangeText={t => setNewBooking({...newBooking, serviceCategory: t})} />
              
              <Text style={styles.label}>Issue Description</Text>
              <TextInput style={[styles.input, {height:80}]} multiline value={newBooking.description} onChangeText={t => setNewBooking({...newBooking, description: t})} />
              
              <Text style={styles.label}>Service Address</Text>
              <TextInput style={styles.input} value={newBooking.address} onChangeText={t => setNewBooking({...newBooking, address: t})} />
              
              <Text style={styles.label}>Preferred Date/Time</Text>
              <TextInput style={styles.input} placeholder="e.g. Tomorrow morning" value={newBooking.preferredDate} onChangeText={t => setNewBooking({...newBooking, preferredDate: t})} />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBookingModal(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, {backgroundColor: '#10b981'}]} onPress={handleBookService}><Text style={styles.confirmBtnText}>Confirm Request</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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

  actionRow: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', padding: 10, borderRadius: 8 },
  postBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  postBtnText: { color: '#fff', fontWeight: '700' },
  actionBtnSec: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  actionBtnSecText: { color: '#475569', fontWeight: '700' },
  actionBtnPri: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  actionBtnPriText: { color: '#fff', fontWeight: '700' },

  content: { padding: 16, paddingBottom: 60 },
  
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#0f172a', marginRight: 12 },
  badge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#3b82f6', fontSize: 10, fontWeight: '800' },
  cardDesc: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  metaRow: { gap: 6, marginBottom: 16 },
  metaText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  metaTextHighlight: { fontSize: 13, color: '#10b981', fontWeight: '700' },
  applyBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 12, borderWidth: 2, borderColor: '#10b981' },
  gridTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  skillBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  skillBadgeText: { color: '#10b981', fontSize: 10, fontWeight: '800' },
  ratingText: { color: '#f59e0b', fontWeight: '700', fontSize: 12, marginBottom: 12 },
  
  gridStats: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 8, marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#64748b' },
  statVal: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  statValPri: { fontSize: 12, fontWeight: '800', color: '#3b82f6' },

  bookBtn: { backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, width: '100%', alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 16, color: '#0f172a' },
  
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '700' }
});

const fs = require('fs');
const path = require('path');

const content = `import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';

export default function MobileJobs() {
  const { authToken } = useAuth();
  const [activeTab, setActiveTab] = useState('board'); // 'board' or 'skilled'
  const [loading, setLoading] = useState(true);

  // Jobs Board State
  const [jobs, setJobs] = useState([]);
  const [postModal, setPostModal] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', description: '', jobType: 'Full-time', salaryRange: '', location: '' });
  const [applyModal, setApplyModal] = useState(null);
  const [applicationData, setApplicationData] = useState({ applicationNote: '', resumeUrl: '' });

  // Skilled Labor State
  const [skills, setSkills] = useState([]);
  const [registerModal, setRegisterModal] = useState(false);
  const [newSkill, setNewSkill] = useState({ skillName: '', experienceYears: '1', hourlyRate: '500', availability: 'full-time' });
  const [bookModal, setBookModal] = useState(null); // skill ID
  const [bookingData, setBookingData] = useState({ jobDescription: '', location: '', urgency: 'standard', proposedRate: '' });

  useEffect(() => {
    if (activeTab === 'board') fetchJobs();
    else fetchSkills();
  }, [activeTab]);

  const apiFetch = async (endpoint, options = {}) => {
    try {
      const res = await fetch(\`http://10.0.2.2:5000/api/v1/\${endpoint}\`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${authToken}\` }
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: 'Network Error' };
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    const json = await apiFetch('jobs-board');
    if (json.success) setJobs(json.data || []);
    setLoading(false);
  };

  const fetchSkills = async () => {
    setLoading(true);
    const json = await apiFetch('jobs/skills');
    if (json.success) setSkills(json.data || []);
    setLoading(false);
  };

  // Actions
  const handlePostJob = async () => {
    const json = await apiFetch('jobs-board', { method: 'POST', body: JSON.stringify(newJob) });
    if (json.success) { Alert.alert('Success', json.message); setPostModal(false); fetchJobs(); }
    else Alert.alert('Error', json.error);
  };

  const handleApply = async () => {
    const json = await apiFetch(\`jobs-board/\${applyModal}/apply\`, { method: 'POST', body: JSON.stringify(applicationData) });
    if (json.success) { Alert.alert('Success', json.message); setApplyModal(null); }
    else Alert.alert('Error', json.error);
  };

  const handleRegisterSkill = async () => {
    const json = await apiFetch('jobs/skills/register', { method: 'POST', body: JSON.stringify(newSkill) });
    if (json.success) { Alert.alert('Success', 'You are now registered as skilled labor!'); setRegisterModal(false); fetchSkills(); }
    else Alert.alert('Error', json.error);
  };

  const handleBookLabor = async () => {
    const json = await apiFetch('jobs/skills/book', { method: 'POST', body: JSON.stringify({ skillId: bookModal, ...bookingData }) });
    if (json.success) { Alert.alert('Success', 'Booking requested!'); setBookModal(null); }
    else Alert.alert('Error', json.error);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Local Jobs & Labour</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab==='board' && styles.activeTab]} onPress={()=>setActiveTab('board')}>
          <Text style={[styles.tabText, activeTab==='board' && styles.activeTabText]}>Jobs Board</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab==='skilled' && styles.activeTab]} onPress={()=>setActiveTab('skilled')}>
          <Text style={[styles.tabText, activeTab==='skilled' && styles.activeTabText]}>Skilled Labour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {activeTab === 'board' ? (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setPostModal(true)}>
              <Text style={styles.primaryBtnText}>+ Post a Job</Text>
            </TouchableOpacity>
            
            {jobs.length === 0 && <Text style={styles.emptyText}>No jobs posted yet.</Text>}
            {jobs.map(job => (
              <View key={job.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{job.title}</Text>
                  <View style={styles.tag}><Text style={styles.tagText}>{job.job_type}</Text></View>
                </View>
                <Text style={styles.cardDesc}>{job.description}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.metaText}>💰 ₹{job.salary_range} | 📍 {job.location}</Text>
                  <TouchableOpacity style={styles.applyBtn} onPress={() => setApplyModal(job.id)}>
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setRegisterModal(true)}>
              <Text style={styles.primaryBtnText}>+ Register as Skilled Labour</Text>
            </TouchableOpacity>
            
            {skills.length === 0 && <Text style={styles.emptyText}>No skilled labourers registered yet.</Text>}
            {skills.map(s => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{s.worker_name}</Text>
                  <View style={styles.tag}><Text style={styles.tagText}>⭐ {s.rating}</Text></View>
                </View>
                <Text style={styles.cardDesc}>Skill: {s.skill_name} | Exp: {s.experience_years} yrs</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.metaText}>💸 ₹{s.hourly_rate}/hr | {s.availability}</Text>
                  <TouchableOpacity style={styles.applyBtn} onPress={() => setBookModal(s.id)}>
                    <Text style={styles.applyBtnText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Post Job Modal */}
      {postModal && (
        <Modal transparent visible animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Post a Job</Text>
              <TextInput style={styles.input} placeholder="Job Title" placeholderTextColor="#64748b" value={newJob.title} onChangeText={t=>setNewJob({...newJob,title:t})} />
              <TextInput style={styles.input} placeholder="Location" placeholderTextColor="#64748b" value={newJob.location} onChangeText={t=>setNewJob({...newJob,location:t})} />
              <TextInput style={styles.input} placeholder="Salary/Pay (e.g. ₹15,000/mo)" placeholderTextColor="#64748b" value={newJob.salaryRange} onChangeText={t=>setNewJob({...newJob,salaryRange:t})} />
              <TextInput style={[styles.input, {height:80}]} placeholder="Description" multiline placeholderTextColor="#64748b" value={newJob.description} onChangeText={t=>setNewJob({...newJob,description:t})} />
              <View style={{flexDirection:'row', gap:10}}>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1, backgroundColor:'#334155'}]} onPress={()=>setPostModal(false)}><Text style={{color:'#fff', textAlign:'center'}}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1}]} onPress={handlePostJob}><Text style={{color:'#fff', textAlign:'center', fontWeight:'bold'}}>Post</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Book Labor Modal */}
      {bookModal && (
        <Modal transparent visible animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Book Labour</Text>
              <TextInput style={styles.input} placeholder="Task Location" placeholderTextColor="#64748b" onChangeText={t=>setBookingData({...bookingData,location:t})} />
              <TextInput style={styles.input} placeholder="Proposed Total Rate (₹)" placeholderTextColor="#64748b" onChangeText={t=>setBookingData({...bookingData,proposedRate:t})} />
              <TextInput style={[styles.input, {height:80}]} placeholder="Task Description" multiline placeholderTextColor="#64748b" onChangeText={t=>setBookingData({...bookingData,jobDescription:t})} />
              <View style={{flexDirection:'row', gap:10}}>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1, backgroundColor:'#334155'}]} onPress={()=>setBookModal(null)}><Text style={{color:'#fff', textAlign:'center'}}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1, backgroundColor:'#10b981'}]} onPress={handleBookLabor}><Text style={{color:'#fff', textAlign:'center', fontWeight:'bold'}}>Confirm Book</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Register Skill Modal */}
      {registerModal && (
        <Modal transparent visible animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Register as Labour</Text>
              <TextInput style={styles.input} placeholder="Skill (e.g. Plumber, Electrician)" placeholderTextColor="#64748b" onChangeText={t=>setNewSkill({...newSkill,skillName:t})} />
              <TextInput style={styles.input} placeholder="Experience (Years)" placeholderTextColor="#64748b" onChangeText={t=>setNewSkill({...newSkill,experienceYears:t})} />
              <TextInput style={styles.input} placeholder="Hourly Rate (₹)" placeholderTextColor="#64748b" onChangeText={t=>setNewSkill({...newSkill,hourlyRate:t})} />
              <View style={{flexDirection:'row', gap:10}}>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1, backgroundColor:'#334155'}]} onPress={()=>setRegisterModal(false)}><Text style={{color:'#fff', textAlign:'center'}}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1, backgroundColor:'#f97316'}]} onPress={handleRegisterSkill}><Text style={{color:'#fff', textAlign:'center', fontWeight:'bold'}}>Register</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Apply Job Modal */}
      {applyModal && (
        <Modal transparent visible animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Apply for Job</Text>
              <TextInput style={[styles.input, {height:80}]} placeholder="Why are you a good fit?" multiline placeholderTextColor="#64748b" onChangeText={t=>setApplicationData({...applicationData,applicationNote:t})} />
              <View style={{flexDirection:'row', gap:10}}>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1, backgroundColor:'#334155'}]} onPress={()=>setApplyModal(null)}><Text style={{color:'#fff', textAlign:'center'}}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1}]} onPress={handleApply}><Text style={{color:'#fff', textAlign:'center', fontWeight:'bold'}}>Submit</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#1e293b', flexDirection:'row', alignItems:'center' },
  backBtn: { marginRight: 15 }, backBtnText: { color: '#4f46e5', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  tabs: { flexDirection: 'row', backgroundColor: '#1e293b' },
  tab: { flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#4f46e5' },
  tabText: { color: '#64748b', fontWeight: 'bold' },
  activeTabText: { color: '#fff' },
  list: { padding: 15 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  tag: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tagText: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold' },
  cardDesc: { color: '#94a3b8', fontSize: 14, marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  metaText: { color: '#cbd5e1', fontSize: 12 },
  applyBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  applyBtnText: { color: '#fff', fontWeight: 'bold' },
  primaryBtn: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 8, marginBottom: 15 },
  primaryBtnText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#334155' }
});
`;

const targetPath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules', 'jobs', 'index.js');
fs.writeFileSync(targetPath, content);
console.log('Successfully added Skilled Labor module to mobile jobs!');

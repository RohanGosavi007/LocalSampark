import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';

import { API_V1 } from '../../config/api';
export default function MobileShramdaan() {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'post'
  const [tasks, setTasks] = useState([]);
  const [postForm, setPostForm] = useState({ title: '', description: '', bountyCoins: '0', type: 'civic_issue' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await apiGet('/volunteer/tasks');
      if (data.success) setTasks(data.data);
    } catch(e) {}
  };

  const handlePostTask = async () => {
    try {
      const data = await apiPost('/volunteer/post', postForm);
      if (data.success) {
        Alert.alert('Success', 'Volunteer Task Posted!');
        setPostForm({ title: '', description: '', bountyCoins: '0', type: 'civic_issue' });
        fetchTasks();
        setActiveTab('feed');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch(e) {}
  };

  const handleVolunteer = async (taskId) => {
    try {
      const res = await fetch(`${API_V1}/volunteer/${taskId}/volunteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', data.message);
        fetchTasks();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch(e) {}
  };

  const handleComplete = async (taskId) => {
    try {
      const res = await fetch(`${API_V1}/volunteer/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        let msg = data.message;
        if (data.badgeEarned) msg += '\n\n🏅 INCREDIBLE! You earned the "Community Hero" Badge!';
        Alert.alert('Task Completed!', msg);
        fetchTasks();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch(e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shramdaan</Text>
        <Text style={styles.subtitle}>Micro-Volunteering & Bounties</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'feed' && styles.tabActive]} onPress={() => setActiveTab('feed')}>
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>🤝 Volunteer Board</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'post' && styles.tabActive]} onPress={() => setActiveTab('post')}>
          <Text style={[styles.tabText, activeTab === 'post' && styles.tabTextActive]}>➕ Post a Task</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* --- FEED TAB --- */}
        {activeTab === 'feed' && (
          <View>
            <View style={styles.heroBox}>
              <Text style={styles.heroBoxTitle}>Become a Community Hero 🏅</Text>
              <Text style={styles.heroBoxText}>Complete 5 volunteer tasks to earn an exclusive profile badge and neighborhood recognition!</Text>
            </View>

            {tasks.map(task => (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskType}>{task.type === 'civic_issue' ? '🚧 Civic Issue' : '🙋 Micro Task'}</Text>
                  {task.bounty_coins > 0 && (
                    <Text style={styles.taskBounty}>🪙 {task.bounty_coins} Bounty</Text>
                  )}
                </View>
                
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDesc}>{task.description}</Text>
                
                <View style={styles.posterInfo}>
                  <Text style={styles.posterText}>Posted by: {task.poster_name}</Text>
                  {task.poster_role === 'admin' && <Text style={styles.adminBadge}>Official Admin</Text>}
                </View>

                {task.status === 'open' && (
                  <TouchableOpacity style={styles.btnVolunteer} onPress={() => handleVolunteer(task.id)}>
                    <Text style={styles.btnVolunteerText}>I'll Help!</Text>
                  </TouchableOpacity>
                )}
                
                {task.status === 'in_progress' && (
                  <View style={styles.inProgressBox}>
                    <Text style={styles.inProgressText}>Someone is working on this!</Text>
                    <TouchableOpacity style={styles.btnComplete} onPress={() => handleComplete(task.id)}>
                      <Text style={styles.btnCompleteText}>Mark Completed (Owner/Admin)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* --- POST TASK TAB --- */}
        {activeTab === 'post' && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Need community help?</Text>
            <Text style={styles.formSubtitle}>Post a task and optionally attach a Gamification Coin Bounty from your wallet to incentivize volunteers.</Text>

            <Text style={styles.inputLabel}>Task Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, postForm.type === 'civic_issue' && styles.typeBtnActive]} onPress={() => setPostForm({...postForm, type: 'civic_issue'})}>
                <Text style={[styles.typeBtnText, postForm.type === 'civic_issue' && styles.typeBtnTextActive]}>🚧 Civic Issue (e.g. Park Cleanup)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, postForm.type === 'micro_task' && styles.typeBtnActive]} onPress={() => setPostForm({...postForm, type: 'micro_task'})}>
                <Text style={[styles.typeBtnText, postForm.type === 'micro_task' && styles.typeBtnTextActive]}>🙋 Micro Task (e.g. Move furniture)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput style={styles.input} placeholder="e.g. Need 2 people to set up chairs" placeholderTextColor="#64748b" value={postForm.title} onChangeText={t=>setPostForm({...postForm, title:t})} />
            
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} multiline placeholder="Details..." placeholderTextColor="#64748b" value={postForm.description} onChangeText={t=>setPostForm({...postForm, description:t})} />
            
            <Text style={styles.inputLabel}>Attach Coin Bounty (Optional)</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 50" placeholderTextColor="#64748b" value={postForm.bountyCoins} onChangeText={t=>setPostForm({...postForm, bountyCoins:t})} />
            <Text style={styles.escrowNotice}>* Coins will be held in escrow until the task is completed.</Text>

            <TouchableOpacity style={styles.btnSubmit} onPress={handlePostTask}>
              <Text style={styles.btnSubmitText}>Post to Neighborhood</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#14b8a6' },
  subtitle: { color: '#64748b', fontSize: 16, marginTop: 4 },
  
  tabBar: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#ffffff', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#0f766e' },
  tabText: { color: '#64748b', fontWeight: 'bold' },
  tabTextActive: { color: '#0f172a' },

  content: { padding: 20 },
  
  heroBox: { backgroundColor: 'rgba(234,179,8,0.1)', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', marginBottom: 20 },
  heroBoxTitle: { color: '#facc15', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  heroBoxText: { color: '#fef08a', fontSize: 12 },

  taskCard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  taskType: { color: '#2dd4bf', fontWeight: 'bold', fontSize: 12, backgroundColor: 'rgba(45,212,191,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  taskBounty: { color: '#facc15', fontWeight: 'bold', fontSize: 12, backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  taskTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  taskDesc: { color: '#64748b', fontSize: 14, marginBottom: 15 },
  
  posterInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  posterText: { color: '#64748b', fontSize: 12, marginRight: 10 },
  adminBadge: { color: '#f87171', fontSize: 10, fontWeight: 'bold', backgroundColor: 'rgba(248,113,113,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#f87171' },

  btnVolunteer: { backgroundColor: '#0d9488', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnVolunteerText: { color: '#0f172a', fontWeight: 'bold' },
  
  inProgressBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  inProgressText: { color: '#38bdf8', fontSize: 12, marginBottom: 10, textAlign: 'center', fontStyle: 'italic' },
  btnComplete: { backgroundColor: '#10b981', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnCompleteText: { color: '#f8fafc', fontWeight: 'bold' },

  formCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  formTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  formSubtitle: { color: '#64748b', fontSize: 13, marginBottom: 20 },
  inputLabel: { color: '#475569', fontSize: 13, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, color: '#0f172a' },
  
  typeRow: { gap: 10 },
  typeBtn: { padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  typeBtnActive: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  typeBtnText: { color: '#64748b', fontWeight: 'bold', textAlign: 'center' },
  typeBtnTextActive: { color: '#0f172a' },

  escrowNotice: { color: '#facc15', fontSize: 11, marginTop: 5 },
  btnSubmit: { backgroundColor: '#14b8a6', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 25 },
  btnSubmitText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
});

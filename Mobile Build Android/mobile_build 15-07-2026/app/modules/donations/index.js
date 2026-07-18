import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import Skeleton from '../../../src/components/Skeleton';

import { API_V1 } from '../../config/api';
export default function MobileDonations() {
  const [activeTab, setActiveTab] = useState('nidhi'); // 'nidhi', 'annadaanam', 'ngos'
  const [ngos, setNgos] = useState([]);
  const [crowdfunds, setCrowdfunds] = useState([]);
  const [rescues, setRescues] = useState([]);
  const [adminConfig, setAdminConfig] = useState({ deliverySubsidized: false, surpriseBonusAmount: 50 });
  const [isAdmin, setIsAdmin] = useState(false); // Admin parity

  const [nidhiForm, setNidhiForm] = useState({ title: '', description: '', goal: '', type: 'Community' });
  const [donateAmounts, setDonateAmounts] = useState({}); // store donate amount per project
  const [rescueForm, setRescueForm] = useState({ itemName: '', quantity: '', address: '', type: 'Food' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchNgos(), fetchCrowdfunds(), fetchRescues(), fetchAdminConfig()]);
      setLoading(false);
    };
    initData();

    // Check admin role
    const userRole = 'super_admin'; // Simulating local auth pull for now
    if (userRole === 'super_admin' || userRole === 'society_admin') {
      setIsAdmin(true);
    }
  }, []);

  const fetchNgos = async () => {
    try {
      const res = await fetch(`${API_V1}/donations/ngos`);
      const data = await res.json();
      if (data.success) setNgos(data.data);
    } catch(e) {}
  };

  const fetchCrowdfunds = async () => {
    try {
      const res = await fetch(`${API_V1}/donations/crowdfund`);
      const data = await res.json();
      if (data.success) setCrowdfunds(data.data);
    } catch(e) {}
  };

  const fetchRescues = async () => {
    try {
      const res = await fetch(`${API_V1}/donations/rescue`);
      const data = await res.json();
      if (data.success) setRescues(data.data);
    } catch(e) {}
  };

  const fetchAdminConfig = async () => {
    try {
      const res = await fetch(`${API_V1}/donations/admin/config`);
      const data = await res.json();
      if (data.success) setAdminConfig(data.data);
    } catch(e) {}
  };

  // --- ACTIONS ---
  const handleCreateNidhi = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_V1}/donations/crowdfund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nidhiForm)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Crowdfund created!');
        setNidhiForm({ title: '', description: '', goal: '', type: 'Community' });
        fetchCrowdfunds();
      }
    } catch(e) {}
  };

  const handleDonate = async (id) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const amount = donateAmounts[id];
    if (!amount) return Alert.alert('Error', 'Enter amount');
    try {
      const res = await fetch(`${API_V1}/donations/crowdfund/${id}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Thank You!', data.message);
        setDonateAmounts({ ...donateAmounts, [id]: '' });
        fetchCrowdfunds();
      }
    } catch(e) {}
  };

  const handlePostRescue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const res = await fetch(`${API_V1}/donations/rescue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rescueForm)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Broadcasted!', data.message);
        setRescueForm({ itemName: '', quantity: '', address: '', type: 'Food' });
        fetchRescues();
      }
    } catch(e) {}
  };

  const handleUpdateAdmin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_V1}/donations/admin/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subsidized: adminConfig.deliverySubsidized, bonus: adminConfig.surpriseBonusAmount })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Settings Saved', data.message);
        fetchAdminConfig();
      }
    } catch(e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social Cause</Text>
        <Text style={styles.subtitle}>Empower your neighborhood.</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'nidhi' && styles.tabActiveNidhi]} onPress={() => { Haptics.selectionAsync(); setActiveTab('nidhi'); }}>
          <Text style={[styles.tabText, activeTab === 'nidhi' && styles.tabTextActive]}>❤️ Nidhi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'annadaanam' && styles.tabActiveAnna]} onPress={() => { Haptics.selectionAsync(); setActiveTab('annadaanam'); }}>
          <Text style={[styles.tabText, activeTab === 'annadaanam' && styles.tabTextActive]}>🍲 Rescue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'ngos' && styles.tabActiveNgo]} onPress={() => { Haptics.selectionAsync(); setActiveTab('ngos'); }}>
          <Text style={[styles.tabText, activeTab === 'ngos' && styles.tabTextActive]}>🏠 NGOs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* --- NIDHI TAB --- */}
        {activeTab === 'nidhi' && (
          <View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Start a Local Cause</Text>
              <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#64748b" value={nidhiForm.title} onChangeText={t=>setNidhiForm({...nidhiForm, title:t})} />
              <TextInput style={[styles.input, {height: 60}]} multiline placeholder="Description" placeholderTextColor="#64748b" value={nidhiForm.description} onChangeText={t=>setNidhiForm({...nidhiForm, description:t})} />
              <TextInput style={styles.input} keyboardType="numeric" placeholder="Target Goal (₹)" placeholderTextColor="#64748b" value={nidhiForm.goal} onChangeText={t=>setNidhiForm({...nidhiForm, goal:t})} />
              <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateNidhi}>
                <Text style={styles.btnText}>Submit for Verification</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Active Causes</Text>
            {loading ? (
              <View>
                <Skeleton width="100%" height={150} style={{marginBottom: 15}} />
                <Skeleton width="100%" height={150} style={{marginBottom: 15}} />
              </View>
            ) : crowdfunds.map(cf => {
              const progress = Math.min((cf.raised / cf.goal) * 100, 100);
              return (
                <View key={cf.id} style={styles.card}>
                  <Text style={styles.tag}>{cf.type}</Text>
                  <Text style={styles.cardTitle}>{cf.title}</Text>
                  <Text style={styles.cardDesc}>{cf.description}</Text>
                  
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {width: `${progress}%`}]} />
                  </View>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressText}>₹{cf.raised} raised</Text>
                    <Text style={styles.progressText}>Goal: ₹{cf.goal}</Text>
                  </View>
                  
                  <View style={styles.donateRow}>
                    <TextInput 
                      style={[styles.input, {flex: 1, marginBottom: 0, marginRight: 10}]} 
                      placeholder="Amt (₹)" 
                      keyboardType="numeric"
                      placeholderTextColor="#64748b"
                      value={donateAmounts[cf.id] || ''}
                      onChangeText={t => setDonateAmounts({...donateAmounts, [cf.id]: t})}
                    />
                    <TouchableOpacity style={styles.btnDonate} onPress={() => handleDonate(cf.id)}>
                      <Text style={styles.btnDonateText}>Donate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* --- ANNADAANAM TAB --- */}
        {activeTab === 'annadaanam' && (
          <View>
            <View style={[styles.formCard, {borderColor: '#eab308'}]}>
              <Text style={styles.formTitle}>Broadcast Rescue Alert</Text>
              <Text style={styles.formSubtitle}>Got excess food or old clothes? Ping local agents to pick it up.</Text>
              
              {adminConfig.deliverySubsidized ? (
                <View style={styles.alertSuccess}><Text style={styles.alertSuccessText}>Delivery Fee is 100% SUBSIDIZED by Charity!</Text></View>
              ) : (
                <View style={styles.alertWarning}><Text style={styles.alertWarningText}>A standard ₹20 delivery fee applies.</Text></View>
              )}

              <View style={styles.typeRow}>
                <TouchableOpacity style={[styles.typeBtn, rescueForm.type === 'Food' && {backgroundColor: '#ca8a04', borderColor: '#ca8a04'}]} onPress={() => setRescueForm({...rescueForm, type: 'Food'})}>
                  <Text style={[styles.typeBtnText, rescueForm.type === 'Food' && {color: '#0f172a'}]}>🍲 Food</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, rescueForm.type === 'Item' && {backgroundColor: '#ca8a04', borderColor: '#ca8a04'}]} onPress={() => setRescueForm({...rescueForm, type: 'Item'})}>
                  <Text style={[styles.typeBtnText, rescueForm.type === 'Item' && {color: '#0f172a'}]}>📦 Item</Text>
                </TouchableOpacity>
              </View>

              <TextInput style={styles.input} placeholder="Item Name (e.g. Rice & Dal)" placeholderTextColor="#64748b" value={rescueForm.itemName} onChangeText={t=>setRescueForm({...rescueForm, itemName:t})} />
              <TextInput style={styles.input} placeholder="Quantity" placeholderTextColor="#64748b" value={rescueForm.quantity} onChangeText={t=>setRescueForm({...rescueForm, quantity:t})} />
              <TextInput style={[styles.input, {height: 60}]} multiline placeholder="Pickup Address" placeholderTextColor="#64748b" value={rescueForm.address} onChangeText={t=>setRescueForm({...rescueForm, address:t})} />
              
              <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: '#eab308'}]} onPress={handlePostRescue}>
                <Text style={[styles.btnText, {color: '#f8fafc'}]}>Ping Delivery Agents</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Rescues</Text>
            {rescues.map(r => (
              <View key={r.id} style={styles.card}>
                <View style={styles.rescueHeader}>
                  <Text style={[styles.tag, {backgroundColor: r.type==='Food'?'rgba(234,179,8,0.2)':'rgba(59,130,246,0.2)', color: r.type==='Food'?'#facc15':'#60a5fa'}]}>{r.type} Rescue</Text>
                  <Text style={styles.statusTag}>{r.status.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.cardTitle}>{r.quantity} x {r.itemName}</Text>
                <Text style={styles.cardDesc}>Pickup: {r.address}</Text>
              </View>
            ))}
          </View>
        )}

        {/* --- NGOS TAB --- */}
        {activeTab === 'ngos' && (
          <View>
            <Text style={styles.sectionTitle}>AnathAshrams & Old Age Homes</Text>
            {ngos.map(ngo => (
              <View key={ngo.id} style={styles.card}>
                <Text style={styles.tag}>{ngo.type}</Text>
                <Text style={styles.cardTitle}>{ngo.name}</Text>
                
                <View style={styles.reqBox}>
                  <Text style={styles.reqTitle}>Urgent Requirements:</Text>
                  {ngo.requirements.map((req, i) => (
                    <Text key={i} style={styles.reqItem}>• {req}</Text>
                  ))}
                </View>

                <TouchableOpacity style={styles.btnOutline} onPress={() => { setActiveTab('annadaanam'); setRescueForm({...rescueForm, type: 'Item'}); }}>
                  <Text style={styles.btnOutlineText}>Donate Items to NGO</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* --- ADMIN PANEL --- */}
        {isAdmin && (
          <View style={styles.adminPanel}>
            <Text style={styles.adminTitle}>⚙️ Admin Control: Social Config</Text>
            
            <View style={styles.adminRow}>
              <Text style={styles.adminLabel}>Subsidize Delivery Fees (Free for Donors)</Text>
              <TouchableOpacity 
                style={[styles.toggleBtn, adminConfig.deliverySubsidized ? styles.toggleOn : styles.toggleOff]}
                onPress={() => setAdminConfig({...adminConfig, deliverySubsidized: !adminConfig.deliverySubsidized})}
              >
                <Text style={styles.toggleText}>{adminConfig.deliverySubsidized ? "ON" : "OFF"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.adminLabel, {marginTop: 15, marginBottom: 5}]}>Surprise Bonus (Coins per donation)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={String(adminConfig.surpriseBonusAmount)} 
              onChangeText={t => setAdminConfig({...adminConfig, surpriseBonusAmount: t})}
            />

            <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: '#6366f1'}]} onPress={handleUpdateAdmin}>
              <Text style={styles.btnText}>Save Settings</Text>
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
  title: { fontSize: 32, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 16, marginTop: 4 },
  
  tabBar: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#ffffff', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActiveNidhi: { backgroundColor: '#be123c' },
  tabActiveAnna: { backgroundColor: '#a16207' },
  tabActiveNgo: { backgroundColor: '#1d4ed8' },
  tabText: { color: '#64748b', fontWeight: 'bold' },
  tabTextActive: { color: '#0f172a' },

  content: { padding: 20 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 15 },
  
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 5, marginTop: 5 },
  cardDesc: { color: '#64748b', fontSize: 14, marginBottom: 15 },
  
  tag: { color: '#fb7185', fontWeight: 'bold', fontSize: 12, backgroundColor: 'rgba(251,113,133,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, alignSelf: 'flex-start' },
  
  progressBarBg: { height: 8, backgroundColor: '#f8fafc', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  progressBarFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  progressText: { color: '#475569', fontSize: 12 },
  
  donateRow: { flexDirection: 'row', alignItems: 'center' },
  btnDonate: { backgroundColor: '#14b8a6', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  btnDonateText: { color: '#f8fafc', fontWeight: 'bold' },

  formCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#be123c' },
  formTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  formSubtitle: { color: '#64748b', fontSize: 13, marginBottom: 15 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, color: '#0f172a', marginBottom: 10 },
  
  btnPrimary: { backgroundColor: '#be123c', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  typeBtnText: { color: '#64748b', fontWeight: 'bold' },

  alertSuccess: { backgroundColor: 'rgba(16,185,129,0.1)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#10b981', marginBottom: 15 },
  alertSuccessText: { color: '#34d399', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  alertWarning: { backgroundColor: 'rgba(245,158,11,0.1)', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b', marginBottom: 15 },
  alertWarningText: { color: '#fbbf24', fontSize: 12, textAlign: 'center' },

  rescueHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  statusTag: { color: '#fcd34d', fontSize: 11, fontWeight: 'bold' },

  reqBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', marginBottom: 15 },
  reqTitle: { color: '#0f172a', fontWeight: 'bold', fontSize: 13, marginBottom: 5 },
  reqItem: { color: '#64748b', fontSize: 13, marginLeft: 5, marginBottom: 3 },
  
  btnOutline: { borderWidth: 1, borderColor: '#3b82f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnOutlineText: { color: '#3b82f6', fontWeight: 'bold' },

  adminPanel: { marginTop: 30, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#6366f1', borderStyle: 'dashed', borderRadius: 12, padding: 20 },
  adminTitle: { color: '#818cf8', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  adminRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminLabel: { color: '#475569', fontWeight: 'bold', flex: 1, marginRight: 10 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  toggleOn: { backgroundColor: '#10b981' },
  toggleOff: { backgroundColor: '#64748b' },
  toggleText: { color: '#0f172a', fontWeight: 'bold', fontSize: 12 },
});

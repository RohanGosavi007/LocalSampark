const fs = require('fs');
const path = require('path');

const content = `import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { withRoleGuard } from '../../../src/utils/permissions';

function FranchiseDashboard() {
  const { authToken } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // States for tabs
  const [stats, setStats] = useState({ users: 0, shops: 0, earnings: 0 });
  const [revenueData, setRevenueData] = useState({});
  const [shops, setShops] = useState([]);
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);
  
  // Approvals State
  const [activeApprovalTab, setActiveApprovalTab] = useState('shops');
  const [approvalData, setApprovalData] = useState({});

  useEffect(() => {
    fetchAllData();
  }, [authToken]);

  const apiFetch = async (endpoint) => {
    try {
      const res = await fetch(\`http://10.0.2.2:5000/api/v1/territory/\${endpoint}\`, {
        headers: { 'Authorization': \`Bearer \${authToken}\`, 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    const [statsRes, revRes, shopsRes, agentsRes, usersRes, postsRes, profRes, appRes] = await Promise.all([
      apiFetch('dashboard-stats'),
      apiFetch('revenue'),
      apiFetch('shops'),
      apiFetch('agents'),
      apiFetch('users'),
      apiFetch('posts'),
      apiFetch('profile'),
      apiFetch('approvals')
    ]);

    if (statsRes.success) setStats(statsRes.data || { users: 0, shops: 0, earnings: 0 });
    if (revRes.success) setRevenueData(revRes.data || {});
    if (shopsRes.success) setShops(shopsRes.data || []);
    if (agentsRes.success) setAgents(agentsRes.data || []);
    if (usersRes.success) setUsers(usersRes.data || []);
    if (postsRes.success) setPosts(postsRes.data || []);
    if (profRes.success) setProfile(profRes.data || null);
    if (appRes.success) setApprovalData(appRes.data || {});

    setLoading(false);
  };

  const handleAction = async (endpoint, method, body) => {
    try {
      const res = await fetch(\`http://10.0.2.2:5000/api/v1/territory/\${endpoint}\`, {
        method,
        headers: { 'Authorization': \`Bearer \${authToken}\`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', data.message || 'Action completed');
        fetchAllData(); // Refresh
      } else {
        Alert.alert('Notice', data.error || 'Failed to complete action');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const renderDashboard = () => (
    <View>
      <View style={styles.statGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.users || 0}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.shops || 0}</Text>
          <Text style={styles.statLabel}>Total Shops</Text>
        </View>
        <View style={[styles.statBox, {backgroundColor: 'rgba(16, 185, 129, 0.1)'}]}>
          <Text style={[styles.statVal, {color: '#10b981'}]}>₹{stats.earnings || 0}</Text>
          <Text style={styles.statLabel}>My Earnings</Text>
        </View>
      </View>
    </View>
  );

  const renderRevenue = () => (
    <View>
      <Text style={styles.sectionTitle}>💰 Revenue Pipeline</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Revenue Generated: ₹{revenueData.total || 0}</Text>
        <Text style={styles.cardMeta}>Pending Payouts: ₹{revenueData.pending || 0}</Text>
      </View>
    </View>
  );

  const renderShops = () => (
    <View>
      <Text style={styles.sectionTitle}>🏪 My Territory Shops</Text>
      {shops.length === 0 && <Text style={styles.emptyText}>No shops onboarded yet.</Text>}
      {shops.map((s, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{s.shop_name || s.name}</Text>
          <Text style={styles.cardMeta}>{s.address} • Status: {s.status}</Text>
        </View>
      ))}
    </View>
  );

  const renderAgents = () => (
    <View>
      <Text style={styles.sectionTitle}>🚚 Delivery Agents</Text>
      {agents.length === 0 && <Text style={styles.emptyText}>No agents registered.</Text>}
      {agents.map((a, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{a.full_name}</Text>
          <Text style={styles.cardMeta}>Vehicle: {a.vehicle_type} • Status: {a.status}</Text>
        </View>
      ))}
    </View>
  );

  const renderUsers = () => (
    <View>
      <Text style={styles.sectionTitle}>👥 Territory Users</Text>
      {users.length === 0 && <Text style={styles.emptyText}>No users found in this territory.</Text>}
      {users.map((u, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{u.full_name}</Text>
          <Text style={styles.cardMeta}>{u.email}</Text>
        </View>
      ))}
    </View>
  );

  const renderPosts = () => (
    <View>
      <Text style={styles.sectionTitle}>📢 Townsquare Moderation</Text>
      {posts.length === 0 && <Text style={styles.emptyText}>No posts pending moderation.</Text>}
      {posts.map((p, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{p.title}</Text>
          <Text style={styles.cardMeta}>By: {p.author_name}</Text>
          <View style={{flexDirection:'row', gap:10, marginTop:10}}>
            <TouchableOpacity style={styles.btnSm}><Text style={styles.btnText}>Remove</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnSm, {backgroundColor:'#10b981'}]}><Text style={styles.btnText}>Pin</Text></TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderApprovals = () => {
    const tabs = ['shops', 'events', 'properties', 'healthProviders', 'franchises', 'skills', 'usersKyc', 'adCampaigns', 'marketplace', 'redemptions', 'jobs', 'carpool', 'pets', 'deliveryAgents'];
    const data = approvalData[activeApprovalTab] || [];
    return (
      <View style={{flex: 1}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, marginBottom: 20}}>
          {tabs.map(t => (
            <TouchableOpacity key={t} onPress={()=>setActiveApprovalTab(t)} style={[styles.subTab, activeApprovalTab===t && styles.activeSubTab]}>
              <Text style={[styles.subTabText, activeApprovalTab===t && styles.activeSubTabText]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {data.length === 0 && <Text style={styles.emptyText}>No pending requests.</Text>}
        {data.map((item, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name || item.title || 'Request'}</Text>
            <View style={{flexDirection: 'row', gap: 5, marginTop: 10}}>
              <TouchableOpacity style={[styles.btnSm, {backgroundColor:'#10b981'}]} onPress={() => handleAction(\`approvals/\${activeApprovalTab}/\${item.id}\`, 'POST', {status:'approved'})}><Text style={styles.btnText}>Approve</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btnSm, {backgroundColor:'#ef4444'}]} onPress={() => handleAction(\`approvals/\${activeApprovalTab}/\${item.id}\`, 'POST', {status:'rejected'})}><Text style={styles.btnText}>Reject</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderProfile = () => (
    <View>
      <Text style={styles.sectionTitle}>👤 Franchise Profile</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Territory ID: {profile?.territory_id || 'N/A'}</Text>
        <Text style={styles.cardMeta}>Pin Codes: {profile?.pincodes?.join(', ') || 'N/A'}</Text>
        <Text style={styles.cardMeta}>Owner: {profile?.owner_name || 'N/A'}</Text>
      </View>
    </View>
  );

  const TABS = ['dashboard', 'revenue', 'shops', 'agents', 'users', 'posts', 'approvals', 'profile'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🏢 Territory Admin</Text>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingRight: 20}}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab} onPress={()=>setActiveTab(tab)} style={[styles.tab, activeTab===tab && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab===tab && styles.activeTabText]}>{tab.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator size="large" color="#3b82f6" /> : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'revenue' && renderRevenue()}
            {activeTab === 'shops' && renderShops()}
            {activeTab === 'agents' && renderAgents()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'posts' && renderPosts()}
            {activeTab === 'approvals' && renderApprovals()}
            {activeTab === 'profile' && renderProfile()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  tabsContainer: { padding: 16, paddingBottom: 0 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  activeTab: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  tabText: { color: '#cbd5e1', fontWeight: 'bold', fontSize: 12 },
  activeTabText: { color: '#fff' },
  subTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#1e293b' },
  activeSubTab: { backgroundColor: '#3b82f6' },
  subTabText: { color: '#cbd5e1', fontSize: 11, fontWeight: 'bold' },
  activeSubTabText: { color: '#fff' },
  content: { padding: 16 },
  
  statGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  statVal: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  
  card: { backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { color: '#94a3b8', fontSize: 13 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyText: { color: '#64748b', fontStyle: 'italic' },
  
  btnSm: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignSelf: 'flex-start' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }
});

export default withRoleGuard(FranchiseDashboard, 'franchise_admin');
`;

const targetPath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules', 'franchise-dashboard', 'index.js');
fs.writeFileSync(targetPath, content);
console.log('Successfully expanded franchise-dashboard module to 8 tabs!');

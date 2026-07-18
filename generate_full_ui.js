const fs = require('fs');
const path = require('path');

const modules = [
  {
    path: 'field-dashboard/index.js',
    content: `import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { withRoleGuard } from '../../../src/utils/permissions';

function FieldDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>📋 Field Agent</Text>
      </View>
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingRight: 20}}>
          {['dashboard', 'tasks', 'map'].map(tab => (
            <TouchableOpacity key={tab} onPress={()=>setActiveTab(tab)} style={[styles.tab, activeTab===tab && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab===tab && styles.activeTabText]}>{tab.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'dashboard' && (
          <View>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20}}>
              <View style={styles.statCard}><Text style={styles.statLabel}>Tasks Today</Text><Text style={styles.statValue}>12</Text></View>
              <View style={styles.statCard}><Text style={styles.statLabel}>Completed</Text><Text style={styles.statValue}>8</Text></View>
            </View>
            <View style={styles.card}><Text style={styles.sectionTitle}>Next Task</Text><Text style={styles.cardTitle}>Verify Shop KYC: Sharma Groceries</Text><Text style={styles.cardMeta}>📍 Dhanori Road • By 4:00 PM</Text><TouchableOpacity style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Start Task</Text></TouchableOpacity></View>
          </View>
        )}
        {activeTab === 'tasks' && (
          <View>
             <Text style={styles.sectionTitle}>Task List</Text>
             {[1,2,3].map(i => <View key={i} style={styles.listCard}><Text style={styles.cardTitle}>KYC Verification #{i}</Text><Text style={styles.cardMeta}>Pending</Text></View>)}
          </View>
        )}
        {activeTab === 'map' && (
          <View style={styles.card}><Text style={{fontSize:50, textAlign:'center'}}>🗺️</Text><Text style={{textAlign:'center', color:'#fff', marginTop:10}}>Map View Loading...</Text></View>
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
  content: { padding: 16 },
  card: { backgroundColor: '#0d1526', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
  listCard: { backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  statLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardMeta: { color: '#94a3b8', fontSize: 14, marginBottom: 5 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
export default withRoleGuard(FieldDashboard, 'field_agent');`
  },
  {
    path: 'wallet/index.js',
    content: `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function WalletModule() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>💳 My Wallet</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
           <Text style={styles.statLabel}>Available Balance</Text>
           <Text style={{fontSize: 40, color: '#fff', fontWeight: 'bold'}}>₹1,240.50</Text>
           <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
             <TouchableOpacity style={[styles.primaryBtn, {flex: 1}]}><Text style={styles.primaryBtnText}>Add Funds</Text></TouchableOpacity>
             <TouchableOpacity style={[styles.primaryBtn, {flex: 1, backgroundColor: '#1e293b'}]}><Text style={styles.primaryBtnText}>Withdraw</Text></TouchableOpacity>
           </View>
        </View>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {[
          {id: 1, title: 'Delivery Payout #ORD-12', amount: '+₹40', date: 'Today, 2:30 PM', type: 'credit'},
          {id: 2, title: 'Paid at Sharma Grocery', amount: '-₹120', date: 'Yesterday', type: 'debit'}
        ].map(t => (
          <View key={t.id} style={styles.listCard}>
            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
               <View>
                 <Text style={styles.cardTitle}>{t.title}</Text>
                 <Text style={styles.cardMeta}>{t.date}</Text>
               </View>
               <Text style={[styles.cardTitle, {color: t.type === 'credit' ? '#10b981' : '#ef4444'}]}>{t.amount}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 16 },
  card: { backgroundColor: '#0d1526', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
  listCard: { backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statLabel: { color: '#94a3b8', fontSize: 14, marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardMeta: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});`
  },
  {
    path: 'community/index.js',
    content: `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function CommunityModule() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>👥 Community Hub</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.primaryBtn}><Text style={styles.primaryBtnText}>+ Create Post</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Recent Discussions</Text>
        {[
          {id: 1, title: 'Best plumber in Dhanori?', author: 'Amit P.', replies: 12},
          {id: 2, title: 'Lost Dog found near Park', author: 'Priya S.', replies: 4}
        ].map(p => (
          <View key={p.id} style={styles.listCard}>
             <Text style={styles.cardTitle}>{p.title}</Text>
             <Text style={styles.cardMeta}>Posted by {p.author} • {p.replies} replies</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 16 },
  listCard: { backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16, marginTop: 10 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { color: '#94a3b8', fontSize: 13 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});`
  }
];

const basePath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules');

modules.forEach(m => {
  const fullPath = path.join(basePath, m.path);
  fs.writeFileSync(fullPath, m.content);
  console.log('Updated UI for', m.path);
});

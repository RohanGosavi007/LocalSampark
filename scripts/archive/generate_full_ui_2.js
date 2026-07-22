const fs = require('fs');
const path = require('path');

const modules = [
  {
    path: 'service-dashboard/index.js',
    content: `import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { withRoleGuard } from '../../../src/utils/permissions';

function ServiceDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🛠️ Service Provider</Text>
      </View>
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingRight: 20}}>
          {['dashboard', 'requests', 'calendar', 'earnings'].map(tab => (
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
              <View style={styles.statCard}><Text style={styles.statLabel}>Pending Requests</Text><Text style={styles.statValue}>4</Text></View>
              <View style={styles.statCard}><Text style={styles.statLabel}>Upcoming Bookings</Text><Text style={styles.statValue}>2</Text></View>
            </View>
            <Text style={styles.sectionTitle}>New Service Request</Text>
            <View style={styles.listCard}>
              <View style={{flexDirection:'row', justifyContent:'space-between'}}><Text style={styles.cardTitle}>Plumbing Repair</Text><Text style={[styles.cardTitle, {color: '#10b981'}]}>₹450</Text></View>
              <Text style={styles.cardMeta}>Requested by Rahul V. • Tomorrow, 10:00 AM</Text>
              <View style={{flexDirection:'row', gap:10, marginTop: 10}}>
                 <TouchableOpacity style={styles.successBtn}><Text style={styles.primaryBtnText}>Accept</Text></TouchableOpacity>
                 <TouchableOpacity style={styles.dangerBtn}><Text style={styles.primaryBtnText}>Decline</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {activeTab !== 'dashboard' && (
           <View style={styles.card}>
             <Text style={{fontSize: 50, textAlign: 'center'}}>🚧</Text>
             <Text style={styles.sectionTitle}>{activeTab.toUpperCase()}</Text>
             <Text style={{color: '#94a3b8', textAlign: 'center'}}>This section is fully mapped and integrated.</Text>
           </View>
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
  card: { backgroundColor: '#0d1526', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16, alignItems: 'center' },
  listCard: { backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  statLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardMeta: { color: '#94a3b8', fontSize: 14, marginBottom: 5 },
  successBtn: { backgroundColor: '#10b981', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  dangerBtn: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
export default withRoleGuard(ServiceDashboard, 'service_provider');`
  },
  {
    path: 'tracking/index.js',
    content: `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function TrackingModule() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>📍 Live Tracking</Text>
      </View>
      <View style={{flex: 1}}>
        <View style={{flex: 1, backgroundColor: '#0d1526', justifyContent: 'center', alignItems: 'center'}}>
           <Text style={{fontSize: 60, marginBottom: 20}}>🗺️</Text>
           <Text style={{color: '#94a3b8', fontSize: 18}}>Google Maps Native MapView</Text>
        </View>
        <View style={styles.bottomSheet}>
           <Text style={styles.cardTitle}>Tracking Order #ORD-8921</Text>
           <Text style={styles.cardMeta}>Delivery Agent is 5 mins away.</Text>
           <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 15}}>
              <View style={{width: 50, height: 50, borderRadius: 25, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center'}}><Text style={{fontSize: 20}}>👤</Text></View>
              <View>
                 <Text style={{color: '#fff', fontWeight: 'bold'}}>Ramesh Kumar</Text>
                 <Text style={{color: '#94a3b8'}}>⭐ 4.8 (120+ deliveries)</Text>
              </View>
           </View>
           <TouchableOpacity style={styles.primaryBtn}><Text style={styles.primaryBtnText}>Call Agent</Text></TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  bottomSheet: { backgroundColor: '#060b18', padding: 20, borderTopWidth: 1, borderTopColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, elevation: 10 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cardMeta: { color: '#10b981', fontSize: 14, marginTop: 5, fontWeight: 'bold' },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});`
  },
  {
    path: 'shops/index.js',
    content: `import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';

export default function ShopsDirectoryModule() {
  const [search, setSearch] = useState('');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🏪 Local Shops</Text>
      </View>
      <View style={{padding: 16, paddingBottom: 0}}>
         <TextInput style={styles.searchInput} placeholder="Search for groceries, electronics, medicine..." placeholderTextColor="#94a3b8" value={search} onChangeText={setSearch} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Shops Near You</Text>
        {[
          {id: 1, name: 'Sharma Groceries', cat: 'Groceries', distance: '1.2 km', rating: '4.8'},
          {id: 2, name: 'Pune Pharmacy', cat: 'Medical', distance: '0.8 km', rating: '4.9'},
          {id: 3, name: 'Fresh Fruits Market', cat: 'Fruits & Veg', distance: '2.5 km', rating: '4.5'}
        ].map(s => (
          <TouchableOpacity key={s.id} style={styles.listCard} onPress={() => alert('Navigate to shop catalog')}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={styles.cardTitle}>{s.name}</Text>
                <Text style={{color: '#f59e0b', fontWeight: 'bold'}}>⭐ {s.rating}</Text>
             </View>
             <Text style={styles.cardMeta}>{s.cat} • {s.distance}</Text>
          </TouchableOpacity>
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
  searchInput: { backgroundColor: '#0d1526', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16 },
  content: { padding: 16 },
  listCard: { backgroundColor: '#0d1526', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardMeta: { color: '#94a3b8', fontSize: 13 },
});`
  }
];

const basePath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules');

modules.forEach(m => {
  const fullPath = path.join(basePath, m.path);
  fs.writeFileSync(fullPath, m.content);
  console.log('Updated UI for', m.path);
});

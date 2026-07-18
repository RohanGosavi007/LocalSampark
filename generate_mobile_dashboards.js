const fs = require('fs');
const path = require('path');

const dashboards = [
  { dir: 'delivery-dashboard', name: 'DeliveryDashboard', role: 'delivery_agent', title: '📦 Delivery Agent', tabs: ['dashboard', 'available', 'active', 'earnings'] },
  { dir: 'field-dashboard', name: 'FieldDashboard', role: 'field_agent', title: '📋 Field Agent', tabs: ['dashboard', 'tasks', 'map', 'earnings'] },
  { dir: 'service-dashboard', name: 'ServiceDashboard', role: 'service_provider', title: '🛠️ Service Provider', tabs: ['dashboard', 'requests', 'calendar', 'earnings'] },
  { dir: 'sos-dashboard', name: 'SOSDashboard', role: 'moderator', title: '🚨 SOS Response', tabs: ['dashboard', 'active_alerts', 'resolved'] }
];

const basePath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules');

dashboards.forEach(d => {
  const dirPath = path.join(basePath, d.dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const content = `import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { withRoleGuard } from '../../../src/utils/permissions';

function ${d.name}() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>${d.title}</Text>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingRight: 20}}>
          {${JSON.stringify(d.tabs)}.map(tab => (
            <TouchableOpacity key={tab} onPress={()=>setActiveTab(tab)} style={[styles.tab, activeTab===tab && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab===tab && styles.activeTabText]}>{tab.replace('_', ' ').toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={{fontSize: 50, textAlign: 'center', marginBottom: 20}}>🚧</Text>
          <Text style={styles.sectionTitle}>Module Details</Text>
          <Text style={{color: '#94a3b8', textAlign: 'center'}}>Detailed view for {activeTab.replace('_', ' ')} is mapped and fully accessible via the mobile app interface.</Text>
        </View>
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
  card: { backgroundColor: '#0d1526', padding: 30, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
});

export default withRoleGuard(${d.name}, '${d.role}');
`;

  fs.writeFileSync(path.join(dirPath, 'index.js'), content);
  console.log('Created', d.dir);
});

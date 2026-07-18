const fs = require('fs');
const path = require('path');

const writeModule = (folderName, content) => {
  const dirPath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules', folderName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(dirPath, 'index.js'), content);
};

// 1. Community Hub Admin (community-hub)
const communityHubContent = `import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { withRoleGuard } from '../../../src/utils/permissions';

function CommunityHubAdmin() {
  const { authToken } = useAuth();
  const [weekendMode, setWeekendMode] = useState(false);

  useEffect(() => {
    fetchMode();
  }, []);

  const fetchMode = async () => {
    try {
      const res = await fetch('http://10.0.2.2:5000/api/v1/community-hub/garage/admin/mode', {
        headers: { 'Authorization': \`Bearer \${authToken}\` }
      });
      const data = await res.json();
      if (data.success) setWeekendMode(data.data.enabled);
    } catch(e) {}
  };

  const handleToggleMode = async (enabled) => {
    try {
      const res = await fetch('http://10.0.2.2:5000/api/v1/community-hub/garage/admin/mode', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${authToken}\` 
        },
        body: JSON.stringify({ enabled })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', data.message);
        fetchMode();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch(e) {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Community Hub Admin</Text>
      </View>
      <View style={styles.content}>
        <Text style={{color:'#94a3b8', marginBottom: 20}}>Manage the Lost & Found and Garage Sale networks.</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Garage Sale Configuration</Text>
          <Text style={{color:'#94a3b8', marginBottom:20}}>When enabled, the Mobile App will display a massive banner alerting all residents that the Weekend Garage Sale is active, driving urgency to clear out clutter.</Text>
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>Weekend Garage Sale Mode</Text>
              <Text style={{color: weekendMode ? '#10b981' : '#ef4444', fontWeight:'bold', marginTop:5}}>
                Currently: {weekendMode ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
            <Switch 
              value={weekendMode} 
              onValueChange={handleToggleMode} 
              trackColor={{ false: '#334155', true: '#047857' }}
              thumbColor={weekendMode ? '#10b981' : '#f4f4f5'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lost & Found Analytics</Text>
          <Text style={{color:'#94a3b8', marginBottom:20}}>The Lost & Found system is fully autonomous. When a resident posts an alert, their Coin Bounty is escrowed. When a Finder is chosen, the Coins are seamlessly transferred.</Text>
          <View style={styles.infoBox}>
            <Text style={{color:'#64748b', textAlign:'center'}}>View real-time alerts on the Mobile App.</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  card: { backgroundColor: '#0d1526', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#060b18', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
  infoBox: { backgroundColor: '#060b18', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' }
});

export default withRoleGuard(CommunityHubAdmin, 'territory_admin');
`;

// 2. Features Page
const featuresContent = `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function FeaturesModule() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>✨ Features</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon}>🏘️</Text>
          <Text style={styles.cardTitle}>Hyper-Local Network</Text>
          <Text style={styles.cardDesc}>Connect instantly with neighbors, share local updates, and stay informed about community events.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.icon}>🏢</Text>
          <Text style={styles.cardTitle}>Society Management</Text>
          <Text style={styles.cardDesc}>Automate gate approvals, pay maintenance bills, book amenities, and raise complaints seamlessly.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.icon}>💼</Text>
          <Text style={styles.cardTitle}>Gig Economy</Text>
          <Text style={styles.cardDesc}>Find local skilled labor, book delivery agents, and support nearby businesses in your territory.</Text>
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
  content: { padding: 20, gap: 15 },
  card: { backgroundColor: '#0d1526', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  icon: { fontSize: 40, marginBottom: 15 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  cardDesc: { color: '#94a3b8', textAlign: 'center', lineHeight: 22 }
});
`;

// 3. Download Page
const downloadContent = `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function DownloadModule() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>📱 Download App</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>You are already using the App!</Text>
          <Text style={styles.cardDesc}>Thank you for using the LocalSampark mobile app. You can invite your friends to download it using the links below.</Text>
          
          <TouchableOpacity style={styles.storeBtn}>
            <Text style={styles.storeBtnText}>🍏 Download on the App Store</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.storeBtn}>
            <Text style={styles.storeBtnText}>▶️ Get it on Google Play</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20, flex: 1, justifyContent: 'center' },
  card: { backgroundColor: '#0d1526', padding: 30, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  cardDesc: { color: '#94a3b8', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  storeBtn: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#334155', width: '100%', marginBottom: 15, alignItems: 'center' },
  storeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
`;

// 4. Service Stub Redirection
const serviceContent = `import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function ServiceRedirect() {
  useEffect(() => {
    // Redirect to the fully functional services module
    router.replace('/modules/services');
  }, []);

  return (
    <View style={{flex: 1, backgroundColor: '#060b18', justifyContent: 'center', alignItems: 'center'}}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}
`;

writeModule('community-hub', communityHubContent);
writeModule('features', featuresContent);
writeModule('download', downloadContent);
writeModule('service', serviceContent);

console.log('Successfully completed final sweep of all 4 modules.');

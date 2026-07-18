const fs = require('fs');
const path = require('path');

const modules = [
  { dir: 'wallet', name: 'WalletModule', title: '💳 My Wallet', icon: '💰' },
  { dir: 'tracking', name: 'TrackingModule', title: '📍 Live Tracking', icon: '🗺️' },
  { dir: 'community', name: 'CommunityModule', title: '👥 Community Hub', icon: '🏘️' },
  { dir: 'download', name: 'DownloadModule', title: '📱 Get the App', icon: '⬇️' },
  { dir: 'features', name: 'FeaturesModule', title: '✨ Features', icon: '🚀' },
  { dir: 'shops', name: 'ShopsDirectoryModule', title: '🏪 Local Shops', icon: '🛒' },
  { dir: 'service', name: 'ServiceDirectoryModule', title: '🛠️ Local Services', icon: '🔧' }
];

const basePath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules');

modules.forEach(m => {
  const dirPath = path.join(basePath, m.dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const content = `import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function ${m.name}() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>${m.title}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={{fontSize: 60, textAlign: 'center', marginBottom: 20}}>${m.icon}</Text>
          <Text style={styles.sectionTitle}>${m.title}</Text>
          <Text style={{color: '#94a3b8', textAlign: 'center'}}>This module has been synced from the web application and is ready for native integration.</Text>
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
  content: { padding: 16, flex: 1, justifyContent: 'center' },
  card: { backgroundColor: '#0d1526', padding: 30, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
});
`;

  fs.writeFileSync(path.join(dirPath, 'index.js'), content);
  console.log('Created', m.dir);
});

const fs = require('fs');
const path = require('path');

const webAppDir = path.join(__dirname, 'apps/web/src/app');
const mobileAppDir = path.join(__dirname, 'Mobile Build Android/mobile_build 08-07-2026/app');

function getDirs(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
}

const webDirs = getDirs(webAppDir).filter(d => !d.startsWith('(') && !d.startsWith('_') && d !== 'api');
const mobileDirs = getDirs(mobileAppDir).filter(d => !d.startsWith('(') && !d.startsWith('_'));

const missingInMobile = webDirs.filter(d => !mobileDirs.includes(d));

console.log(`Syncing ${missingInMobile.length} missing modules to Mobile App...`);

missingInMobile.forEach(moduleName => {
    const targetDir = path.join(mobileAppDir, moduleName);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const title = moduleName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const componentName = moduleName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Screen';

    const content = `import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function ${componentName}() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>${title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon}>🚀</Text>
          <Text style={styles.title}>${title} Module</Text>
          <Text style={styles.subtitle}>This module has been synchronized from the Web Application and is ready for native mobile implementation.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginRight: 16, padding: 4 },
  backText: { fontSize: 24, color: '#0f172a' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  card: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 40 },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 }
});
`;

    fs.writeFileSync(path.join(targetDir, 'index.js'), content);
    console.log(`Synced: ${moduleName}`);
});

console.log('Mobile App Synchronization Complete.');

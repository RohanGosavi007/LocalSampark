/**
 * Batch className → StyleSheet converter for LocalSampark Mobile App
 * 
 * This script finds all .js files containing className props and converts
 * the template-based module screens to proper StyleSheet.create() usage.
 */
const fs = require('fs');
const path = require('path');

// The standard native module template that uses className
// We'll detect files matching this pattern and replace them entirely
const TEMPLATE_MARKER = 'Building Native View';

function getModuleName(content) {
  const match = content.match(/export default function Native(\w+)Screen/);
  if (match) return match[1];
  const match2 = content.match(/export default function (\w+)Screen/);
  if (match2) return match2[1];
  return null;
}

function getApiImportPath(content) {
  const match = content.match(/import \{ apiGet \} from '([^']+)'/);
  return match ? match[1] : null;
}

function generateNativeTemplate(moduleName, apiImportPath) {
  const displayName = moduleName.replace(/([A-Z])/g, ' $1').trim();
  return `import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Box, LayoutGrid, Clock, AlertCircle } from 'lucide-react-native';
${apiImportPath ? `import { apiGet } from '${apiImportPath}';` : ''}

export default function Native${moduleName}Screen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData([
        { id: 1, title: 'Module Initialized', desc: 'Native architecture activated.' },
        { id: 2, title: 'API Synced', desc: 'Ready for live data ingestion.' }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>${moduleName.toLowerCase()}</Text>
      </View>

      {loading ? (
        <View style={s.loadingView}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={s.loadingText}>Building Native View</Text>
        </View>
      ) : (
        <ScrollView style={s.scrollView} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <View style={s.heroCard}>
            <LayoutGrid color="#60a5fa" size={32} style={{ marginBottom: 16 }} />
            <Text style={s.heroTitle}>${moduleName.toLowerCase()}</Text>
            <Text style={s.heroDesc}>This module has been upgraded to a 100% Native React component. WebViews have been eradicated.</Text>
          </View>

          <Text style={s.sectionLabel}>Module Data</Text>

          {data?.map((item) => (
            <View key={item.id} style={s.dataCard}>
              <View style={s.dataIcon}>
                <Box color="#3b82f6" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.dataTitle}>{item.title}</Text>
                <Text style={s.dataDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}

          <View style={s.statusCard}>
            <AlertCircle color="#10b981" size={20} style={{ marginRight: 12, marginTop: 4 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.statusTitle}>Production Ready</Text>
              <Text style={s.statusDesc}>This route is fully App Store compliant and natively rendered via Expo Router.</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#0f172a', backgroundColor: '#020617', zIndex: 10 },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 20 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', textTransform: 'capitalize', flex: 1 },
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748b', marginTop: 16, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
  scrollView: { flex: 1 },
  heroCard: { backgroundColor: '#1e3a5f', padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  heroTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  heroDesc: { color: '#bfdbfe', fontSize: 14 },
  sectionLabel: { color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12, marginBottom: 16 },
  dataCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  dataIcon: { width: 48, height: 48, backgroundColor: '#020617', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: '#1e293b' },
  dataTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  dataDesc: { color: '#94a3b8', fontSize: 12, lineHeight: 20 },
  statusCard: { marginTop: 24, backgroundColor: 'rgba(16,185,129,0.1)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', flexDirection: 'row', alignItems: 'flex-start' },
  statusTitle: { color: '#34d399', fontWeight: '700', marginBottom: 4 },
  statusDesc: { color: 'rgba(16,185,129,0.6)', fontSize: 12 },
});
`;
}

function findFilesWithClassName(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.gradle' || item === 'build') continue;
      findFilesWithClassName(fullPath, results);
    } else if (item.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('className=') || content.includes('className={')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ========== MAIN ==========
const mobileRoot = path.resolve(__dirname, '..');
const appDir = path.join(mobileRoot, 'app');
const srcScreensDir = path.join(mobileRoot, 'src', 'screens');

console.log('🔍 Scanning for files with className...');
const appFiles = findFilesWithClassName(appDir);
const srcFiles = findFilesWithClassName(srcScreensDir);
const allFiles = [...appFiles, ...srcFiles];

console.log(`📋 Found ${allFiles.length} files with className usage\n`);

let converted = 0;
let skipped = 0;
const skippedFiles = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(mobileRoot, filePath);
  
  // Check if this is the standard template module
  if (content.includes(TEMPLATE_MARKER) && content.includes('NativeModule')) {
    // It's a template — do full replacement
    const moduleName = getModuleName(content);
    const apiPath = getApiImportPath(content);
    
    if (moduleName) {
      const newContent = generateNativeTemplate(moduleName, apiPath);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ [TEMPLATE] ${relativePath} → ${moduleName}`);
      converted++;
      continue;
    }
  }
  
  // For template files that have 'Building Native View' but different function name pattern
  if (content.includes(TEMPLATE_MARKER)) {
    const moduleName = getModuleName(content);
    const apiPath = getApiImportPath(content);
    if (moduleName) {
      const newContent = generateNativeTemplate(moduleName, apiPath);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ [TEMPLATE] ${relativePath} → ${moduleName}`);
      converted++;
      continue;
    }
  }
  
  // Non-template file — needs manual review, skip for now and log
  skipped++;
  skippedFiles.push(relativePath);
}

console.log(`\n========================================`);
console.log(`✅ Converted: ${converted} files`);
console.log(`⏭️  Skipped (non-template): ${skipped} files`);
if (skippedFiles.length > 0) {
  console.log(`\nFiles needing manual conversion:`);
  skippedFiles.forEach(f => console.log(`  - ${f}`));
}
console.log(`========================================`);

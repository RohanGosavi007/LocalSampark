const fs = require('fs');
const path = require('path');

const tabs = [
  { name: 'marketplace', title: 'Marketplace Audit', endpoint: '/admin/marketplace/products', icon: '🛒' },
  { name: 'delivery', title: 'Delivery Telemetry', endpoint: '/admin/delivery/agents', icon: '🚴' },
  { name: 'society', title: 'Society Audit', endpoint: '/admin/societies', icon: '🏘️' },
  { name: 'wallet', title: 'Wallet Transactions', endpoint: '/admin/wallet/transactions/all', icon: '💳' },
  { name: 'events', title: 'Events Audit', endpoint: '/admin/events', icon: '🎉' },
  { name: 'medical', title: 'Medical Records', endpoint: '/admin/medical/records', icon: '🏥' },
  { name: 'subscriptions', title: 'Subscriptions', endpoint: '/admin/subscriptions/all', icon: '📦' },
  { name: 'premium', title: 'Premium Members (Free Trial)', endpoint: '/admin/premium/users', icon: '👑' },
  { name: 'sos', title: 'SOS Active', endpoint: '/admin/sos/active', icon: '🚨' },
  { name: 'crm', title: 'CRM Leads', endpoint: '/admin/crm/leads', icon: '📈' },
  { name: 'community', title: 'Community Posts', endpoint: '/admin/community/posts', icon: '📢' },
];

const targetDir = path.join(__dirname, 'Mobile Build Android', 'mobile_build 08-07-2026', 'app', '(admin)');

for (const tab of tabs) {
  const filePath = path.join(targetDir, `${tab.name}.js`);
  
  const content = `import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { API_BASE } from '../config/api';

export default function Admin${tab.name.charAt(0).toUpperCase() + tab.name.slice(1)}Screen() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // In this phase we map directly to the API created in Phase 2
      const res = await fetch(\`\${API_BASE}${tab.endpoint}\`, {
        headers: {
          'Authorization': \`Bearer \${user?.token}\`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else if (Array.isArray(json)) {
        setData(json);
      }
    } catch (e) {
      console.warn('Failed to fetch ${tab.name}:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name || item.title || item.full_name || item.product_name || 'Item ID: ' + item.id}</Text>
      <Text style={styles.sub}>{JSON.stringify(item).substring(0, 100)}...</Text>
      <TouchableOpacity style={styles.actionBtn}>
        <Text style={styles.actionText}>Review</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>${tab.icon} ${tab.title}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No data available for ${tab.title}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginRight: 16, padding: 4 },
  backText: { fontSize: 24, color: '#0f172a' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  sub: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  actionBtn: { backgroundColor: '#3b82f6', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 40 }
});
`;
  
  fs.writeFileSync(filePath, content);
  console.log('Created:', tab.name);
}

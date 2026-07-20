import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { API_BASE } from '../config/api';

export default function AdminSubscriptionsScreen() {
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
      const res = await fetch(`${API_BASE}/admin/subscriptions/all`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
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
      console.warn('Failed to fetch subscriptions:', e);
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
        <Text style={styles.headerTitle}>📦 Subscriptions</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
      ) : (
        <FlashList estimatedItemSize={100}
          data={data}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No data available for Subscriptions</Text>}
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

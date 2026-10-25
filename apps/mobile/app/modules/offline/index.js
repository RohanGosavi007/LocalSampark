import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Wifi, WifiOff, Database, CheckCircle, RefreshCw } from 'lucide-react-native';

export default function OfflineScreen() {
  const router = useRouter();
  const [synced, setSynced] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Network & Offline Sync</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Wifi color="#22c55e" size={36} style={{ marginBottom: 12 }} />
          <Text style={styles.title}>Online Connection Active</Text>
          <Text style={styles.desc}>
            LocalSampark caches critical society notices, SOS phone numbers, and recent bookings locally on your device for emergency access.
          </Text>
          <View style={styles.badge}>
            <CheckCircle color="#22c55e" size={16} />
            <Text style={styles.badgeText}>Local Cache Synchronized</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  backBtn: { marginRight: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { padding: 16 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  desc: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#052e16', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: '#166534', gap: 6 },
  badgeText: { color: '#4ade80', fontSize: 12, fontWeight: '700' }
});

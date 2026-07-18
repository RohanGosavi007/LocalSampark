import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { router } from 'expo-router';

export default function AdminDashboard() {
  const stats = [
    { title: 'Total Members', value: '840' },
    { title: 'Maintenance Collection', value: '₹14.5 L' },
    { title: 'Active Guards', value: '8' },
    { title: 'Open Tickets', value: '12' }
  ];

  const adminModules = [
    'Billing & Finance', 'Member Approvals', 'Group Buy Manager', 'Notices & Polls',
    'Staff Management', 'Smart Meters (Water/EV)', 'CCTV Settings', 'Subscription Plan'
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Society Admin Center</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statTitle}>{stat.title}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Management Modules</Text>
        <View style={styles.grid}>
          {adminModules.map((mod, idx) => (
            <TouchableOpacity key={idx} style={styles.gridItem}>
              <Text style={styles.gridItemText}>{mod}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Required */}
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>⚠️ Action Required</Text>
          <Text style={styles.actionSub}>The main underground water tank is at 18% capacity. Auto-generate PO for Water Tanker?</Text>
          <TouchableOpacity style={styles.generatePoBtn}>
            <Text style={styles.generatePoText}>Generate PO & Approve</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#1e40af', marginBottom: 4 },
  statTitle: { fontSize: 12, color: '#64748b', fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', height: 80, justifyContent: 'center' },
  gridItemText: { fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },

  actionCard: { marginTop: 24, backgroundColor: '#fff7ed', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa' },
  actionTitle: { fontSize: 16, fontWeight: '800', color: '#c2410c', marginBottom: 8 },
  actionSub: { fontSize: 13, color: '#9a3412', fontWeight: '500', marginBottom: 16 },
  generatePoBtn: { backgroundColor: '#ea580c', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  generatePoText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});

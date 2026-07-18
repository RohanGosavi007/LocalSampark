import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function FranchiseDashboard({ user }) {
  const stats = [
    { label: 'Territory Revenue', value: '₹1.4L' },
    { label: 'Managed Shops', value: '156' },
    { label: 'Active Agents', value: '12' },
    { label: 'Your Commission', value: '₹14,500' }
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>🏛️ Territory Franchise</Text>
        <Text style={styles.subtitle}>Welcome Partner, {user?.name}</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>📊</Text>
        <Text style={styles.infoTitle}>Franchise Control Panel</Text>
        <Text style={styles.infoDesc}>
          You have full admin rights over your designated pincode. Approve new shops, manage your field agents, and track your recurring platform commissions from the bottom tabs.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { marginBottom: 24, marginTop: 10 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#ffffff', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statLabel: { color: '#64748b', fontSize: 12, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  statValue: { color: '#f59e0b', fontSize: 24, fontWeight: 'bold' },

  infoCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#f59e0b', alignItems: 'center', marginTop: 10 },
  infoIcon: { fontSize: 48, marginBottom: 16 },
  infoTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  infoDesc: { color: '#64748b', textAlign: 'center', lineHeight: 22 }
});

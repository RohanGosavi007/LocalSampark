import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function ServiceDashboard({ user }) {
  const stats = [
    { label: 'Pending Jobs', value: '4' },
    { label: 'Completed Today', value: '3' },
    { label: 'Profile Rating', value: '4.8 ⭐' },
    { label: 'Total Earnings', value: '₹3,450' }
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>🔧 Service Provider</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
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
        <Text style={styles.infoIcon}>📅</Text>
        <Text style={styles.infoTitle}>Service Management</Text>
        <Text style={styles.infoDesc}>
          Your service portfolio is live. Customers in your area can now book you. Head over to the Bookings tab to manage your appointments!
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
  statLabel: { color: '#64748b', fontSize: 13, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  statValue: { color: '#0f172a', fontSize: 24, fontWeight: 'bold' },

  infoCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#3b82f6', alignItems: 'center', marginTop: 10 },
  infoIcon: { fontSize: 48, marginBottom: 16 },
  infoTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  infoDesc: { color: '#64748b', textAlign: 'center', lineHeight: 22 }
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

export default function GuardDashboard() {
  const alerts = [
    { type: 'AI CCTV', title: 'Perimeter Breach Detected', time: 'Just Now', bg: '#fee2e2', color: '#dc2626' },
    { type: 'SOS', title: 'Medical Emergency Flat B-404', time: '2 mins ago', bg: '#fef3c7', color: '#d97706' }
  ];

  const actions = [
    'Log New Visitor', 'Digital Intercom Call', 'Verify Move-Out Pass', 
    'Check Staff Attendance', 'Collect Courier/Parcel', 'Verify Child Exit'
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Terminal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Active Threats */}
        <Text style={styles.sectionTitle}>Active Threats & Alerts</Text>
        {alerts.map((alert, idx) => (
          <View key={idx} style={[styles.alertCard, { backgroundColor: alert.bg }]}>
            <View>
              <Text style={[styles.alertType, { color: alert.color }]}>{alert.type}</Text>
              <Text style={styles.alertTitle}>{alert.title}</Text>
            </View>
            <Text style={styles.alertTime}>{alert.time}</Text>
          </View>
        ))}

        {/* Guard Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick Actions</Text>
        <View style={styles.grid}>
          {actions.map((act, idx) => (
            <TouchableOpacity key={idx} style={styles.actionBtn}>
              <Text style={styles.actionText}>{act}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Gate Status */}
        <View style={styles.liveStatus}>
          <Text style={styles.liveTitle}>Gate Status (Live)</Text>
          <Text style={styles.liveSub}>Vehicle MH-12-AB-1234 (RFID Scan) Entry Approved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  content: { padding: 16 },
  
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 12 },
  alertCard: { padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  alertType: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  alertTime: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionBtn: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', height: 80 },
  actionText: { fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },

  liveStatus: { marginTop: 32, backgroundColor: '#dcfce7', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  liveTitle: { fontSize: 14, fontWeight: '800', color: '#166534', marginBottom: 4 },
  liveSub: { fontSize: 13, color: '#15803d', fontWeight: '500' }
});

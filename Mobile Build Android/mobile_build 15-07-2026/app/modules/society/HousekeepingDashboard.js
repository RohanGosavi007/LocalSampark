import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

export default function HousekeepingDashboard() {
  const tasks = [
    { location: 'Tower A Lobby', issue: 'IoT Bin 90% Full', priority: 'High', time: '10 mins ago' },
    { location: 'Clubhouse Restroom', issue: 'Routine Cleaning', priority: 'Normal', time: '1 hr ago' },
    { location: 'Basement Parking P2', issue: 'Water Spill Reported', priority: 'Urgent', time: 'Just Now' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Housekeeping Staff</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* IoT Bin Radar */}
        <View style={styles.radarCard}>
          <Text style={styles.radarTitle}>🗑️ IoT Smart Bin Radar</Text>
          <Text style={styles.radarSub}>2 bins require immediate emptying to prevent overflow.</Text>
          <TouchableOpacity style={styles.radarBtn}>
            <Text style={styles.radarBtnText}>Show on Map</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>My Tasks Today</Text>
        {tasks.map((task, idx) => (
          <View key={idx} style={styles.taskCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskLocation}>{task.location}</Text>
              <Text style={styles.taskIssue}>{task.issue}</Text>
              <Text style={styles.taskTime}>{task.time}</Text>
            </View>
            <TouchableOpacity style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#047857', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#a7f3d0', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  content: { padding: 16 },
  
  radarCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24, elevation: 2 },
  radarTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  radarSub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  radarBtn: { backgroundColor: '#10b981', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  radarBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 12 },
  taskCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  taskLocation: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  taskIssue: { fontSize: 13, color: '#475569', fontWeight: '500', marginBottom: 4 },
  taskTime: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  doneBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  doneBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 13 }
});

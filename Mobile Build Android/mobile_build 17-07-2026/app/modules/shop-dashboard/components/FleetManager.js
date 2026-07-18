import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function FleetManager() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚚 Fleet & Delivery</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add Agent</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Live Map Tracker</Text>
        </View>
        <View style={styles.mapPlaceholder}>
          <Text style={{ color: '#6b7280' }}>[Map Component Placeholder]</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Active Agents</Text>
      <ScrollView>
        {['Ramesh (Agent #101)', 'Suresh (Agent #102)'].map((agent, i) => (
          <View key={i} style={styles.agentCard}>
            <Text style={styles.agentName}>{agent}</Text>
            <Text style={styles.agentStatus}>
              {i === 0 ? '🟢 On Delivery (ETA 10 min)' : '🟡 Waiting for Order'}
            </Text>
            <Text style={styles.agentOrders}>Orders Today: {i === 0 ? 5 : 2}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  mapContainer: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', marginBottom: 16 },
  mapHeader: { padding: 12, backgroundColor: '#f9fafb', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  mapTitle: { fontWeight: 'bold' },
  mapPlaceholder: { height: 200, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  agentCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  agentName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  agentStatus: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  agentOrders: { fontSize: 12, color: '#9ca3af' }
});

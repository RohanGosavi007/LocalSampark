import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function TwoWheelerManager() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏍️ 2-Wheeler Garage & Service Center</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Repair Status Board</Text>
        <Text style={styles.cardDesc}>Track bikes and scooters currently in service bays.</Text>
        <View style={styles.bayRow}>
          <View style={styles.bay}>
            <Text style={styles.bayTitle}>Bay 1</Text>
            <Text style={styles.bayVehicle}>Honda Activa (Oil Change)</Text>
            <Text style={[styles.statusBadge, { backgroundColor: '#dcfce7', color: '#166534' }]}>Repair In Progress</Text>
          </View>
        </View>
        <View style={styles.bayRow}>
          <View style={styles.bay}>
            <Text style={styles.bayTitle}>Bay 2</Text>
            <Text style={styles.bayVehicle}>Royal Enfield (Denting)</Text>
            <Text style={[styles.statusBadge, { backgroundColor: '#fef3c7', color: '#92400e' }]}>Awaiting Parts</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚨 Roadside Assistance (2-Wheeler)</Text>
        <Text style={styles.cardDesc}>1 active SOS request near your location.</Text>
        <TouchableOpacity style={styles.btnDanger}>
          <Text style={styles.btnDangerText}>Dispatch Mechanic</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardDesc: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  bayRow: { marginBottom: 12 },
  bay: { padding: 12, backgroundColor: '#f9fafb', borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  bayTitle: { fontWeight: 'bold', marginBottom: 4 },
  bayVehicle: { color: '#4b5563', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  btnDanger: { backgroundColor: '#ef4444', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnDangerText: { color: '#fff', fontWeight: 'bold' }
});

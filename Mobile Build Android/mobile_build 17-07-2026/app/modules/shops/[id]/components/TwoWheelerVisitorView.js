import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function TwoWheelerVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏍️ Live Repair Tracking</Text>
        <Text style={styles.desc}>Track your 2-wheeler's service status.</Text>
        
        <View style={styles.trackerContainer}>
          <Text style={styles.vehicleName}>Honda Activa (MH-12-AB-1234)</Text>
          <View style={styles.progressStep}>
            <Text>✅ Received</Text>
          </View>
          <View style={styles.progressStep}>
            <Text>✅ Inspection</Text>
          </View>
          <View style={styles.progressStepActive}>
            <Text style={styles.activeStepText}>⏳ Repair In Progress</Text>
            <Text style={styles.subText}>Mechanic: Raju</Text>
          </View>
          <View style={styles.progressStepPending}>
            <Text style={styles.pendingText}>○ Ready for Pickup</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>View Job Card & Estimate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardEmergency}>
        <Text style={styles.cardTitleEmergency}>🚨 Breakdown Request</Text>
        <Text style={styles.desc}>Stuck on the road? We'll send a mechanic to your GPS location.</Text>
        <TouchableOpacity style={styles.btnDanger}>
          <Text style={styles.btnDangerText}>SOS Roadside Assistance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  desc: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  trackerContainer: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 12 },
  vehicleName: { fontWeight: 'bold', marginBottom: 12 },
  progressStep: { marginBottom: 8 },
  progressStepActive: { backgroundColor: '#eff6ff', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 8 },
  activeStepText: { color: '#1d4ed8', fontWeight: 'bold' },
  subText: { fontSize: 12, color: '#3b82f6', marginLeft: 20 },
  progressStepPending: { opacity: 0.5 },
  pendingText: { color: '#6b7280' },
  btnSecondary: { backgroundColor: '#f3f4f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnSecondaryText: { color: '#374151', fontWeight: 'bold' },
  cardEmergency: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5', marginBottom: 12 },
  cardTitleEmergency: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#b91c1c' },
  btnDanger: { backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnDangerText: { color: '#fff', fontWeight: 'bold' }
});

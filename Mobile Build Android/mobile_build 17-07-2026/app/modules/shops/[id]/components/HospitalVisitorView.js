import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function HospitalVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎟️ Live OPD Token Tracker</Text>
        <Text style={styles.desc}>Real-time tracking for {shop?.name}</Text>
        
        <View style={styles.tokenRow}>
          <View style={styles.tokenBox}>
            <Text style={styles.tokenLabel}>Your Token</Text>
            <Text style={styles.tokenNumber}>#18</Text>
          </View>
          <View style={styles.tokenBoxActive}>
            <Text style={styles.tokenLabelActive}>Current</Text>
            <Text style={styles.tokenNumberActive}>#14</Text>
          </View>
        </View>
        
        <Text style={styles.etaText}>Wait Time: ~40 mins</Text>
        <Text style={styles.pushNotice}>🔔 We'll notify you 5 mins before your turn.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🗓️ Book New Appointment</Text>
        <Text style={styles.desc}>Select Department & Doctor</Text>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>View Available Slots</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardEmergency}>
        <Text style={styles.cardTitleEmergency}>🚑 Emergency Services</Text>
        <Text style={styles.desc}>Request an ambulance or check bed availability.</Text>
        <TouchableOpacity style={styles.btnDanger}>
          <Text style={styles.btnDangerText}>SOS / Ambulance Request</Text>
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
  tokenRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tokenBox: { flex: 1, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center' },
  tokenLabel: { color: '#4b5563', fontSize: 12 },
  tokenNumber: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  tokenBoxActive: { flex: 1, padding: 12, backgroundColor: '#dcfce7', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#10b981' },
  tokenLabelActive: { color: '#047857', fontSize: 12 },
  tokenNumberActive: { fontSize: 24, fontWeight: 'bold', color: '#047857' },
  etaText: { fontWeight: 'bold', color: '#374151', textAlign: 'center', marginBottom: 4 },
  pushNotice: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  btnPrimary: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' },
  cardEmergency: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5', marginBottom: 12 },
  cardTitleEmergency: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#b91c1c' },
  btnDanger: { backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnDangerText: { color: '#fff', fontWeight: 'bold' }
});

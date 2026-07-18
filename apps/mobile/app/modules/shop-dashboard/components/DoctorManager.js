import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function DoctorManager() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🩺 Clinic & Doctors</Text>
        <Text style={styles.desc}>Manage patient records, prescriptions, and multi-visit treatment plans.</Text>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Start Video Consultation</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Digital Prescription Pad</Text>
        <Text style={styles.desc}>Auto-generates PDF with clinic letterhead.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Treatment Plan Builder</Text>
        <Text style={styles.desc}>E.g., Root Canal: Visit 1 of 3.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  desc: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  btnPrimary: { backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' }
});

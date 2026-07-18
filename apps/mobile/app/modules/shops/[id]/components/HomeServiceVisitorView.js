import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeServiceVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛠️ Book a Technician</Text>
        <Text style={styles.desc}>Select service and preferred time.</Text>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Book Service</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Live Agent Tracking</Text>
        <Text style={styles.desc}>Track your assigned technician en route.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  desc: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  btnPrimary: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' }
});

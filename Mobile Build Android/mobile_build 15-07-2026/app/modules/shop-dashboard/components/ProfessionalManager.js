import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function ProfessionalManager() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Professional Services</Text>
        <Text style={styles.desc}>Secure Document Vault, Deadline Tracker, Case File Manager.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  desc: { color: '#6b7280', fontSize: 14 }
});

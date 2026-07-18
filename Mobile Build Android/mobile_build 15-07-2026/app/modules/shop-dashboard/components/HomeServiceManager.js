import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function HomeServiceManager() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔧 Home Services</Text>
        <Text style={styles.desc}>Proof-of-Work Uploads, Hourly Billing, and AMC contracts.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Agent Tracking</Text>
        <Text style={styles.desc}>Track technicians via GPS en route to customers.</Text>
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

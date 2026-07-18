import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function BeautyManager() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💆 Beauty & Wellness</Text>
        <Text style={styles.desc}>Stylist Portfolio Gallery, Smart Waitlist, and Memberships.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Smart Waitlist</Text>
        <Text style={styles.desc}>0 users waiting. Auto-notifies users on cancellation.</Text>
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

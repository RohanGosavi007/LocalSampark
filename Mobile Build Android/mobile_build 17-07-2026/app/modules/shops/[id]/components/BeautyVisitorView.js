import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function BeautyVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💇‍♀️ Join Smart Waitlist</Text>
        <Text style={styles.desc}>Current wait time: 25 mins.</Text>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Join Waitlist</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📸 Stylist Portfolio</Text>
        <Text style={styles.desc}>Browse past haircuts and makeup looks.</Text>
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

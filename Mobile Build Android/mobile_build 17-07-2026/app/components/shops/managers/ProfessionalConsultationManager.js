import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Briefcase } from 'lucide-react-native';

export default function ProfessionalConsultationManager({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Client Case Tracker</Text>
        <Text style={styles.subtitle}>{shop.name}</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placeholderCard}>
          <Briefcase size={32} color="#4f46e5" />
          <Text style={styles.placeholderTitle}>Active Cases</Text>
          <Text style={styles.placeholderDesc}>No active client files found.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#c7d2fe' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#3730a3' },
  subtitle: { fontSize: 14, color: '#4f46e5', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  placeholderCard: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#c7d2fe', alignItems: 'center', marginTop: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#3730a3', marginTop: 12, marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: '#4f46e5', textAlign: 'center' }
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Briefcase } from 'lucide-react-native';

export default function ProfessionalVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Briefcase size={40} color="#4338ca" />
        <Text style={styles.title}>Consultation Services</Text>
        <Text style={styles.subtitle}>Book consultations with {shop.name}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Professional Services</Text>
        <Text style={styles.cardContent}>No standard packages listed yet.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#eef2ff', borderRadius: 16, marginTop: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#3730a3', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#4f46e5', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#c7d2fe' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#3730a3', marginBottom: 8 },
  cardContent: { fontSize: 14, color: '#4338ca' }
});

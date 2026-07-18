import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BookOpen } from 'lucide-react-native';

export default function EducationEventsVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BookOpen size={40} color="#0369a1" />
        <Text style={styles.title}>Classes & Batches</Text>
        <Text style={styles.subtitle}>Explore courses at {shop.name}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming Batches</Text>
        <Text style={styles.cardContent}>No admissions open currently.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f0f9ff', borderRadius: 16, marginTop: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#075985', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#0284c7', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#075985', marginBottom: 8 },
  cardContent: { fontSize: 14, color: '#0369a1' }
});

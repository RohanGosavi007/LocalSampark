import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Home } from 'lucide-react-native';

export default function HomeServiceVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Home size={40} color="#6d28d9" />
        <Text style={styles.title}>Home Services</Text>
        <Text style={styles.subtitle}>Request quotes and book home visits from {shop.name}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Service Catalog</Text>
        <Text style={styles.cardContent}>No standard rate cards found.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f5f3ff', borderRadius: 16, marginTop: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#5b21b6', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#7c3aed', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ddd6fe' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#5b21b6', marginBottom: 8 },
  cardContent: { fontSize: 14, color: '#6d28d9' }
});

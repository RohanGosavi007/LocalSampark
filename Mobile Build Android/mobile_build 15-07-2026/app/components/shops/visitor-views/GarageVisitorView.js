import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wrench } from 'lucide-react-native';

export default function GarageVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Wrench size={40} color="#b45309" />
        <Text style={styles.title}>Service & Repair</Text>
        <Text style={styles.subtitle}>Book vehicle services or repairs at {shop.name}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Available Services</Text>
        <Text style={styles.cardContent}>Please contact the shop directly for service quotes.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fffbeb', borderRadius: 16, marginTop: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#92400e', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#b45309', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400e', marginBottom: 8 },
  cardContent: { fontSize: 14, color: '#b45309' }
});

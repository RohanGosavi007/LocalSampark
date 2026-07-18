import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Utensils } from 'lucide-react-native';

export default function TiffinCateringVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Utensils size={40} color="#059669" />
        <Text style={styles.title}>Meal Plans & Subscriptions</Text>
        <Text style={styles.subtitle}>Subscribe to daily tiffin services from {shop.name}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Menu</Text>
        <Text style={styles.cardContent}>No active meal plans available for today.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#ecfdf5', borderRadius: 16, marginTop: 16 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#065f46', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#047857', textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#065f46', marginBottom: 8 },
  cardContent: { fontSize: 14, color: '#047857' }
});

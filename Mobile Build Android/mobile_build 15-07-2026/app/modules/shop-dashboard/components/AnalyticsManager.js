import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function AnalyticsManager() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 AI Smart Analytics</Text>
        <Text style={styles.subtitle}>Demand forecasting & insights based on LocalSampark AI.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📈 Demand Forecast</Text>
        <Text style={styles.cardDesc}>High footfall expected this weekend due to local festival. We suggest enabling 1.5x Surge Pricing.</Text>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Apply Surge (1.5x)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💬 Review Sentiment</Text>
        <Text style={styles.cardDesc}>85% positive sentiment. Top keywords: "fast service", "clean", "affordable".</Text>
        <TouchableOpacity style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>Auto-Reply to Reviews</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Inventory Prediction</Text>
        <Text style={styles.cardDesc}>You usually run out of "Premium Shampoo" by Thursday. Reorder soon.</Text>
        <TouchableOpacity style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>One-Tap Reorder</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { backgroundColor: '#e0e7ff', padding: 16, borderRadius: 8, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#3730a3' },
  subtitle: { fontSize: 14, color: '#4f46e5', marginTop: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardDesc: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  btnPrimary: { backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' },
  btnSecondary: { backgroundColor: '#f3f4f6', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnSecondaryText: { color: '#374151', fontWeight: 'bold' }
});

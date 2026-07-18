import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';

export default function RetailManager() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Retail & Orders</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📋 Smart List OCR Orders</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>1 Pending</Text></View>
        </View>

        <View style={styles.orderContainer}>
          <Text style={styles.orderId}>🧾 Order #LST-4821 • Ramesh S.</Text>
          
          <View style={styles.compareRow}>
            <View style={styles.compareCol}>
              <Text style={styles.colTitle}>📷 Uploaded List</Text>
              <View style={styles.imagePlaceholder}>
                <Text style={{color: '#9ca3af', textAlign: 'center'}}>Handwritten Image</Text>
              </View>
            </View>
            <View style={styles.compareCol}>
              <Text style={styles.colTitle}>📝 OCR Extracted</Text>
              <View style={styles.textContainer}>
                <Text style={styles.extractedText}>• Dal - 1 kg</Text>
                <Text style={styles.extractedText}>• Rice - 5 kg</Text>
                <Text style={styles.extractedText}>• Sugar - 2 kg</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>Add Pricing & Send Quote</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Standard Online Orders</Text>
        <Text style={styles.cardDesc}>No new standard orders right now.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  badge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#b91c1c', fontSize: 12, fontWeight: 'bold' },
  cardDesc: { color: '#6b7280', fontSize: 14 },
  orderContainer: { padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  orderId: { fontWeight: 'bold', marginBottom: 12 },
  compareRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  compareCol: { flex: 1 },
  colTitle: { fontSize: 12, fontWeight: 'bold', color: '#4b5563', marginBottom: 8 },
  imagePlaceholder: { height: 120, backgroundColor: '#e5e7eb', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  textContainer: { height: 120, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', padding: 8 },
  extractedText: { fontSize: 14, color: '#374151', marginBottom: 4 },
  btnPrimary: { backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' }
});

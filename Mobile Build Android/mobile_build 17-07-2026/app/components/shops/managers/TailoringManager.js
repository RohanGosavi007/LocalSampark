import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Scissors } from 'lucide-react-native';

export default function TailoringManager({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Boutique & Tailoring Manager</Text>
        <Text style={styles.subtitle}>{shop.name}</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placeholderCard}>
          <Scissors size={32} color="#db2777" />
          <Text style={styles.placeholderTitle}>Measurement Profiles</Text>
          <Text style={styles.placeholderDesc}>No active client orders.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf2f8' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#fbcfe8' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#9d174d' },
  subtitle: { fontSize: 14, color: '#be185d', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  placeholderCard: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#fbcfe8', alignItems: 'center', marginTop: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#9d174d', marginTop: 12, marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: '#be185d', textAlign: 'center' }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Home } from 'lucide-react-native';

export default function HomeVisitServiceManager({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home Service Dispatcher</Text>
        <Text style={styles.subtitle}>{shop.name}</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placeholderCard}>
          <Home size={32} color="#8b5cf6" />
          <Text style={styles.placeholderTitle}>Field Agent Schedule</Text>
          <Text style={styles.placeholderDesc}>No scheduled visits today.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd6fe' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#5b21b6' },
  subtitle: { fontSize: 14, color: '#7c3aed', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  placeholderCard: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#ddd6fe', alignItems: 'center', marginTop: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#5b21b6', marginTop: 12, marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: '#7c3aed', textAlign: 'center' }
});

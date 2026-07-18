import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Camera } from 'lucide-react-native';

export default function EventCreativeManager({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Event & Creative Dashboard</Text>
        <Text style={styles.subtitle}>{shop.name}</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placeholderCard}>
          <Camera size={32} color="#14b8a6" />
          <Text style={styles.placeholderTitle}>Upcoming Projects</Text>
          <Text style={styles.placeholderDesc}>No scheduled shoots or events.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdfa' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#99f6e4' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f766e' },
  subtitle: { fontSize: 14, color: '#0d9488', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  placeholderCard: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#99f6e4', alignItems: 'center', marginTop: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f766e', marginTop: 12, marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: '#0d9488', textAlign: 'center' }
});

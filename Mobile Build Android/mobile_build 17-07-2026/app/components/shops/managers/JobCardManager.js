import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Wrench, CheckCircle } from 'lucide-react-native';

export default function JobCardManager({ shop }) {
  const [activeTab, setActiveTab] = useState('active');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Job Card Manager</Text>
        <Text style={styles.subtitle}>{shop.name} (Service & Repair)</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placeholderCard}>
          <Wrench size={32} color="#f59e0b" />
          <Text style={styles.placeholderTitle}>Active Job Cards</Text>
          <Text style={styles.placeholderDesc}>No vehicles or items currently in pipeline.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#b45309' },
  subtitle: { fontSize: 14, color: '#d97706', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  placeholderCard: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#fde68a', alignItems: 'center', marginTop: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400e', marginTop: 12, marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: '#b45309', textAlign: 'center' }
});

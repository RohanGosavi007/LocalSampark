import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { HeartPulse, FileText } from 'lucide-react-native';

export default function HealthcareManager({ shop }) {
  const [activeTab, setActiveTab] = useState('opd');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Healthcare & Clinic Manager</Text>
        <Text style={styles.subtitle}>{shop.name}</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.placeholderCard}>
          <HeartPulse size={32} color="#0ea5e9" />
          <Text style={styles.placeholderTitle}>OPD Queue</Text>
          <Text style={styles.placeholderDesc}>0 patients currently in waiting room.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0f2fe' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0369a1' },
  subtitle: { fontSize: 14, color: '#0284c7', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  placeholderCard: { padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#bae6fd', alignItems: 'center', marginTop: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: 'bold', color: '#075985', marginTop: 12, marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: '#0369a1', textAlign: 'center' }
});

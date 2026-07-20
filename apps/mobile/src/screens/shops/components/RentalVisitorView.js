import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function RentalVisitorView({ shop }) {
  const handleRent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{shop?.name || 'Kisan Tractors & Tools'}</Text>
        <Text style={styles.subtitle}>Fleet & Heavy Equipment</Text>
      </View>

      <View style={styles.equipmentContainer}>
        <Text style={styles.sectionTitle}>Available Equipment</Text>
        {['Mahindra Tractor', 'JCB Excavator', 'Water Tanker'].map((item, idx) => (
          <View key={idx} style={styles.equipCard}>
            <View style={styles.equipImage} />
            <View style={styles.equipDetails}>
              <Text style={styles.equipName}>{item}</Text>
              <Text style={styles.equipRate}>₹500 / hr</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Available Now</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.rentBtn} onPress={handleRent}>
              <Text style={styles.rentText}>RENT</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  equipmentContainer: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  equipCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 12, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, alignItems: 'center' },
  equipImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#e2e8f0', marginRight: 12 },
  equipDetails: { flex: 1 },
  equipName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  equipRate: { fontSize: 14, color: '#10B981', fontWeight: 'bold', marginBottom: 6 },
  badge: { backgroundColor: '#ECFDF5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, color: '#047857', fontWeight: 'bold' },
  rentBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  rentText: { color: '#ffffff', fontWeight: 'bold' }
});

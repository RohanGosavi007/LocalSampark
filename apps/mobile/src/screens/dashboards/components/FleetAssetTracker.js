import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function FleetAssetTracker({ themeColor = '#10B981' }) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asset Tracker</Text>
      
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { borderColor: themeColor + '40', backgroundColor: themeColor + '10' }]}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={[styles.statBox, { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }]}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Rented Out</Text>
        </View>
      </View>
      
      <Text style={styles.subTitle}>Recent Bookings</Text>
      <ScrollView style={styles.list}>
        {[1, 2].map((item) => (
          <View key={item} style={styles.assetCard}>
            <View style={styles.assetHeader}>
              <Text style={styles.assetName}>Mahindra Tractor 575 DI</Text>
              <View style={[styles.badge, { backgroundColor: '#fef9c3' }]}>
                <Text style={[styles.badgeText, { color: '#ca8a04' }]}>In Field</Text>
              </View>
            </View>
            <Text style={styles.customerDetail}>Rented by: Suresh Kumar (9876543210)</Text>
            <Text style={styles.returnDetail}>Due: Tomorrow, 5:00 PM</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                <Text style={styles.actionText}>Call Client</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtnPrimary, { backgroundColor: themeColor }]} onPress={handleAction}>
                <Text style={styles.actionTextPrimary}>Mark Returned</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '500' },
  subTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#1e293b' },
  list: { paddingBottom: 20 },
  assetCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 12 },
  assetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  assetName: { fontWeight: 'bold', fontSize: 15, color: '#1e293b', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  customerDetail: { fontSize: 13, color: '#475569', marginBottom: 4 },
  returnDetail: { fontSize: 13, color: '#ef4444', fontWeight: '500', marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  actionText: { color: '#475569', fontWeight: 'bold', fontSize: 13 },
  actionBtnPrimary: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionTextPrimary: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 }
});

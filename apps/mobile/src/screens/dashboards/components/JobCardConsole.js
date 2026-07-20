import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function JobCardConsole({ themeColor = '#FFD600' }) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Active Repairs</Text>
        <TouchableOpacity style={[styles.newBtn, { backgroundColor: themeColor }]} onPress={handleAction}>
          <Text style={styles.newBtnText}>+ New Job</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.list}>
        {[1, 2].map((job) => (
          <View key={job} style={[styles.jobCard, { borderColor: themeColor + '40' }]}>
            <View style={styles.jobHeader}>
              <View>
                <Text style={styles.jobNo}>JC-204{job}</Text>
                <Text style={styles.customerName}>Maruti Swift - MH12 AB 1234</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: themeColor + '20' }]}>
                <Text style={[styles.badgeText, { color: themeColor }]}>In Progress</Text>
              </View>
            </View>
            
            <View style={styles.milestoneRow}>
              {['Check', 'Repair', 'Wash', 'Ready'].map((step, idx) => (
                <View key={step} style={styles.stepBox}>
                  <View style={[styles.stepDot, idx < 2 ? { backgroundColor: themeColor } : {}]} />
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                <Text style={styles.actionText}>Add Parts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtnPrimary, { backgroundColor: themeColor }]} onPress={handleAction}>
                <Text style={styles.actionTextPrimary}>Update Status</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  newBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  list: { paddingBottom: 20 },
  jobCard: { backgroundColor: '#ffffff', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  jobNo: { fontWeight: 'bold', fontSize: 16, color: '#1e293b' },
  customerName: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 10 },
  stepBox: { alignItems: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e2e8f0', marginBottom: 6 },
  stepText: { fontSize: 10, color: '#64748b', fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  actionText: { color: '#475569', fontWeight: 'bold', fontSize: 13 },
  actionBtnPrimary: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionTextPrimary: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 }
});

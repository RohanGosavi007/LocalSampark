import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function QueueReceptionDesk({ themeColor = '#00E5FF' }) {
  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Reception Desk</Text>
      
      <View style={[styles.mainQueueCard, { backgroundColor: themeColor + '15', borderColor: themeColor + '40' }]}>
        <Text style={styles.queueLabel}>Currently Serving</Text>
        <Text style={[styles.queueNumber, { color: themeColor }]}>Token #18</Text>
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: themeColor }]} onPress={handleNext}>
          <Text style={styles.nextBtnText}>CALL NEXT (19)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subTitle}>Today's Appointments</Text>
      <ScrollView style={styles.list}>
        {[19, 20, 21].map((token) => (
          <View key={token} style={styles.appointmentRow}>
            <View style={styles.tokenCircle}>
              <Text style={styles.tokenText}>#{token}</Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>Rahul Sharma</Text>
              <Text style={styles.timeText}>Est. 11:30 AM</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: themeColor + '20' }]}>
              <Text style={[styles.statusText, { color: themeColor }]}>Waiting</Text>
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
  mainQueueCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  queueLabel: { fontSize: 14, color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  queueNumber: { fontSize: 48, fontWeight: 'bold', marginVertical: 8 },
  nextBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  nextBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  subTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#1e293b' },
  list: { backgroundColor: '#ffffff', borderRadius: 16, padding: 12 },
  appointmentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tokenCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tokenText: { fontWeight: 'bold', color: '#475569' },
  patientInfo: { flex: 1 },
  patientName: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
  timeText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' }
});

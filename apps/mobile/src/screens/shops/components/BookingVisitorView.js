import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function BookingVisitorView({ shop }) {
  const handleBook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{shop?.name || 'City Clinic'}</Text>
        <Text style={styles.subtitle}>Healthcare & Appointments</Text>
      </View>
      
      <View style={styles.trackerBox}>
        <Text style={styles.trackerLabel}>LIVE TOKEN TRACKER</Text>
        <View style={styles.trackerRow}>
          <View style={styles.trackerCol}>
            <Text style={styles.trackerValue}>#18</Text>
            <Text style={styles.trackerSub}>Currently Serving</Text>
          </View>
          <View style={styles.trackerDivider} />
          <View style={styles.trackerCol}>
            <Text style={styles.trackerValue}>12m</Text>
            <Text style={styles.trackerSub}>Est. Wait Time</Text>
          </View>
        </View>
      </View>

      <View style={styles.servicesContainer}>
        <Text style={styles.sectionTitle}>Book Appointment</Text>
        {['General Checkup', 'Dental Cleaning', 'Consultation'].map((service, idx) => (
          <View key={idx} style={styles.serviceCard}>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{service}</Text>
              <Text style={styles.servicePrice}>₹500</Text>
            </View>
            <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
              <Text style={styles.bookText}>BOOK</Text>
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
  trackerBox: { margin: 16, backgroundColor: '#00E5FF15', borderWidth: 1, borderColor: '#00E5FF40', borderRadius: 16, padding: 16, alignItems: 'center' },
  trackerLabel: { fontSize: 12, fontWeight: 'bold', color: '#00B8D4', marginBottom: 12, letterSpacing: 1 },
  trackerRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  trackerCol: { alignItems: 'center' },
  trackerValue: { fontSize: 32, fontWeight: 'bold', color: '#00E5FF' },
  trackerSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  trackerDivider: { width: 1, backgroundColor: '#00E5FF40' },
  servicesContainer: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  serviceCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  serviceDetails: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  servicePrice: { fontSize: 14, fontWeight: '600', color: '#00E5FF', marginTop: 4 },
  bookButton: { backgroundColor: '#00E5FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  bookText: { color: '#ffffff', fontWeight: 'bold' }
});

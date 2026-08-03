import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useOrderRinger } from '../../../src/context/OrderRingerContext';

export default function AppointmentConfirmationScreen() {
  const { total, staff, date, time } = useLocalSearchParams();
  const { triggerNewOrder } = useOrderRinger();

  useEffect(() => {
    // Trigger shop owner ringing alert for this new appointment
    const bookingId = `APT-${Math.floor(Math.random() * 9000) + 1000}`;
    
    setTimeout(() => {
      triggerNewOrder({
        id: bookingId,
        customer: 'Local Resident',
        amount: `₹${total || 650}`,
        items: '2 Services',
        time: `${date} at ${time}`,
        type: 'Appointment',
        staff: staff || 'Any Available'
      });
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.successHeader}>
          <View style={styles.successCircle}>
            <Text style={styles.successIcon}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>Your appointment is secured.</Text>
        </View>

        <View style={styles.ticketCard}>
          <View style={styles.ticketTop}>
            <Text style={styles.shopName}>Glow & Glamour Salon</Text>
            <Text style={styles.address}>Shop 12, Pride Plaza, Dhanori</Text>
          </View>
          
          <View style={styles.ticketDivider}>
            <View style={styles.notchLeft} />
            <View style={styles.dashLine} />
            <View style={styles.notchRight} />
          </View>

          <View style={styles.ticketBody}>
            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{date || 'Today'}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{time || '11:00 AM'}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Professional</Text>
                <Text style={styles.detailValue}>{staff || 'Any Available'}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>₹{total || '650'} (Pay at Shop)</Text>
              </View>
            </View>
          </View>

          <View style={styles.ticketDivider}>
            <View style={styles.notchLeft} />
            <View style={styles.dashLine} />
            <View style={styles.notchRight} />
          </View>

          <View style={styles.qrSection}>
            <Text style={styles.qrLabel}>Show this QR code at the counter</Text>
            <View style={styles.qrMock}>
              <Text style={{fontSize: 80}}>📱</Text>
            </View>
            <Text style={styles.bookingId}>APT-7281</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 24, alignItems: 'center' },
  
  successHeader: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successIcon: { fontSize: 40 },
  successTitle: { color: '#0f172a', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  successSubtitle: { color: '#64748b', fontSize: 15 },
  
  ticketCard: { width: '100%', backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 32, borderWidth: 1, borderColor: '#ffffff', overflow: 'hidden' },
  ticketTop: { padding: 24, alignItems: 'center', backgroundColor: '#ffffff' },
  shopName: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  address: { color: '#64748b', fontSize: 13 },
  
  ticketDivider: { height: 30, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff' },
  notchLeft: { width: 15, height: 30, backgroundColor: '#f8fafc', borderTopRightRadius: 15, borderBottomRightRadius: 15, marginLeft: -1 },
  dashLine: { flex: 1, height: 1, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  notchRight: { width: 15, height: 30, backgroundColor: '#f8fafc', borderTopLeftRadius: 15, borderBottomLeftRadius: 15, marginRight: -1 },
  
  ticketBody: { padding: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  detailCol: { flex: 1 },
  detailLabel: { color: '#64748b', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { color: '#0f172a', fontSize: 15, fontWeight: 'bold' },
  
  qrSection: { padding: 24, alignItems: 'center', backgroundColor: '#f8fafc' },
  qrLabel: { color: '#64748b', fontSize: 13, marginBottom: 16 },
  qrMock: { width: 160, height: 160, backgroundColor: '#0f172a', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  bookingId: { color: '#3b82f6', fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  
  homeBtn: { backgroundColor: '#3b82f6', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  homeBtnText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' }
});

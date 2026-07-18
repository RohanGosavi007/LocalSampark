import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function ServiceBookings() {
  const [bookings, setBookings] = useState([
    { id: 'BK-9021', service: 'Plumbing Repair', customer: 'Vikram Singh', address: 'B-Wing, Park Springs', date: 'Tomorrow, 10:00 AM', status: 'Pending', price: '₹450' },
    { id: 'BK-9018', service: 'AC Servicing', customer: 'Anita Deshmukh', address: 'Row House 4, Dhanori', date: 'Today, 4:00 PM', status: 'Accepted', price: '₹799' }
  ]);

  const handleAction = (id, action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Success', `Booking ${action} successfully!`);
    if (action === 'Completed') {
       setBookings(bookings.filter(b => b.id !== id));
    } else {
       setBookings(bookings.map(b => b.id === id ? {...b, status: action} : b));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 My Bookings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {bookings.map(bk => (
          <View key={bk.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.bookingId}>{bk.id}</Text>
              <Text style={[styles.statusTag, bk.status === 'Accepted' && {backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981'}]}>
                {bk.status}
              </Text>
            </View>

            <Text style={styles.serviceName}>{bk.service}</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>👤 {bk.customer}</Text>
              <Text style={styles.infoText}>📍 {bk.address}</Text>
              <Text style={styles.infoText}>🕒 {bk.date}</Text>
              <Text style={styles.infoText}>💰 Expected Pay: {bk.price}</Text>
            </View>

            {bk.status === 'Pending' && (
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleAction(bk.id, 'Rejected')}>
                  <Text style={styles.btnRejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => handleAction(bk.id, 'Accepted')}>
                  <Text style={styles.btnAcceptText}>Accept Job</Text>
                </TouchableOpacity>
              </View>
            )}

            {bk.status === 'Accepted' && (
              <TouchableOpacity style={styles.btnComplete} onPress={() => handleAction(bk.id, 'Completed')}>
                <Text style={styles.btnCompleteText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  
  content: { padding: 15 },
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bookingId: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  statusTag: { color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  serviceName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  infoBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, marginBottom: 15 },
  infoText: { color: '#475569', marginBottom: 5 },
  
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnReject: { borderWidth: 1, borderColor: '#ef4444' },
  btnRejectText: { color: '#ef4444', fontWeight: 'bold' },
  btnAccept: { backgroundColor: '#3b82f6' },
  btnAcceptText: { color: '#0f172a', fontWeight: 'bold' },

  btnComplete: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnCompleteText: { color: '#0f172a', fontWeight: 'bold' }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ManagerLayout from './components/ManagerLayout';

const BeautyAppointmentsTab = () => {
  return (
    <ScrollView style={styles.tabContainer}>
      <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
      
      <View style={styles.appointmentCard}>
        <View style={styles.detailColumn}>
          <Text style={styles.clientName}>Neha Patel</Text>
          <Text style={styles.serviceText}>Bridal Makeup • 2 Hrs</Text>
          <Text style={styles.stylistText}>Stylist: Ritu</Text>
        </View>
        <View style={styles.actionColumn}>
          <Text style={styles.timeText}>02:00 PM</Text>
          <TouchableOpacity style={styles.statusBtn}><Text style={styles.statusBtnText}>Assign</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.appointmentCard}>
        <View style={styles.detailColumn}>
          <Text style={styles.clientName}>Anjali Desai</Text>
          <Text style={styles.serviceText}>Hair Spa + Cut • 1.5 Hrs</Text>
          <Text style={styles.stylistText}>Stylist: Any Available</Text>
        </View>
        <View style={styles.actionColumn}>
          <Text style={styles.timeText}>04:30 PM</Text>
          <TouchableOpacity style={styles.statusBtn}><Text style={styles.statusBtnText}>Assign</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default function BeautyManager() {
  const tabs = [
    { name: 'Appointments', component: BeautyAppointmentsTab },
    { name: 'Stylist Schedules' },
    { name: 'Service Catalog' },
    { name: 'Walk-in Queue' },
    { name: 'Memberships' },
    { name: 'POS' }
  ];

  return <ManagerLayout title="Beauty & Salon" icon="cut" tabs={tabs} />;
}

const styles = StyleSheet.create({
  tabContainer: { paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  appointmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f472b6', borderLeftWidth: 4 },
  detailColumn: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  serviceText: { fontSize: 14, color: '#64748b', marginTop: 4 },
  stylistText: { fontSize: 12, color: '#f472b6', marginTop: 4, fontWeight: 'bold' },
  actionColumn: { alignItems: 'flex-end' },
  timeText: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  statusBtn: { backgroundColor: '#fdf2f8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#fbcfe8' },
  statusBtnText: { color: '#ec4899', fontWeight: 'bold', fontSize: 12 }
});

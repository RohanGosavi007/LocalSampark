import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ManagerLayout from './components/ManagerLayout';

const AppointmentCalendarTab = () => {
  return (
    <ScrollView style={styles.tabContainer}>
      <Text style={styles.sectionTitle}>Today's Appointments</Text>
      
      <View style={styles.appointmentCard}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeText}>10:00 AM</Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.patientName}>Amit Sharma</Text>
          <Text style={styles.patientIssue}>General Checkup</Text>
        </View>
        <TouchableOpacity style={styles.statusBtn}><Text style={styles.statusBtnText}>Check-In</Text></TouchableOpacity>
      </View>

      <View style={styles.appointmentCard}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeText}>10:30 AM</Text>
        </View>
        <View style={styles.detailColumn}>
          <Text style={styles.patientName}>Sunita Verma</Text>
          <Text style={styles.patientIssue}>Fever & Cold</Text>
        </View>
        <TouchableOpacity style={[styles.statusBtn, styles.statusBtnDone]}><Text style={styles.statusBtnTextDone}>Completed</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default function DoctorManager() {
  const tabs = [
    { name: 'Patient Queue' },
    { name: 'OPD Slots', component: AppointmentCalendarTab },
    { name: 'Lab Reports' }
  ];

  return <ManagerLayout title="Clinic" icon="medkit" tabs={tabs} />;
}

const styles = StyleSheet.create({
  tabContainer: { paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  appointmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  timeColumn: { width: 80, borderRightWidth: 1, borderColor: '#e2e8f0', marginRight: 12 },
  timeText: { fontSize: 14, fontWeight: 'bold', color: '#3b82f6' },
  detailColumn: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  patientIssue: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  statusBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
  statusBtnDone: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statusBtnTextDone: { color: '#10b981', fontWeight: 'bold', fontSize: 12 }
});

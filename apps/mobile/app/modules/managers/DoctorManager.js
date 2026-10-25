import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ManagerLayout from './components/ManagerLayout';
import { apiGet } from '../../../src/lib/api';

const AppointmentCalendarTab = () => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  // The shop's own appointments (GET /shops/my-shop). This tab listed two invented patients
  // ("Amit Sharma — General Checkup", "Sunita Verma — Fever & Cold").
  useEffect(() => {
    apiGet('/shops/my-shop')
      .then((r) => setRows(r.appointments || []))
      .catch((e) => setError(e.message || 'Appointments could not be loaded.'));
  }, []);

  return (
    <ScrollView style={styles.tabContainer}>
      <Text style={styles.sectionTitle}>Appointments</Text>
      {error && <Text style={styles.patientIssue}>{error}</Text>}
      {rows && rows.length === 0 && <Text style={styles.patientIssue}>No appointments booked.</Text>}
      {(rows || []).map((a) => (
        <View key={a.id} style={styles.appointmentCard}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeText}>{a.slot_time || a.appointment_time || (a.scheduled_time ? new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.patientName}>{a.customer_name || a.patient_name || 'Patient'}</Text>
            <Text style={styles.patientIssue}>{a.service_name || a.notes || a.status || ''}</Text>
          </View>
        </View>
      ))}
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

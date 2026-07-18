import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import ManagerLayout from './components/ManagerLayout';

const PrescriptionApprovalsTab = () => {
  return (
    <ScrollView style={styles.tabContainer}>
      <Text style={styles.sectionTitle}>Pending Prescriptions (2)</Text>
      
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.patientName}>Rahul Sharma</Text>
          <Text style={styles.timeText}>10 mins ago</Text>
        </View>
        <Text style={styles.cardDetail}>Uploaded: Prescription_1.jpg</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.approveBtn]}><Text style={styles.btnTextApprove}>Approve & Fill</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.rejectBtn]}><Text style={styles.btnTextReject}>Reject</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.patientName}>Priya Singh</Text>
          <Text style={styles.timeText}>1 hour ago</Text>
        </View>
        <Text style={styles.cardDetail}>Uploaded: Doc_Image_Final.png</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.approveBtn]}><Text style={styles.btnTextApprove}>Approve & Fill</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.rejectBtn]}><Text style={styles.btnTextReject}>Reject</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default function PharmacyManager() {
  const tabs = [
    { name: 'Prescription Approvals', component: PrescriptionApprovalsTab },
    { name: 'Batch & Expiry' },
    { name: 'Delivery Tracking' }
  ];

  return <ManagerLayout title="Pharmacy" icon="medical" tabs={tabs} />;
}

const styles = StyleSheet.create({
  tabContainer: { paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#1e293b' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  patientName: { fontSize: 16, fontWeight: 'bold' },
  timeText: { fontSize: 12, color: '#94a3b8' },
  cardDetail: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  approveBtn: { backgroundColor: '#10b981', borderColor: '#10b981' },
  btnTextApprove: { color: '#fff', fontWeight: 'bold' },
  rejectBtn: { backgroundColor: '#fff', borderColor: '#ef4444' },
  btnTextReject: { color: '#ef4444', fontWeight: 'bold' }
});

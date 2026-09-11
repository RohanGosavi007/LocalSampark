import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ManagerLayout from './components/ManagerLayout';

/**
 * Pharmacy manager — prescription approvals.
 *
 * This tab showed "Pending Prescriptions (2)" with two patients by name —
 * "Rahul Sharma, 10 mins ago, Prescription_1.jpg" and "Priya Singh, 1 hour ago"
 * — and Approve & Fill / Reject buttons that had no handlers. A pharmacist
 * would have opened this to a queue of people who had never sent anything, and
 * tapping Approve did nothing to any of them.
 *
 * There is no prescription endpoint in the backend: nothing accepts an upload,
 * stores one, or queues it for a pharmacist. The customer-facing upload screen
 * now says as much too. Until that exists, this tab states what it is rather
 * than presenting an invented workload.
 */
const PrescriptionApprovalsTab = () => (
  <ScrollView style={styles.tabContainer}>
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>Prescription approvals are not connected yet</Text>
      <Text style={styles.stateBody}>
        Customers cannot send prescriptions through the app yet, so there is
        nothing here to approve. They are asked to contact your shop directly in
        the meantime.
      </Text>
    </View>
  </ScrollView>
);

export default function PharmacyManager() {
  const tabs = [
    { name: 'Prescription Approvals', component: PrescriptionApprovalsTab },
    { name: 'Batch & Expiry' },
    { name: 'Delivery Tracking' },
  ];

  return <ManagerLayout title="Pharmacy" icon="medical" tabs={tabs} />;
}

const styles = StyleSheet.create({
  tabContainer: { paddingVertical: 8 },
  stateBox: { backgroundColor: '#fff', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
});

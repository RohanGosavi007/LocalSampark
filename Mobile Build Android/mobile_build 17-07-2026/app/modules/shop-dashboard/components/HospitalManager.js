import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HospitalManager({ shop }) {
  // Determine tier based on mock or real shop data
  const tier = shop?.tier || 'small_opd'; // 'small_opd', 'polyclinic', 'big_hospital'

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏨 Hospital & OPD Management</Text>
        <Text style={styles.subtitle}>
          Tier: {tier === 'big_hospital' ? 'Large Hospital' : tier === 'polyclinic' ? 'Polyclinic' : 'Small OPD Clinic'}
        </Text>
      </View>

      {/* Common Module: OPD Tokens */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎟️ Live OPD Tokens</Text>
        <Text style={styles.statText}>Current Token: <Text style={{ fontWeight: 'bold', color: '#10b981' }}>#14</Text></Text>
        <Text style={styles.statText}>Next in queue: #15 (Waiting: 12)</Text>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Call Next Patient</Text>
        </TouchableOpacity>
      </View>

      {/* Common Module: Walk-in Registration */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Walk-in Registration</Text>
        <Text style={styles.cardDesc}>Quickly register a patient at the front desk.</Text>
        <TouchableOpacity style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>New Patient</Text>
        </TouchableOpacity>
      </View>

      {/* Tier 2 & 3: Lab & Pharmacy Integration */}
      {(tier === 'polyclinic' || tier === 'big_hospital') && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔬 Diagnostics & Pharmacy</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]}>
              <Text style={styles.btnSecondaryText}>Lab Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]}>
              <Text style={styles.btnSecondaryText}>Pharmacy Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tier 3: IPD, Blood Bank, Ambulances */}
      {tier === 'big_hospital' && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🛏️ IPD & Bed Management</Text>
            <Text style={styles.cardDesc}>General (12/20), Semi-Private (3/8), ICU (1/4)</Text>
            <TouchableOpacity style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Manage Wards</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚑 Emergency & Blood Bank</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]}>
                <Text style={styles.btnSecondaryText}>Ambulances</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]}>
                <Text style={styles.btnSecondaryText}>Blood Units</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  cardDesc: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  statText: { fontSize: 14, marginBottom: 4 },
  btnPrimary: { backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginTop: 12 },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold' },
  btnSecondary: { backgroundColor: '#f3f4f6', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { color: '#374151', fontWeight: 'bold' }
});

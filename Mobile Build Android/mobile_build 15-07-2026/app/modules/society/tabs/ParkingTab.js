import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';

export default function ParkingTab({ role }) {
  const [vehicles] = useState([
    { id: 1, type: 'Car', make: 'Honda City', number: 'MH-12-AB-1234', slot: 'A-42' },
    { id: 2, type: 'Bike', make: 'Royal Enfield', number: 'MH-12-XY-9876', slot: 'A-42B' }
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Manage Society Parking</Text>
          <Text style={styles.subtitle}>Allocate or reassign parking slots to residents.</Text>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Slot Allocation</Text>
          </TouchableOpacity>
        </View>
      )}

      {role === 'guard' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Verify Vehicle Log</Text>
          <TextInput style={styles.input} placeholder="Search Vehicle Number..." placeholderTextColor="#94a3b8" />
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Search Registry</Text>
          </TouchableOpacity>
        </View>
      )}

      {(role === 'resident' || role === 'admin') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>My Registered Vehicles</Text>
          {vehicles.map(v => (
            <View key={v.id} style={styles.vehicleRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{v.type === 'Car' ? '🚗' : '🏍️'}</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.vTitle}>{v.make}</Text>
                <Text style={styles.vMeta}>{v.number}</Text>
              </View>
              <View style={styles.slotBadge}>
                <Text style={styles.slotText}>Slot {v.slot}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>+ Register New Vehicle</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16, color: '#0f172a' },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  
  vehicleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  icon: { fontSize: 20 },
  vTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  vMeta: { color: '#64748b', fontSize: 12 },
  
  slotBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  slotText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 12 },
  
  outlineBtn: { borderWidth: 1, borderColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  outlineBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14 }
});

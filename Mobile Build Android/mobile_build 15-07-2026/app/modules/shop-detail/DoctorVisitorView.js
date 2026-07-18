import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';

export default function DoctorVisitorView({ shop }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const MOCK_SLOTS = [
    { id: 1, time: '10:00 AM', period: 'Morning' },
    { id: 2, time: '11:30 AM', period: 'Morning' },
    { id: 3, time: '05:00 PM', period: 'Evening' },
    { id: 4, time: '06:15 PM', period: 'Evening' },
  ];

  return (
    <VisitorLayout 
      shopName={shop.name || 'Dr. Sharma Clinic'} 
      shopAddress="Kalyani Nagar, Pune"
      shopIcon="🩺"
      cartCount={selectedSlot ? 1 : 0}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>
        
        <View style={styles.docProfile}>
          <Text style={styles.docName}>Dr. Rajesh Sharma</Text>
          <Text style={styles.docEdu}>MBBS, MD (General Medicine)</Text>
          <Text style={styles.docExp}>15+ Years Experience</Text>
          <View style={styles.feeBox}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeVal}>₹500</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available Slots Today</Text>
        
        <View style={styles.slotsGrid}>
          {MOCK_SLOTS.map(slot => (
            <TouchableOpacity 
              key={slot.id} 
              style={[styles.slotCard, selectedSlot === slot.id && styles.slotCardActive]}
              onPress={() => setSelectedSlot(slot.id)}
            >
              <Text style={[styles.slotTime, selectedSlot === slot.id && styles.slotTimeActive]}>{slot.time}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  docProfile: { backgroundColor: '#f0f9ff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#bae6fd' },
  docName: { fontSize: 20, fontWeight: '900', color: '#0369a1', marginBottom: 4 },
  docEdu: { fontSize: 14, color: '#0284c7', marginBottom: 2 },
  docExp: { fontSize: 13, color: '#0ea5e9', fontWeight: 'bold', marginBottom: 16 },
  feeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#e0f2fe', paddingTop: 12 },
  feeLabel: { fontSize: 14, color: '#0369a1', fontWeight: 'bold' },
  feeVal: { fontSize: 18, color: '#0284c7', fontWeight: '900' },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slotCard: { width: '30%', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  slotCardActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  slotTime: { fontSize: 14, fontWeight: 'bold', color: '#475569' },
  slotTimeActive: { color: '#fff' },
});

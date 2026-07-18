import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function ServiceBookingScreen() {
  const { total } = useLocalSearchParams();
  
  const [selectedStaff, setSelectedStaff] = useState('any');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedTime, setSelectedTime] = useState(null);

  const staffList = [
    { id: 'any', name: 'Any Available', role: 'Fastest booking', image: 'https://ui-avatars.com/api/?name=Any+Staff&background=1e293b&color=94a3b8' },
    { id: 'st1', name: 'Meera', role: 'Senior Stylist', image: 'https://ui-avatars.com/api/?name=Meera&background=3b82f6&color=fff' },
    { id: 'st2', name: 'Rohan', role: 'Barber', image: 'https://ui-avatars.com/api/?name=Rohan&background=10b981&color=fff' },
    { id: 'st3', name: 'Sneha', role: 'Skin Expert', image: 'https://ui-avatars.com/api/?name=Sneha&background=eab308&color=fff' },
  ];

  const dates = [
    { id: 'today', label: 'Today', date: '28 Jun' },
    { id: 'tomorrow', label: 'Tomorrow', date: '29 Jun' },
    { id: 'day3', label: 'Wed', date: '30 Jun' },
    { id: 'day4', label: 'Thu', date: '01 Jul' },
  ];

  const timeSlots = [
    { time: '10:00 AM', active: false }, // booked
    { time: '11:00 AM', active: true },
    { time: '12:00 PM', active: true },
    { time: '01:00 PM', active: false }, // lunch
    { time: '02:00 PM', active: true },
    { time: '03:00 PM', active: true },
    { time: '04:00 PM', active: true },
    { time: '05:00 PM', active: false }, // booked
  ];

  const handleConfirm = () => {
    // Navigate to confirmation with QR code
    router.push({
      pathname: '/modules/services/confirmation',
      params: { 
        total, 
        staff: staffList.find(s => s.id === selectedStaff)?.name,
        date: dates.find(d => d.id === selectedDate)?.date,
        time: selectedTime
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Staff & Time</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Staff Picker */}
        <Text style={styles.sectionTitle}>Choose Professional</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffContainer}>
          {staffList.map(staff => (
            <TouchableOpacity 
              key={staff.id} 
              style={[styles.staffCard, selectedStaff === staff.id && styles.staffCardActive]}
              onPress={() => setSelectedStaff(staff.id)}
            >
              <Image source={{ uri: staff.image }} style={styles.staffImg} />
              <Text style={styles.staffName}>{staff.name}</Text>
              <Text style={styles.staffRole}>{staff.role}</Text>
              
              {selectedStaff === staff.id && (
                <View style={styles.staffCheckmark}>
                  <Text style={{color: '#0f172a', fontSize: 10, fontWeight: 'bold'}}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          <View style={{width: 16}} />
        </ScrollView>

        <View style={styles.divider} />

        {/* Date Picker */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <View style={styles.datesContainer}>
          {dates.map(d => (
            <TouchableOpacity 
              key={d.id} 
              style={[styles.dateCard, selectedDate === d.id && styles.dateCardActive]}
              onPress={() => { setSelectedDate(d.id); setSelectedTime(null); }}
            >
              <Text style={[styles.dateLabel, selectedDate === d.id && styles.dateLabelActive]}>{d.label}</Text>
              <Text style={[styles.dateValue, selectedDate === d.id && styles.dateValueActive]}>{d.date}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time Slot Picker */}
        <Text style={styles.sectionTitle}>Select Time Slot</Text>
        <View style={styles.slotsGrid}>
          {timeSlots.map((slot, index) => (
            <TouchableOpacity 
              key={index}
              disabled={!slot.active}
              style={[
                styles.slotBtn, 
                !slot.active && styles.slotBtnDisabled,
                selectedTime === slot.time && styles.slotBtnActive
              ]}
              onPress={() => setSelectedTime(slot.time)}
            >
              <Text style={[
                styles.slotText,
                !slot.active && styles.slotTextDisabled,
                selectedTime === slot.time && styles.slotTextActive
              ]}>
                {slot.time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{height: 40}} />
      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Total Amount</Text>
          <Text style={styles.footerTotal}>₹{total}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.confirmBtn, !selectedTime && styles.confirmBtnDisabled]}
          disabled={!selectedTime}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnIcon: { color: '#0f172a', fontSize: 24 },
  
  scrollContent: { padding: 16 },
  sectionTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#ffffff', marginVertical: 24 },
  
  staffContainer: { flexDirection: 'row', paddingBottom: 8 },
  staffCard: { width: 110, backgroundColor: '#ffffff', padding: 12, borderRadius: 16, alignItems: 'center', marginRight: 12, borderWidth: 2, borderColor: '#ffffff', position: 'relative' },
  staffCardActive: { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  staffImg: { width: 56, height: 56, borderRadius: 28, marginBottom: 12 },
  staffName: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  staffRole: { color: '#64748b', fontSize: 11, textAlign: 'center' },
  staffCheckmark: { position: 'absolute', top: 8, right: 8, backgroundColor: '#3b82f6', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ffffff' },
  
  datesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dateCard: { flex: 1, alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff' },
  dateCardActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  dateLabel: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  dateLabelActive: { color: '#bfdbfe' },
  dateValue: { color: '#0f172a', fontSize: 14, fontWeight: 'bold' },
  dateValueActive: { color: '#0f172a' },
  
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  slotBtn: { width: '31%', backgroundColor: '#ffffff', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff' },
  slotBtnDisabled: { opacity: 0.4, backgroundColor: '#f8fafc' },
  slotBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  slotText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  slotTextDisabled: { color: '#64748b' },
  slotTextActive: { color: '#0f172a', fontWeight: 'bold' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerInfo: { flex: 1 },
  footerLabel: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  footerTotal: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  confirmBtn: { backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  confirmBtnDisabled: { backgroundColor: '#ffffff' },
  confirmBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});

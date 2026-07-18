import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch } from 'react-native';

export default function AppointmentsScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [slotsEnabled, setSlotsEnabled] = useState(true);

  const mockAppointments = [
    { id: 'APT-109', customer: 'Priya Sharma', service: 'Haircut + Spa', time: 'Today, 4:00 PM', staff: 'Meera', status: 'Upcoming' },
    { id: 'APT-110', customer: 'Rohan Patil', service: 'Beard Trim', time: 'Today, 5:30 PM', staff: 'Rahul', status: 'Upcoming' },
    { id: 'APT-108', customer: 'Sneha Gupta', service: 'Facial', time: 'Yesterday, 2:00 PM', staff: 'Meera', status: 'Completed' }
  ];

  const timeSlots = [
    { time: '09:00 AM', active: true },
    { time: '10:00 AM', active: true },
    { time: '11:00 AM', active: false }, // booked
    { time: '12:00 PM', active: true },
    { time: '01:00 PM', active: false }, // lunch break
    { time: '02:00 PM', active: true },
    { time: '03:00 PM', active: true },
    { time: '04:00 PM', active: false }, // booked
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.headerToggle}>
          <Text style={styles.toggleText}>Accepting Bookings</Text>
          <Switch 
            value={slotsEnabled} 
            onValueChange={setSlotsEnabled}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'slots' && styles.activeTab]}
          onPress={() => setActiveTab('slots')}
        >
          <Text style={[styles.tabText, activeTab === 'slots' && styles.activeTabText]}>Manage Slots</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>Past</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer}>
        {activeTab === 'slots' ? (
          <View style={styles.slotsSection}>
            <Text style={styles.sectionTitle}>Today's Availability</Text>
            <Text style={styles.sectionSubtitle}>Tap to block/unblock specific time slots</Text>
            
            <View style={styles.slotsGrid}>
              {timeSlots.map((slot, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.slotChip, !slot.active && styles.slotChipInactive]}
                >
                  <Text style={[styles.slotText, !slot.active && styles.slotTextInactive]}>{slot.time}</Text>
                  {!slot.active && <Text style={styles.slotBadge}>Blocked</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveSlotsBtn}>
              <Text style={styles.saveSlotsBtnText}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        ) : (
          mockAppointments
            .filter(a => activeTab === 'upcoming' ? a.status === 'Upcoming' : a.status === 'Completed')
            .map(apt => (
              <View key={apt.id} style={styles.aptCard}>
                <View style={styles.aptHeader}>
                  <Text style={styles.aptId}>{apt.id}</Text>
                  <View style={[styles.statusBadge, apt.status === 'Completed' && styles.statusBadgeCompleted]}>
                    <Text style={[styles.statusText, apt.status === 'Completed' && styles.statusTextCompleted]}>{apt.status}</Text>
                  </View>
                </View>
                
                <Text style={styles.customerName}>{apt.customer}</Text>
                
                <View style={styles.aptDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>✂️</Text>
                    <Text style={styles.detailText}>{apt.service}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🕒</Text>
                    <Text style={styles.detailText}>{apt.time}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>👤</Text>
                    <Text style={styles.detailText}>Staff: {apt.staff}</Text>
                  </View>
                </View>

                {activeTab === 'upcoming' && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.rescheduleBtn]}>
                      <Text style={styles.actionBtnTextReschedule}>Reschedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]}>
                      <Text style={styles.actionBtnText}>Mark Complete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  headerToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 12 },
  toggleText: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', paddingHorizontal: 8, paddingBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#3b82f6' },
  
  listContainer: { padding: 16 },
  
  aptCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aptId: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  statusBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeCompleted: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusText: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold' },
  statusTextCompleted: { color: '#10b981' },
  
  customerName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  aptDetails: { gap: 8, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14 },
  detailText: { color: '#475569', fontSize: 14 },
  
  actions: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  rescheduleBtn: { backgroundColor: 'transparent', borderColor: '#e2e8f0' },
  completeBtn: { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
  actionBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  actionBtnTextReschedule: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
  
  slotsSection: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  sectionSubtitle: { color: '#64748b', fontSize: 13, marginBottom: 20 },
  
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  slotChip: { width: '48%', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', position: 'relative' },
  slotChipInactive: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  slotText: { color: '#10b981', fontWeight: 'bold', fontSize: 15 },
  slotTextInactive: { color: '#64748b' },
  slotBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', color: '#0f172a', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  
  saveSlotsBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveSlotsBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});

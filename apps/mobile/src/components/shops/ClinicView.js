import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, TextInput } from 'react-native';
import { Stethoscope, CalendarPlus, UserCheck, FileText, ChevronRight } from 'lucide-react-native';

export default function ClinicView({ shop, services = [], serviceSlots = [], onBook }) {
  const [symptoms, setSymptoms] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Stethoscope size={28} color="#fff" />
          <Text style={styles.heroTitle}>Book an Appointment</Text>
        </View>
        <Text style={styles.heroDesc}>Select a doctor and consult for your health concerns.</Text>
      </View>

      <View style={styles.symptomsContainer}>
        <Text style={styles.symptomsLabel}>Briefly describe your symptoms (Optional)</Text>
        <TextInput 
          style={styles.symptomsInput} 
          placeholder="E.g., fever for 2 days, headache..."
          value={symptoms}
          onChangeText={setSymptoms}
          multiline
        />
        <View style={styles.uploadRow}>
          <FileText size={18} color="#3b82f6" />
          <Text style={styles.uploadText}>Upload Previous Records</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Available Doctors & Services</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <UserCheck size={40} color="#94a3b8" />
          <Text style={styles.emptyText}>No doctors available currently.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.providerBadge}>
                  <Text style={styles.providerInitial}>{item.providerName ? item.providerName[0] : 'D'}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.providerName}>{item.providerName || 'General Physician'}</Text>
                  <Text style={styles.serviceName}>{item.serviceName}</Text>
                </View>
              </View>
              
              <View style={styles.serviceDetailsRow}>
                <Text style={styles.servicePrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : 'Free'}</Text>
                <Text style={styles.serviceDuration}>{item.durationMinutes} mins</Text>
              </View>
              
              <Text style={{ fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#334155' }}>Available Slots:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {serviceSlots
                  .filter((slot) => slot.status === 'AVAILABLE')
                  .map((slot) => (
                    <TouchableOpacity 
                      key={slot.id} 
                      style={[styles.slotBtn, selectedSlot?.id === slot.id && styles.selectedSlotBtn]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text style={[styles.slotText, selectedSlot?.id === slot.id && { color: '#fff' }]}>{slot.startTime}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <TouchableOpacity 
                style={[styles.bookBtn, !selectedSlot && { opacity: 0.5 }]}
                disabled={!selectedSlot}
                onPress={() => onBook(selectedSlot.id, { patientSymptoms: symptoms })}
              >
                <CalendarPlus size={18} color="#fff" />
                <Text style={styles.bookBtnText}>Book Slot</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  heroCard: { backgroundColor: '#2563eb', padding: 24, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: -16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 14, color: '#bfdbfe', lineHeight: 20 },
  symptomsContainer: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  symptomsLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  symptomsInput: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, height: 80, textAlignVertical: 'top', color: '#0f172a' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  uploadText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginHorizontal: 16, marginBottom: 12, marginTop: 8 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#64748b', fontSize: 15 },
  serviceCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  providerBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  providerInitial: { fontSize: 20, fontWeight: '700', color: '#4f46e5' },
  serviceInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  serviceName: { fontSize: 13, color: '#64748b', marginTop: 2 },
  serviceDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 },
  servicePrice: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  serviceDuration: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedSlotBtn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  slotText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});

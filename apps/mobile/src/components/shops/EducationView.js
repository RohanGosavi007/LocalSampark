import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { GraduationCap, Clock, Check } from 'lucide-react-native';

export default function ({ shop, services = [], serviceSlots = [], onBook }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <GraduationCap size={24} color="#059669" />
          <Text style={styles.heroTitle}>Learning & Education</Text>
        </View>
        <Text style={styles.heroDesc}>Enroll in classes and start learning today.</Text>
      </View>

      <Text style={styles.sectionHeader}>Available Classes</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <GraduationCap size={40} color="#a7f3d0" />
          <Text style={styles.emptyText}>No classes scheduled.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.serviceCard}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{item.serviceName}</Text>
                <View style={styles.durationRow}>
                  <Clock size={14} color="#64748b" />
                  <Text style={styles.serviceDuration}>{item.durationMinutes} mins per session</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <Text style={styles.servicePrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : 'Free Trial'}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 12, color: '#334155' }}>Available Slots:</Text>
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
                onPress={() => onBook(selectedSlot.id, {})}
              >
                <Text style={styles.bookBtnText}>Book Slot</Text>
              </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  heroCard: { backgroundColor: '#d1fae5', padding: 24, borderBottomWidth: 1, borderBottomColor: '#a7f3d0' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#065f46' },
  heroDesc: { fontSize: 13, color: '#047857' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#064e3b', margin: 16, marginTop: 24 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#34d399', fontSize: 15 },
  serviceCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceInfo: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceDuration: { fontSize: 13, color: '#64748b' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  servicePrice: { fontSize: 16, fontWeight: '800', color: '#065f46' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedSlotBtn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  slotText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});

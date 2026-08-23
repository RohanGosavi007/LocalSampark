import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Sparkles, CalendarClock, Target } from 'lucide-react-native';

export default function WellnessView({ shop, services = [], serviceSlots = [], onBook }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Sparkles size={24} color="#fcd34d" />
          <Text style={styles.heroTitle}>Beauty & Wellness</Text>
        </View>
        <Text style={styles.heroDesc}>Book your session for premium care and fitness.</Text>
      </View>

      <Text style={styles.sectionHeader}>Available Services</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <Target size={40} color="#94a3b8" />
          <Text style={styles.emptyText}>No sessions available currently.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={[styles.serviceCard, { flexDirection: 'column' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{item.serviceName}</Text>
                  <Text style={styles.serviceDuration}>Duration: {item.durationMinutes} mins</Text>
                  {item.providerName && (
                    <Text style={styles.providerName}>By {item.providerName}</Text>
                  )}
                </View>
                <View style={styles.actionBlock}>
                  <Text style={styles.servicePrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', marginBottom: 8, color: '#334155' }}>Available Slots:</Text>
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
                style={[styles.bookBtn, !selectedSlot && { opacity: 0.5 }, { alignSelf: 'flex-end' }]}
                disabled={!selectedSlot}
                onPress={() => onBook(selectedSlot.id, {})}
              >
                <CalendarClock size={16} color="#fff" />
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
  container: { flex: 1, backgroundColor: '#fafaf9' },
  heroCard: { backgroundColor: '#1c1917', padding: 24, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 13, color: '#a8a29e' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#1c1917', margin: 16 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#78716c', fontSize: 15 },
  serviceCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e7e5e4', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  serviceInfo: { flex: 1, paddingRight: 12 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#292524', marginBottom: 4 },
  serviceDuration: { fontSize: 13, color: '#78716c', marginBottom: 4 },
  providerName: { fontSize: 12, color: '#a8a29e', fontStyle: 'italic' },
  actionBlock: { alignItems: 'flex-end', justifyContent: 'center' },
  servicePrice: { fontSize: 16, fontWeight: '800', color: '#1c1917', marginBottom: 8 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

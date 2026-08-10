import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Droplet, Home, MapPin, CalendarPlus } from 'lucide-react-native';

export default function ({ shop, services = [], serviceSlots = [], onBook }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [serviceMode, setServiceMode] = useState('home'); // 'home' or 'station'

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Droplet size={28} color="#fff" />
          <Text style={styles.heroTitle}>Car & Bike Wash</Text>
        </View>
        <Text style={styles.heroDesc}>Professional detailing and washing services.</Text>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, serviceMode === 'home' && styles.toggleBtnActive]}
          onPress={() => setServiceMode('home')}
        >
          <Home size={18} color={serviceMode === 'home' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, serviceMode === 'home' && styles.toggleTextActive]}>
            Doorstep Wash
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toggleBtn, serviceMode === 'station' && styles.toggleBtnActive]}
          onPress={() => setServiceMode('station')}
        >
          <MapPin size={18} color={serviceMode === 'station' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, serviceMode === 'station' && styles.toggleTextActive]}>
            Visit Station
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Wash Packages</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <Droplet size={40} color="#94a3b8" />
          <Text style={styles.emptyText}>No packages available.</Text>
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
                <Text style={styles.serviceDuration}>Approx. {item.durationMinutes} mins</Text>
              </View>
              <View style={styles.actionRow}>
                <Text style={styles.servicePrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
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
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  heroCard: { backgroundColor: '#0ea5e9', padding: 24, paddingBottom: 32, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 14, color: '#e0f2fe' },
  toggleContainer: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 4, marginTop: -20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#0284c7' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#64748b', fontSize: 15 },
  serviceCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e0f2fe' },
  serviceInfo: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  serviceDuration: { fontSize: 13, color: '#64748b' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  servicePrice: { fontSize: 16, fontWeight: '800', color: '#0284c7' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0f9ff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' },
  bookBtnText: { color: '#0284c7', fontSize: 14, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedSlotBtn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  slotText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});

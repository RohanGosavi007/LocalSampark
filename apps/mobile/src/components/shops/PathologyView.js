import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { FlaskConical, Home, Building2, CalendarPlus, ChevronRight } from 'lucide-react-native';

export default function ({ shop, services = [], serviceSlots = [], onBook }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [collectionMode, setCollectionMode] = useState('home'); // 'home' or 'lab'

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>Diagnostic Tests</Text>
        <Text style={styles.subtitle}>Select your preferred sample collection method.</Text>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, collectionMode === 'home' && styles.toggleBtnActive]}
          onPress={() => setCollectionMode('home')}
        >
          <Home size={18} color={collectionMode === 'home' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, collectionMode === 'home' && styles.toggleTextActive]}>
            Home Collection
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toggleBtn, collectionMode === 'lab' && styles.toggleBtnActive]}
          onPress={() => setCollectionMode('lab')}
        >
          <Building2 size={18} color={collectionMode === 'lab' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, collectionMode === 'lab' && styles.toggleTextActive]}>
            Visit Lab
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBanner}>
        {collectionMode === 'home' ? (
          <Text style={styles.infoBannerText}>A phlebotomist will visit your address to collect samples safely.</Text>
        ) : (
          <Text style={styles.infoBannerText}>Visit our lab at the booked time. Skip the queue.</Text>
        )}
      </View>

      <Text style={styles.sectionHeader}>Available Tests</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <FlaskConical size={40} color="#94a3b8" />
          <Text style={styles.emptyText}>No tests available currently.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.iconContainer}>
                  <FlaskConical size={20} color="#059669" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{item.serviceName}</Text>
                  <Text style={styles.providerName}>Report in {item.durationMinutes} hrs</Text>
                </View>
              </View>
              
              <View style={styles.serviceDetailsRow}>
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
  container: { flex: 1, backgroundColor: '#fff' },
  headerArea: { padding: 20, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b' },
  toggleContainer: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#059669', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#fff' },
  infoBanner: { marginHorizontal: 16, backgroundColor: '#ecfdf5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1fae5', marginBottom: 24 },
  infoBannerText: { color: '#047857', fontSize: 13, textAlign: 'center', fontWeight: '500' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginHorizontal: 16, marginBottom: 12 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#64748b', fontSize: 15 },
  serviceCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  providerName: { fontSize: 13, color: '#64748b', marginTop: 2 },
  serviceDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  servicePrice: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  bookBtn: { backgroundColor: '#059669', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedSlotBtn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  slotText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});

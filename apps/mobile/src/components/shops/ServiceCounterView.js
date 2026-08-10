import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, TextInput } from 'react-native';
import { PackageSearch, UploadCloud, ChevronRight } from 'lucide-react-native';

export default function ({ shop, services = [], serviceSlots = [], onBook }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [details, setDetails] = useState('');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <PackageSearch size={24} color="#f59e0b" />
          <Text style={styles.heroTitle}>Service Counter</Text>
        </View>
        <Text style={styles.heroDesc}>Quick and reliable printing and parcel services.</Text>
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.actionLabel}>Provide Details (File link, address, etc)</Text>
        <TextInput 
          style={styles.textInput}
          placeholder="Enter details for the counter..."
          value={details}
          onChangeText={setDetails}
          multiline
        />
        <TouchableOpacity style={styles.uploadBtn}>
          <UploadCloud size={16} color="#451a03" />
          <Text style={styles.uploadBtnText}>Upload File / Image</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Rates & Services</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <PackageSearch size={40} color="#fcd34d" />
          <Text style={styles.emptyText}>No services available.</Text>
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
                <Text style={styles.servicePrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
              </View>
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
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fef3c7' },
  heroCard: { backgroundColor: '#d97706', padding: 24, paddingBottom: 32, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 13, color: '#fef3c7' },
  actionCard: { margin: 16, marginTop: -20, backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#78350f', marginBottom: 8 },
  textInput: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 12, height: 70, textAlignVertical: 'top', color: '#451a03', marginBottom: 12 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fde68a', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fcd34d' },
  uploadBtnText: { color: '#451a03', fontSize: 14, fontWeight: '600' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#78350f', marginHorizontal: 16, marginTop: 12, marginBottom: 12 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#b45309', fontSize: 15 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#78350f', marginBottom: 4 },
  servicePrice: { fontSize: 15, fontWeight: '800', color: '#b45309' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#d97706', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedSlotBtn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  slotText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});

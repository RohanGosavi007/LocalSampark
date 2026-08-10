import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, TextInput } from 'react-native';
import { Wrench, Home, Building2, CalendarPlus, PackagePlus } from 'lucide-react-native';

export default function GarageView({ shop, services = [], products = [], serviceSlots = [], onBook }) {
  const [serviceMode, setServiceMode] = useState('workshop'); // 'home' or 'workshop'
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Wrench size={24} color="#fff" />
          <Text style={styles.heroTitle}>Automotive & Repair</Text>
        </View>
        <Text style={styles.heroDesc}>Expert mechanic services and genuine spare parts.</Text>
      </View>

      <View style={styles.vehicleForm}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.input} 
            placeholder="Make (e.g. Hyundai)" 
            value={vehicleMake}
            onChangeText={setVehicleMake}
          />
          <TextInput 
            style={styles.input} 
            placeholder="Model (e.g. i20 2018)" 
            value={vehicleModel}
            onChangeText={setVehicleModel}
          />
        </View>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, serviceMode === 'home' && styles.toggleBtnActive]}
          onPress={() => setServiceMode('home')}
        >
          <Home size={18} color={serviceMode === 'home' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, serviceMode === 'home' && styles.toggleTextActive]}>
            Home Service
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toggleBtn, serviceMode === 'workshop' && styles.toggleBtnActive]}
          onPress={() => setServiceMode('workshop')}
        >
          <Building2 size={18} color={serviceMode === 'workshop' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, serviceMode === 'workshop' && styles.toggleTextActive]}>
            Visit Workshop
          </Text>
        </TouchableOpacity>
      </View>

      {/* Services List */}
      <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 16 }]}>Select Services</Text>
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.serviceName}</Text>
                <Text style={styles.itemPrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
              </View>

              <View style={{ marginTop: 12 }}>
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
              </View>

              <TouchableOpacity 
                style={[styles.bookBtn, !selectedSlot && { opacity: 0.5 }]}
                disabled={!selectedSlot}
                onPress={() => onBook(selectedSlot.id, { 
                  serviceMode, 
                  vehicleMake, 
                  vehicleModel 
                })}
              >
                <CalendarPlus size={16} color="#fff" />
                <Text style={styles.bookBtnText}>Book Slot</Text>
              </TouchableOpacity>
            </View>
          )}
        />

      {/* Spare Parts List (Hybrid) */}
      <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 24 }]}>Genuine Spare Parts</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn}>
              <PackagePlus size={16} color="#0f172a" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  heroCard: { backgroundColor: '#1e293b', padding: 24, paddingBottom: 32, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 13, color: '#94a3b8' },
  vehicleForm: { margin: 16, marginTop: -20, backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, color: '#0f172a' },
  toggleContainer: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginTop: 8 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#1e293b' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#fff' },
  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#334155' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  addBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedSlotBtn: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  slotText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});

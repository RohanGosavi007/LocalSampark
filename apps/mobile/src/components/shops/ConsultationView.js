import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, TextInput } from 'react-native';
import { Briefcase, Video, Building, CalendarPlus } from 'lucide-react-native';

export default function ConsultationView({ shop, services = [], serviceSlots = [], onBook }) {
  const [consultType, setConsultType] = useState('online'); // 'online' or 'in-person'
  const [topic, setTopic] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Briefcase size={24} color="#fff" />
          <Text style={styles.heroTitle}>Professional Consultation</Text>
        </View>
        <Text style={styles.heroDesc}>Expert advice and reliable consulting services.</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>What do you need help with?</Text>
        <TextInput 
          style={styles.textInput}
          placeholder="E.g., Tax filing for FY23, Property dispute..."
          value={topic}
          onChangeText={setTopic}
        />
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, consultType === 'online' && styles.toggleBtnActive]}
          onPress={() => setConsultType('online')}
        >
          <Video size={18} color={consultType === 'online' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, consultType === 'online' && styles.toggleTextActive]}>
            Online Video Call
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.toggleBtn, consultType === 'in-person' && styles.toggleBtnActive]}
          onPress={() => setConsultType('in-person')}
        >
          <Building size={18} color={consultType === 'in-person' ? '#fff' : '#64748b'} />
          <Text style={[styles.toggleText, consultType === 'in-person' && styles.toggleTextActive]}>
            In-Office Visit
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Consultation Services</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <Briefcase size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No services available.</Text>
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
                <Text style={styles.serviceDuration}>Session: {item.durationMinutes} mins</Text>
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
              onPress={() => onBook(selectedSlot.id, { 
                consultType, 
                topic 
              })}
            >
              <CalendarPlus size={16} color="#fff" />
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
  heroCard: { backgroundColor: '#334155', padding: 24, paddingBottom: 32, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 13, color: '#cbd5e1' },
  inputContainer: { margin: 16, marginTop: -20, backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  textInput: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, color: '#0f172a' },
  toggleContainer: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginTop: 8 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#334155' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#fff' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15 },
  serviceCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceInfo: { flex: 1, justifyContent: 'center' },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  serviceDuration: { fontSize: 13, color: '#64748b' },
  actionBlock: { alignItems: 'flex-end', justifyContent: 'center' },
  servicePrice: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedSlotBtn: { backgroundColor: '#334155', borderColor: '#334155' },
  slotText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});

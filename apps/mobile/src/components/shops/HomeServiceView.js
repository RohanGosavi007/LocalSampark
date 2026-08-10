import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, TextInput } from 'react-native';
import { Hammer, ClipboardCheck, ArrowRight } from 'lucide-react-native';

export default function HomeServiceView({ shop, services = [], serviceSlots = [], onBook }) {
  const [issueDesc, setIssueDesc] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Hammer size={24} color="#fff" />
          <Text style={styles.heroTitle}>Professional Services</Text>
        </View>
        <Text style={styles.heroDesc}>Trusted professionals for all your home and repair needs.</Text>
      </View>

      <View style={styles.surveyCard}>
        <View style={styles.surveyHeader}>
          <ClipboardCheck size={20} color="#4338ca" />
          <Text style={styles.surveyTitle}>Request a Pre-Service Survey</Text>
        </View>
        <Text style={styles.surveyDesc}>Not sure about the cost? Book a free inspection, and our technician will provide a final quote after visiting.</Text>
        <TextInput 
          style={styles.surveyInput}
          placeholder="Describe the issue (e.g. pipe leaking)"
          value={issueDesc}
          onChangeText={setIssueDesc}
          multiline
        />
        <TouchableOpacity style={styles.surveyBtn}>
          <Text style={styles.surveyBtnText}>Book Free Inspection</Text>
          <ArrowRight size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Direct Services</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <Hammer size={40} color="#94a3b8" />
          <Text style={styles.emptyText}>No standard services listed.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
          <View style={[styles.serviceCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{item.serviceName}</Text>
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
              style={[styles.surveyBtn, !selectedSlot && { opacity: 0.5 }]}
              disabled={!selectedSlot}
              onPress={() => onBook(selectedSlot.id, { issueDesc })}
            >
              <Text style={styles.surveyBtnText}>Book Service</Text>
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
  heroCard: { backgroundColor: '#312e81', padding: 24, paddingBottom: 32, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 13, color: '#c7d2fe' },
  surveyCard: { backgroundColor: '#fff', margin: 16, marginTop: -20, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#e0e7ff' },
  surveyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  surveyTitle: { fontSize: 16, fontWeight: '700', color: '#312e81' },
  surveyDesc: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 },
  surveyInput: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, height: 70, textAlignVertical: 'top', color: '#0f172a', marginBottom: 12 },
  surveyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 8 },
  surveyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginHorizontal: 16, marginTop: 12, marginBottom: 12 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#64748b', fontSize: 15 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  servicePrice: { fontSize: 15, fontWeight: '700', color: '#334155' },
  bookBtn: { backgroundColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' },
  bookBtnText: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedSlotBtn: { backgroundColor: '#4338ca', borderColor: '#4338ca' },
  slotText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});

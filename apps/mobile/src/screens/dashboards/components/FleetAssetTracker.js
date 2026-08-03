import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Car, Phone, CheckCircle2, AlertCircle } from 'lucide-react-native';
let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}

export default function FleetAssetTracker({ themeColor = '#14b8a6' }) {
  const handleAction = () => { if (Haptics) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e) {} } };

  return (
    <View style={s.root}>
      <Text style={s.title}>Asset Tracker</Text>
      <View style={s.summaryRow}>
        <View style={s.summaryCardActive}><Text style={s.summaryBig}>12</Text><Text style={s.summaryLabel}>Available</Text></View>
        <View style={s.summaryCardDefault}><Text style={s.summaryBigWhite}>5</Text><Text style={s.summaryLabel}>Rented Out</Text></View>
      </View>
      <Text style={s.sectionLabel}>Recent Bookings</Text>
      <View style={{ gap: 12 }}>
        {[1, 2].map((item) => (
          <View key={item} style={s.bookingCard}>
            <View style={s.bookingHeader}>
              <Text style={s.bookingTitle}>Mahindra Tractor 575 DI</Text>
              <View style={s.statusBadge}><Text style={s.statusText}>In Field</Text></View>
            </View>
            <Text style={s.bookingDetail}>Rented by: Suresh Kumar (9876543210)</Text>
            <Text style={s.bookingDue}>Due: Tomorrow, 5:00 PM</Text>
            <View style={s.actionRow}>
              <TouchableOpacity style={s.callBtn} onPress={handleAction}><Phone size={14} color="#94a3b8" style={{ marginRight: 6 }} /><Text style={s.callBtnText}>Call Client</Text></TouchableOpacity>
              <TouchableOpacity style={s.returnBtn} onPress={handleAction}><CheckCircle2 size={14} color="#fff" style={{ marginRight: 6 }} /><Text style={s.returnBtnText}>Mark Returned</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCardActive: { flex: 1, borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)', backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: 16, padding: 16, alignItems: 'center' },
  summaryCardDefault: { flex: 1, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a', borderRadius: 16, padding: 16, alignItems: 'center' },
  summaryBig: { fontSize: 32, fontWeight: '900', color: '#2dd4bf' },
  summaryBigWhite: { fontSize: 32, fontWeight: '900', color: '#ffffff' },
  summaryLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 4 },
  sectionLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  bookingCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  bookingTitle: { fontWeight: '700', fontSize: 16, color: '#ffffff', flex: 1, marginRight: 8 },
  statusBadge: { backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fbbf24', fontWeight: '700', fontSize: 12 },
  bookingDetail: { fontSize: 12, color: '#cbd5e1', fontWeight: '500', marginBottom: 4 },
  bookingDue: { fontSize: 12, color: '#f87171', fontWeight: '700', marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  callBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#020617', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  callBtnText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  returnBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0d9488', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  returnBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Users, PhoneCall, Clock, CheckCircle2 } from 'lucide-react-native';
let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}

export default function QueueReceptionDesk({ themeColor = '#0ea5e9' }) {
  const handleNext = () => { if (Haptics) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch(e) {} } };

  return (
    <View style={s.root}>
      <Text style={s.title}>Live Reception Desk</Text>
      <View style={s.tokenCard}>
        <Text style={s.tokenLabel}>Currently Serving</Text>
        <Text style={s.tokenNumber}>Token #18</Text>
        <TouchableOpacity style={s.callBtn} onPress={handleNext}>
          <PhoneCall size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.callBtnText}>CALL NEXT (19)</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.sectionLabel}>Today's Appointments</Text>
      <View style={s.listContainer}>
        {[19, 20, 21].map((token, idx) => (
          <View key={token} style={[s.listItem, idx !== 2 && s.listBorder]}>
            <View style={s.tokenBadge}><Text style={s.tokenBadgeText}>#{token}</Text></View>
            <View style={{ flex: 1 }}><Text style={s.personName}>Rahul Sharma</Text><View style={s.timeRow}><Clock size={12} color="#64748b" style={{ marginRight: 4 }} /><Text style={s.timeText}>Est. 11:30 AM</Text></View></View>
            <View style={s.statusBadge}><Text style={s.statusText}>Waiting</Text></View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  tokenCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24 },
  tokenLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  tokenNumber: { fontSize: 48, fontWeight: '900', color: '#38bdf8', marginVertical: 8 },
  callBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  callBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  sectionLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  listContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tokenBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#334155' },
  tokenBadgeText: { fontWeight: '900', color: '#cbd5e1', fontSize: 14 },
  personName: { fontWeight: '700', color: '#ffffff', fontSize: 14, marginBottom: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  statusBadge: { backgroundColor: 'rgba(14,165,233,0.1)', borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: '#38bdf8', fontWeight: '700', fontSize: 12 },
});

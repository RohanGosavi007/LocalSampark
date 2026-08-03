import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Wrench, CheckCircle, Clock } from 'lucide-react-native';
let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}

export default function JobCardConsole({ themeColor = '#eab308' }) {
  const handleAction = () => { if (Haptics) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e) {} } };

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <Text style={s.title}>Active Repairs</Text>
        <TouchableOpacity style={s.newBtn} onPress={handleAction}><Plus size={16} color="#000" style={{ marginRight: 4 }} /><Text style={s.newBtnText}>New Job</Text></TouchableOpacity>
      </View>
      <View style={{ gap: 16 }}>
        {[1, 2].map((job) => (
          <View key={job} style={s.jobCard}>
            <View style={s.jobHeader}>
              <View><Text style={s.jobId}>JC-204{job}</Text><Text style={s.jobMeta}>Maruti Swift • MH12 AB 1234</Text></View>
              <View style={s.statusBadge}><Text style={s.statusText}>In Progress</Text></View>
            </View>
            <View style={s.progressRow}>
              {['Check', 'Repair', 'Wash', 'Ready'].map((step, idx) => (
                <View key={step} style={s.stepItem}>
                  <View style={[s.stepDot, { backgroundColor: idx < 2 ? '#fbbf24' : '#1e293b' }]} />
                  <Text style={s.stepLabel}>{step}</Text>
                </View>
              ))}
            </View>
            <View style={s.actionRow}>
              <TouchableOpacity style={s.partsBtn} onPress={handleAction}><Text style={s.partsBtnText}>Add Parts</Text></TouchableOpacity>
              <TouchableOpacity style={s.updateBtn} onPress={handleAction}><Text style={s.updateBtnText}>Update Status</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  newBtn: { backgroundColor: '#eab308', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  newBtnText: { color: '#020617', fontWeight: '900', fontSize: 12 },
  jobCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  jobId: { fontWeight: '900', color: '#ffffff', fontSize: 16 },
  jobMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  statusBadge: { backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fbbf24', fontWeight: '700', fontSize: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, backgroundColor: '#020617', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(30,41,59,0.6)' },
  stepItem: { alignItems: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 6 },
  stepLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 12 },
  partsBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#020617', alignItems: 'center' },
  partsBtnText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  updateBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#eab308', alignItems: 'center' },
  updateBtnText: { color: '#020617', fontWeight: '900', fontSize: 12 },
});

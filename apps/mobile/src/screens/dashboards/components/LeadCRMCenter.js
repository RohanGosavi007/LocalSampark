import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Phone, MessageSquare, ArrowRight, UserCheck } from 'lucide-react-native';
let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}

export default function LeadCRMCenter({ themeColor = '#6366f1' }) {
  const handleAction = () => { if (Haptics) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e) {} } };

  return (
    <View style={s.root}>
      <Text style={s.title}>Lead Pipeline</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {['New Leads', 'Contacted', 'Site Visit', 'Closed'].map((stage, i) => (
          <View key={stage} style={s.stageColumn}>
            <View style={s.stageHeader}>
              <Text style={s.stageTitle}>{stage}</Text>
              <View style={s.stageCount}><Text style={s.stageCountText}>{3 - i}</Text></View>
            </View>
            {[1, 2].map((lead) => (
              <View key={lead} style={s.leadCard}>
                <Text style={s.leadName}>Amit Patel</Text>
                <Text style={s.leadDesc}>Looking for: 2 BHK Flat</Text>
                <Text style={s.leadBudget}>Budget: ₹45L - ₹55L</Text>
                <View style={s.actionRow}>
                  <TouchableOpacity style={s.iconBtn} onPress={handleAction}><Phone size={16} color="#3b82f6" /></TouchableOpacity>
                  <TouchableOpacity style={s.iconBtn} onPress={handleAction}><MessageSquare size={16} color="#10b981" /></TouchableOpacity>
                  <TouchableOpacity style={s.moveBtn} onPress={handleAction}><Text style={s.moveBtnText}>Move</Text><ArrowRight size={14} color="#fff" /></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  stageColumn: { width: 256, marginRight: 16, borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8, backgroundColor: '#0f172a' },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 12, backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  stageTitle: { fontWeight: '700', fontSize: 14, color: '#818cf8' },
  stageCount: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  stageCountText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  leadCard: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: '#020617' },
  leadName: { fontWeight: '700', fontSize: 14, color: '#ffffff', marginBottom: 4 },
  leadDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  leadBudget: { fontSize: 12, color: '#34d399', fontWeight: '700', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  moveBtn: { flex: 1, backgroundColor: '#4f46e5', borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 4 },
  moveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
});

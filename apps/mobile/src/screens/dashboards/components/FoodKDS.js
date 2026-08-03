import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Utensils, Clock, Check } from 'lucide-react-native';
let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}

export default function FoodKDS({ themeColor = '#f97316' }) {
  const handleAction = () => { if (Haptics) { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch(e) {} } };

  return (
    <View style={s.root}>
      <Text style={s.title}>Live Kitchen Display</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {['Incoming', 'Preparing', 'Ready'].map((stage, i) => (
          <View key={stage} style={s.stageColumn}>
            <View style={s.stageHeader}>
              <Text style={s.stageTitle}>{stage}</Text>
              <View style={s.stageBadge}><Text style={s.stageBadgeText}>{3 - i}</Text></View>
            </View>
            {[1, 2].map(order => (
              <View key={order} style={s.orderCard}>
                <View style={s.orderHeader}>
                  <Text style={s.orderId}>#10{order + i}</Text>
                  <View style={s.timeRow}><Clock size={12} color="#94a3b8" style={{ marginRight: 4 }} /><Text style={s.timeText}>4m ago</Text></View>
                </View>
                <View style={{ marginBottom: 12 }}><Text style={s.orderItem}>1x Margherita Pizza</Text><Text style={s.orderItem}>2x Garlic Bread</Text></View>
                <TouchableOpacity style={s.actionBtn} onPress={handleAction}><Text style={s.actionBtnText}>{stage === 'Incoming' ? 'Accept' : 'Next Stage'}</Text></TouchableOpacity>
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
  stageColumn: { width: 288, marginRight: 16, borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8, backgroundColor: '#0f172a' },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 12, backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  stageTitle: { fontWeight: '700', fontSize: 14, color: '#fb923c' },
  stageBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  stageBadgeText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  orderCard: { borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: '#020617' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontWeight: '900', color: '#ffffff', fontSize: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  orderItem: { fontSize: 12, color: '#cbd5e1', fontWeight: '500', marginBottom: 4 },
  actionBtn: { backgroundColor: '#f97316', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});

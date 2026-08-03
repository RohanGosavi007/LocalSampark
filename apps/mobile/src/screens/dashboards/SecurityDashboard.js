import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { ShieldCheck, AlertTriangle, ShieldAlert, Scan, QrCode, LogIn, ChevronRight, CheckCircle2 } from 'lucide-react-native';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) { console.warn('[SecurityDashboard] expo-haptics not available'); }

const { width } = Dimensions.get('window');

export default function SecurityDashboard({ user }) {
  const [sosAlerts, setSosAlerts] = useState([
    { id: 'SOS-01', type: 'Medical', location: 'A-Wing, Flat 301', time: '2 mins ago', status: 'ACTIVE' },
  ]);

  const [expectedVisitors, setExpectedVisitors] = useState([
    { id: 1, name: 'Amazon Delivery', host: 'Rahul, Flat 402', eta: '10:30 AM' },
    { id: 2, name: 'Suresh (Plumber)', host: 'Anita, Flat 101', eta: '11:00 AM' }
  ]);

  const handleResolveSOS = (id) => {
    if (Haptics) { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch(e) {} }
    setSosAlerts(sosAlerts.filter(s => s.id !== id));
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <View style={s.headerLeft}><ShieldCheck color="#10b981" size={24} style={{ marginRight: 8 }} /><Text style={s.headerTitle}>Gate Security</Text></View>
          <Text style={s.headerSubtitle}>On Duty: {user?.name || 'Guard'}</Text>
        </View>
      </View>

      {/* SOS ALERTS */}
      <View style={{ marginBottom: 32 }}>
        <Text style={s.sectionTitle}>Active SOS Alerts</Text>
        {sosAlerts.length > 0 ? (
          sosAlerts.map(alert => (
            <View key={alert.id} style={s.sosCard}>
              <View style={s.sosHeader}>
                <View style={s.sosHeaderLeft}>
                  <View style={s.sosIconBg}><ShieldAlert size={20} color="#ef4444" /></View>
                  <Text style={s.sosTitle}>{alert.type} Emergency</Text>
                </View>
                <View style={s.liveBadge}><Text style={s.liveText}>LIVE</Text></View>
              </View>
              <View style={s.sosDetail}>
                <Text style={s.sosLocation}>{alert.location}</Text>
                <Text style={s.sosTime}>Triggered: {alert.time}</Text>
              </View>
              <TouchableOpacity style={s.resolveBtn} onPress={() => handleResolveSOS(alert.id)}>
                <CheckCircle2 color="#fff" size={20} style={{ marginRight: 8 }} />
                <Text style={s.resolveBtnText}>Mark as Resolved</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={s.safeCard}>
            <View style={s.safeIcon}><ShieldCheck color="#10b981" size={24} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.safeTitle}>Society is Secure</Text>
              <Text style={s.safeSubtitle}>No active emergencies detected.</Text>
            </View>
          </View>
        )}
      </View>

      {/* QUICK ACTIONS */}
      <View style={s.quickActions}>
        <TouchableOpacity style={s.scanBtn}>
          <QrCode color="#fff" size={28} style={{ marginBottom: 8 }} />
          <Text style={s.scanBtnText}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.manualBtn}>
          <LogIn color="#3b82f6" size={28} style={{ marginBottom: 8 }} />
          <Text style={s.manualBtnText}>Manual Entry</Text>
        </TouchableOpacity>
      </View>

      {/* GATE MANAGEMENT */}
      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>Pre-Approved Visitors</Text>
        {expectedVisitors.map(v => (
          <View key={v.id} style={s.visitorCard}>
            <View style={s.visitorLeft}>
              <View style={s.visitorAvatar}>
                <Text style={s.visitorInitial}>{v.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.visitorName} numberOfLines={1}>{v.name}</Text>
                <Text style={s.visitorHost}>Visiting: {v.host}</Text>
              </View>
            </View>
            <View style={s.visitorRight}>
              <Text style={s.visitorEta}>ETA: {v.eta}</Text>
              <TouchableOpacity style={s.allowBtn}>
                <Text style={s.allowBtnText}>Allow In</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerRow: { marginBottom: 24, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  sectionTitle: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  sosCard: { backgroundColor: 'rgba(127,29,29,0.4)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)', padding: 20, borderRadius: 24, marginBottom: 16 },
  sosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sosHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sosIconBg: { width: 40, height: 40, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sosTitle: { color: '#f87171', fontWeight: '900', fontSize: 18 },
  liveBadge: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  liveText: { color: '#ffffff', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  sosDetail: { backgroundColor: 'rgba(127,29,29,0.6)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(127,29,29,0.5)', marginBottom: 16 },
  sosLocation: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 4 },
  sosTime: { color: '#fca5a5', fontSize: 12 },
  resolveBtn: { backgroundColor: '#dc2626', padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  resolveBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  safeCard: { backgroundColor: 'rgba(6,78,59,0.3)', borderWidth: 1, borderColor: 'rgba(6,78,59,0.5)', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  safeIcon: { width: 48, height: 48, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  safeTitle: { color: '#34d399', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  safeSubtitle: { color: 'rgba(167,243,208,0.5)', fontSize: 12 },
  quickActions: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  scanBtn: { flex: 1, backgroundColor: '#2563eb', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3b82f6' },
  scanBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  manualBtn: { flex: 1, backgroundColor: '#0f172a', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1e293b' },
  manualBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  visitorCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visitorLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  visitorAvatar: { width: 48, height: 48, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  visitorInitial: { color: '#60a5fa', fontWeight: '900', fontSize: 18 },
  visitorName: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  visitorHost: { color: '#94a3b8', fontSize: 12 },
  visitorRight: { alignItems: 'flex-end', marginLeft: 8 },
  visitorEta: { color: '#60a5fa', fontWeight: '700', fontSize: 12, marginBottom: 8 },
  allowBtn: { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.5)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  allowBtnText: { color: '#34d399', fontWeight: '700', fontSize: 12 },
});

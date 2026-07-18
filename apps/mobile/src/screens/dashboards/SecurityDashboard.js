import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function SecurityDashboard({ user }) {
  const [sosAlerts, setSosAlerts] = useState([
    { id: 'SOS-01', type: 'Medical', location: 'A-Wing, Flat 301', time: '2 mins ago', status: 'ACTIVE' },
  ]);

  const [expectedVisitors, setExpectedVisitors] = useState([
    { id: 1, name: 'Amazon Delivery', host: 'Rahul, Flat 402', eta: '10:30 AM' },
    { id: 2, name: 'Suresh (Plumber)', host: 'Anita, Flat 101', eta: '11:00 AM' }
  ]);

  const handleResolveSOS = (id) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSosAlerts(sosAlerts.filter(s => s.id !== id));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>🛡️ Security Gate Console</Text>
        <Text style={styles.subtitle}>On Duty: {user?.name || 'Guard'}</Text>
      </View>

      {/* SOS ALERTS MODULE (CRITICAL) */}
      <Text style={styles.sectionTitle}>🚨 Active SOS Alerts</Text>
      {sosAlerts.length > 0 ? (
        sosAlerts.map(alert => (
          <View key={alert.id} style={styles.sosCard}>
            <View style={styles.sosHeader}>
              <Text style={styles.sosType}>⚠️ {alert.type} Emergency</Text>
              <View style={styles.sosBadge}><Text style={styles.sosBadgeText}>LIVE</Text></View>
            </View>
            <Text style={styles.sosLocation}>📍 {alert.location}</Text>
            <Text style={styles.sosTime}>Triggered: {alert.time}</Text>
            <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolveSOS(alert.id)}>
              <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <View style={styles.safeBox}>
          <Text style={styles.safeBoxText}>✅ No Active Emergencies in Society.</Text>
        </View>
      )}

      {/* GATE MANAGEMENT */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>📝 Pre-Approved Visitors</Text>
      {expectedVisitors.map(v => (
        <View key={v.id} style={styles.visitorCard}>
          <View style={{flex: 1}}>
            <Text style={styles.visitorName}>{v.name}</Text>
            <Text style={styles.visitorHost}>Visiting: {v.host}</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text style={styles.visitorEta}>ETA: {v.eta}</Text>
            <TouchableOpacity style={styles.allowBtn}>
              <Text style={styles.allowBtnText}>Allow Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.scanBtn}>
        <Text style={styles.scanBtnText}>📷 Scan Visitor QR Code</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { marginBottom: 24, marginTop: 10 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  
  sosCard: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444', marginBottom: 16 },
  sosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sosType: { color: '#ef4444', fontSize: 18, fontWeight: 'bold' },
  sosBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sosBadgeText: { color: '#0f172a', fontSize: 10, fontWeight: 'bold' },
  sosLocation: { color: '#0f172a', fontSize: 16, marginBottom: 5 },
  sosTime: { color: '#fca5a5', fontSize: 12, marginBottom: 15 },
  resolveBtn: { backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
  resolveBtnText: { color: '#0f172a', fontWeight: 'bold' },

  safeBox: { backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#10b981', marginBottom: 16 },
  safeBoxText: { color: '#10b981', fontWeight: 'bold' },

  visitorCard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  visitorName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  visitorHost: { color: '#64748b', fontSize: 13 },
  visitorEta: { color: '#475569', fontSize: 12, marginBottom: 8 },
  allowBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  allowBtnText: { color: '#0f172a', fontSize: 12, fontWeight: 'bold' },

  scanBtn: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6', borderStyle: 'dashed', alignItems: 'center', marginTop: 15 },
  scanBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 }
});

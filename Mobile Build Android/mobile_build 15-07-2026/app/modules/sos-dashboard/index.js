import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
const { width } = Dimensions.get('window');

export default function SOSDashboardScreen() {
  const { authToken, API_URL, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalAlerts: 156, activeAlerts: 3, resolvedToday: 8, avgResponseTime: '2.5 min' });
  const [activeAlerts] = useState([
    { id: 'SOS001', type: 'Medical', user: 'Rahul K.', location: 'Block A, Dhanori', time: '2 min ago', severity: 'critical' },
    { id: 'SOS002', type: 'Fire', user: 'Priya S.', location: 'Sector 5, Tingre Nagar', time: '8 min ago', severity: 'high' },
    { id: 'SOS003', type: 'Accident', user: 'Amit G.', location: 'Main Road, Vishrantwadi', time: '15 min ago', severity: 'medium' },
  ]);
  const [recentAlerts] = useState([
    { id: 'SOS004', type: 'Medical', user: 'Neha D.', time: '1 hr ago', status: 'resolved', responders: 3 },
    { id: 'SOS005', type: 'Safety', user: 'Raj P.', time: '2 hrs ago', status: 'resolved', responders: 5 },
    { id: 'SOS006', type: 'Fire', user: 'Sita M.', time: '3 hrs ago', status: 'resolved', responders: 8 },
    { id: 'SOS007', type: 'Accident', user: 'Karan S.', time: 'Yesterday', status: 'resolved', responders: 4 },
  ]);
  const [emergencyContacts] = useState([
    { name: 'Police', number: '100', icon: '🚔' },
    { name: 'Ambulance', number: '108', icon: '🚑' },
    { name: 'Fire', number: '101', icon: '🚒' },
    { name: 'Women Helpline', number: '1091', icon: '👩' },
  ]);

  const severityColors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };
  const typeIcons = { Medical: '🏥', Fire: '🔥', Accident: '🚗', Safety: '🛡️' };

  const triggerSOS = () => {
    Alert.alert('🚨 SOS Triggered!', 'Emergency alert has been sent to nearby responders and your emergency contacts.', [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={styles.title}>SOS Dashboard</Text><Text style={styles.subtitle}>Emergency management center</Text></View>
        </View>

        {/* SOS Trigger Button */}
        <TouchableOpacity style={styles.sosButton} onPress={triggerSOS} activeOpacity={0.7}>
          <Text style={styles.sosIcon}>🚨</Text>
          <Text style={styles.sosText}>TRIGGER SOS</Text>
          <Text style={styles.sosSubtext}>Press to send emergency alert</Text>
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.kpiGrid}>
          {[
            { label: 'Total Alerts', value: stats.totalAlerts, icon: '📊', color: '#3b82f6' },
            { label: 'Active Now', value: stats.activeAlerts, icon: '🔴', color: '#ef4444' },
            { label: 'Resolved Today', value: stats.resolvedToday, icon: '✅', color: '#10b981' },
            { label: 'Avg Response', value: stats.avgResponseTime, icon: '⏱️', color: '#f59e0b' },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { borderLeftColor: k.color, borderLeftWidth: 4 }]}>
              <Text style={{ fontSize: 18 }}>{k.icon}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Active Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔴 Active Alerts</Text>
          {activeAlerts.map((alert, i) => (
            <View key={i} style={[styles.alertCard, { borderLeftColor: severityColors[alert.severity], borderLeftWidth: 4 }]}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertType}>{typeIcons[alert.type]} {alert.type}</Text>
                <View style={[styles.severityBadge, { backgroundColor: severityColors[alert.severity] + '20' }]}>
                  <Text style={[styles.severityText, { color: severityColors[alert.severity] }]}>{alert.severity.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.alertUser}>👤 {alert.user} • 📍 {alert.location}</Text>
              <Text style={styles.alertTime}>⏰ {alert.time}</Text>
            </View>
          ))}
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <View style={styles.contactsRow}>
            {emergencyContacts.map((c, i) => (
              <TouchableOpacity key={i} style={styles.contactCard}>
                <Text style={{ fontSize: 28 }}>{c.icon}</Text>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactNumber}>{c.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Resolved */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Resolved</Text>
          {recentAlerts.map((alert, i) => (
            <View key={i} style={styles.resolvedCard}>
              <Text style={{ fontSize: 20 }}>{typeIcons[alert.type]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.resolvedType}>{alert.type} - {alert.user}</Text>
                <Text style={styles.resolvedMeta}>{alert.time} • {alert.responders} responders</Text>
              </View>
              <View style={styles.resolvedBadge}><Text style={styles.resolvedText}>Resolved</Text></View>
            </View>
          ))}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' }, subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  sosButton: { margin: 16, backgroundColor: '#ef4444', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 6 },
  sosIcon: { fontSize: 40 }, sosText: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 8 },
  sosSubtext: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  kpiCard: { width: (width - 52) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  kpiValue: { fontSize: 18, fontWeight: '800' }, kpiLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  alertCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertType: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '800' },
  alertUser: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  alertTime: { fontSize: 12, color: '#94a3b8' },
  contactsRow: { flexDirection: 'row', gap: 10 },
  contactCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2, gap: 4 },
  contactName: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  contactNumber: { fontSize: 14, fontWeight: '800', color: '#3b82f6' },
  resolvedCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1, alignItems: 'center', gap: 12 },
  resolvedType: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  resolvedMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  resolvedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  resolvedText: { fontSize: 10, fontWeight: '700', color: '#10b981' },
});

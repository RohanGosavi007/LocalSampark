import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, RefreshControl, Alert, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { apiGet, apiPost } from '../../../src/lib/api';
const { width } = Dimensions.get('window');

export default function SOSDashboardScreen() {
  const { authToken, API_URL, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  /**
   * This is the board somebody watches to dispatch help, and every emergency on
   * it was made up: three "active" alerts — a Medical for "Rahul K." at Block A
   * Dhanori two minutes ago marked critical, a Fire, an Accident — plus four
   * resolved ones and a headline "156 total alerts, 2.5 min average response".
   *
   * A responder working from this screen would have been sending people to
   * addresses where nothing had happened, and a real alert arriving would have
   * been indistinguishable from the three permanent fakes above it.
   *
   * GET /sos/alerts returns the real active alerts (admin-scoped). Anything the
   * server does not report is not shown.
   */
  const [stats, setStats] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(false);

  // The national emergency numbers are facts about India, not records about
  // this app's users, so they stay hardcoded — and they now dial.
  const emergencyContacts = [
    { name: 'Police', number: '100', icon: '🚔' },
    { name: 'Ambulance', number: '108', icon: '🚑' },
    { name: 'Fire', number: '101', icon: '🚒' },
    { name: 'Women Helpline', number: '1091', icon: '👩' },
  ];

  const load = async () => {
    setError(null);
    try {
      const res = await apiGet('/sos/alerts');
      const rows = res?.data ?? [];
      const alerts = rows.map((a) => ({
        id: String(a.id),
        type: a.type || 'Alert',
        user: a.full_name || 'Unknown',
        phone: a.phone_number || null,
        // Coordinates only; there is no reverse geocoding here, so a place name
        // is not something this screen can honestly print.
        location: a.latitude && a.longitude
          ? `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}`
          : a.pincode || null,
        time: a.created_at ? new Date(a.created_at).toLocaleString() : '',
        severity: 'critical',
      }));
      setActiveAlerts(alerts);
      setStats({ activeAlerts: alerts.length });
    } catch (err) {
      setActiveAlerts([]);
      setStats(null);
      setError(err?.message || 'Could not load emergency alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const severityColors = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };
  const typeIcons = { Medical: '🏥', Fire: '🔥', Accident: '🚗', Safety: '🛡️' };

  /**
   * This announced "Emergency alert has been sent to nearby responders and your
   * emergency contacts" and called nothing at all.
   */
  const triggerSOS = () => {
    Alert.alert('🚨 Raise an emergency alert?', 'This will notify your emergency contacts and local responders.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'RAISE ALERT',
        style: 'destructive',
        onPress: async () => {
          if (triggering) return;
          setTriggering(true);
          try {
            const res = await apiPost('/sos/trigger', { type: 'safety' });
            const notified = res?.data?.emergencyContacts?.length ?? 0;
            Alert.alert(
              'Alert raised',
              notified > 0
                ? `Recorded and sent to ${notified} emergency contact${notified === 1 ? '' : 's'}.`
                : 'Recorded. You have no emergency contacts saved yet.'
            );
            await load();
          } catch (err) {
            Alert.alert(
              'Alert NOT sent',
              `${err?.message || 'Network error'}.\n\nCall 112 if you need help now.`,
              [
                { text: 'Close', style: 'cancel' },
                { text: 'Call 112', onPress: () => Linking.openURL('tel:112') },
              ]
            );
          } finally {
            setTriggering(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* onRefresh just cleared the spinner; nothing was reloaded. */}
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
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
          {/* Total alerts, resolved-today and average response time were three
              invented figures; /sos/alerts reports the active ones only, so that
              is the only tile left. */}
          {[
            { label: 'Active Now', value: Number(stats?.activeAlerts) || 0, icon: '🔴', color: '#ef4444' },
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
          {loading ? (
            <View style={styles.stateBox}><ActivityIndicator color="#ef4444" /></View>
          ) : activeAlerts.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {error ? 'Could not load alerts' : 'No active emergencies'}
              </Text>
              <Text style={styles.stateBody}>
                {error || 'Alerts raised in your area will appear here immediately.'}
              </Text>
            </View>
          ) : activeAlerts.map((alert, i) => (
            <View key={i} style={[styles.alertCard, { borderLeftColor: severityColors[alert.severity], borderLeftWidth: 4 }]}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertType}>{typeIcons[alert.type]} {alert.type}</Text>
                <View style={[styles.severityBadge, { backgroundColor: severityColors[alert.severity] + '20' }]}>
                  <Text style={[styles.severityText, { color: severityColors[alert.severity] }]}>{alert.severity.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.alertUser}>
                👤 {alert.user}{alert.location ? ` • 📍 ${alert.location}` : ''}
              </Text>
              <Text style={styles.alertTime}>⏰ {alert.time}</Text>
              {alert.phone ? (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${alert.phone}`)}
                >
                  <Text style={styles.callBtnText}>📞 Call {alert.user}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <View style={styles.contactsRow}>
            {emergencyContacts.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={styles.contactCard}
                onPress={() => Linking.openURL(`tel:${c.number}`)}
              >
                <Text style={{ fontSize: 28 }}>{c.icon}</Text>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactNumber}>{c.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* A "Recently Resolved" list showed four closed emergencies with named
            users and responder counts. /sos/alerts returns active alerts only —
            there is no resolved-history endpoint — so the section is gone rather
            than filled with a record of help that was never given. */}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  callBtn: { marginTop: 12, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  callBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
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

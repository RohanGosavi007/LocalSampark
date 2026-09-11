import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { ShieldCheck, ShieldAlert, QrCode, LogIn, CheckCircle2 } from 'lucide-react-native';
import { apiGet, apiPost } from '../../lib/api';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) { console.warn('[SecurityDashboard] expo-haptics not available'); }

const { width } = Dimensions.get('window');

/**
 * The gate guard's landing screen.
 *
 * It opened on a live medical emergency — "SOS-01, Medical, A-Wing Flat 301,
 * 2 mins ago, ACTIVE" — that had not happened, and two pre-approved visitors
 * ("Amazon Delivery visiting Rahul, Flat 402" and "Suresh (Plumber) visiting
 * Anita, Flat 101") who were not coming. "Mark as Resolved" removed the alert
 * from React state and told nobody.
 *
 * A guard on shift would have been reacting to a permanent fake emergency, and a
 * real one arriving would have looked exactly like it. Worse: once they learned
 * the alert was always there, they would stop reacting.
 *
 * Alerts come from /sos/alerts and are resolved through /sos/:id/resolve.
 * Expected visitors come from the society's own pre-approval list.
 */
export default function SecurityDashboard({ user }) {
  const [sosAlerts, setSosAlerts] = useState([]);
  const [expectedVisitors, setExpectedVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);

    const [alertsRes, visitorsRes] = await Promise.allSettled([
      apiGet('/sos/alerts'),
      apiGet('/society-management/visitors/today'),
    ]);

    if (alertsRes.status === 'fulfilled') {
      setSosAlerts(
        (alertsRes.value?.data ?? []).map((a) => ({
          id: String(a.id),
          type: a.type || 'Emergency',
          // No street address is invented from coordinates; the guard gets what
          // the alert actually carries.
          location: a.pincode || (a.latitude && a.longitude
            ? `${Number(a.latitude).toFixed(4)}, ${Number(a.longitude).toFixed(4)}`
            : 'Location not reported'),
          time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : '',
          reporter: a.full_name || null,
        }))
      );
    } else {
      setSosAlerts([]);
      setError(alertsRes.reason?.message || 'Could not load emergency alerts.');
    }

    if (visitorsRes.status === 'fulfilled') {
      const rows = visitorsRes.value?.visitors ?? visitorsRes.value?.data ?? [];
      setExpectedVisitors(
        (Array.isArray(rows) ? rows : []).map((v) => ({
          id: String(v.id),
          name: v.visitor_name || v.name || 'Visitor',
          host: v.flat_number ? `Flat ${v.flat_number}` : (v.host || ''),
          eta: v.expected_at
            ? new Date(v.expected_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
            : '',
        }))
      );
    } else {
      setExpectedVisitors([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolveSOS = (alert) => {
    Alert.alert(
      'Resolve this alert?',
      'Only mark it resolved once you have confirmed the situation is handled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            setResolvingId(alert.id);
            try {
              // POST, not PUT — /sos/:id/resolve is a POST route. Note it is
              // restricted to admin roles, so a guard account will get a 403
              // here; widening that is a decision about who may close an
              // emergency, not something to assume.
              await apiPost(`/sos/${alert.id}/resolve`, { resolution: 'resolved' });
              if (Haptics) {
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
              }
              await load({ isRefresh: true });
            } catch (err) {
              // The old version removed the card from the list regardless, so an
              // alert could vanish from the guard's screen while still open.
              Alert.alert('Not resolved', err?.message || 'The alert is still open. Try again.');
            } finally {
              setResolvingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#10b981" />
      }
    >
      <View style={s.headerRow}>
        <View>
          <View style={s.headerLeft}>
            <ShieldCheck color="#10b981" size={24} style={{ marginRight: 8 }} />
            <Text style={s.headerTitle}>Gate Security</Text>
          </View>
          <Text style={s.headerSubtitle}>On Duty: {user?.name || 'Guard'}</Text>
        </View>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={s.sectionTitle}>Active SOS Alerts</Text>

        {loading ? (
          <View style={s.safeCard}><ActivityIndicator color="#10b981" /></View>
        ) : error ? (
          <View style={s.errorCard}>
            <Text style={s.errorTitle}>Could not load alerts</Text>
            <Text style={s.errorBody}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => load({ isRefresh: true })}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sosAlerts.length > 0 ? (
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
                {alert.reporter ? <Text style={s.sosTime}>Raised by {alert.reporter}</Text> : null}
                <Text style={s.sosTime}>Triggered: {alert.time}</Text>
              </View>
              <TouchableOpacity
                style={[s.resolveBtn, resolvingId === alert.id && { opacity: 0.6 }]}
                disabled={resolvingId === alert.id}
                onPress={() => handleResolveSOS(alert)}
              >
                {resolvingId === alert.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle2 color="#fff" size={20} style={{ marginRight: 8 }} />
                    <Text style={s.resolveBtnText}>Mark as Resolved</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={s.safeCard}>
            <View style={s.safeIcon}><ShieldCheck color="#10b981" size={24} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.safeTitle}>Society is Secure</Text>
              <Text style={s.safeSubtitle}>No active emergencies.</Text>
            </View>
          </View>
        )}
      </View>

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

      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>Pre-Approved Visitors</Text>
        {expectedVisitors.length === 0 ? (
          <View style={s.safeCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.safeTitle}>Nobody expected</Text>
              <Text style={s.safeSubtitle}>Visitors residents pre-approve will appear here.</Text>
            </View>
          </View>
        ) : expectedVisitors.map(v => (
          <View key={v.id} style={s.visitorCard}>
            <View style={s.visitorLeft}>
              <View style={s.visitorAvatar}>
                <Text style={s.visitorInitial}>{(v.name || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.visitorName} numberOfLines={1}>{v.name}</Text>
                {v.host ? <Text style={s.visitorHost}>Visiting: {v.host}</Text> : null}
              </View>
            </View>
            <View style={s.visitorRight}>
              {v.eta ? <Text style={s.visitorEta}>ETA: {v.eta}</Text> : null}
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
  resolveBtn: { backgroundColor: '#dc2626', minHeight: 44, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  resolveBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  safeCard: { backgroundColor: 'rgba(6,78,59,0.3)', borderWidth: 1, borderColor: 'rgba(6,78,59,0.5)', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  safeIcon: { width: 48, height: 48, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  safeTitle: { color: '#34d399', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  safeSubtitle: { color: 'rgba(167,243,208,0.5)', fontSize: 12 },
  errorCard: { backgroundColor: 'rgba(127,29,29,0.3)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', padding: 20, borderRadius: 16 },
  errorTitle: { color: '#f87171', fontWeight: '800', fontSize: 15, marginBottom: 6 },
  errorBody: { color: '#fca5a5', fontSize: 13, lineHeight: 19 },
  retryBtn: { marginTop: 16, backgroundColor: '#dc2626', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
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
  allowBtn: { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.5)', paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: 8 },
  allowBtnText: { color: '#34d399', fontWeight: '700', fontSize: 12 },
});

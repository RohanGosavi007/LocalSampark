import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { apiGet } from '../../../src/lib/api';

/**
 * The gate guard's terminal, reached from the profile screen.
 *
 * It opened on two permanent alerts under the heading "Active Threats &
 * Alerts": an "AI CCTV — Perimeter Breach Detected — Just Now" and an
 * "SOS — Medical Emergency Flat B-404 — 2 mins ago". Neither had happened;
 * neither could, since there is no CCTV integration in this codebase at all.
 * They were also permanent, which is the dangerous part: a guard who learns the
 * board always shows a breach and a medical emergency stops reacting to it, and
 * a real alert then looks identical to the two that are always there.
 *
 * At the bottom, "Gate Status (Live)" reported that vehicle MH-12-AB-1234 had
 * just been approved through the gate on an RFID scan. There is no RFID reader
 * and that registration belongs to nobody.
 *
 * The six Quick Action buttons had no handlers — a guard pressing "Log New
 * Visitor" got nothing.
 *
 * This now shows the society's real gate log: today's visitors, parcels still
 * held at the gate, and staff currently checked in. The actions that have a
 * screen behind them navigate to it; the ones that never existed
 * ("Digital Intercom Call", "Verify Move-Out Pass", "Verify Child Exit") are
 * gone rather than left as dead buttons.
 */
export default function GuardDashboard() {
  const [visitors, setVisitors] = useState([]);
  const [packages, setPackages] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const [v, p, s] = await Promise.allSettled([
      apiGet('/society-management/visitors/today'),
      apiGet('/society-management/packages/pending'),
      apiGet('/society-management/staff/attendance/today'),
    ]);

    // A guard whose account is not linked to a society gets 400 from all three;
    // that is worth saying rather than showing three empty lists.
    if (v.status === 'fulfilled') {
      setVisitors(v.value?.data ?? []);
      setError(null);
    } else {
      setVisitors([]);
      setError(v.reason?.message || 'Could not load the gate log.');
    }
    setPackages(p.status === 'fulfilled' ? (p.value?.data ?? []) : []);
    setStaff(s.status === 'fulfilled' ? (s.value?.data ?? []) : []);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const time = (v) => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');

  const onDuty = staff.filter((a) => !a.check_out_time);

  const actions = [
    { label: 'Log New Visitor', to: '/modules/society?tab=visitors' },
    { label: 'Collect Courier/Parcel', to: '/modules/society?tab=packages' },
    { label: 'Check Staff Attendance', to: '/modules/society?tab=staff' },
    { label: 'Raise Emergency', to: '/modules/society?tab=emergency' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Terminal</Text>
      </View>

      {loading ? (
        <View style={styles.centre}><ActivityIndicator size="large" color="#1e293b" /></View>
      ) : (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} />}
      >
        {error && (
          <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>
        )}

        {/* Gate summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{visitors.length}</Text>
            <Text style={styles.summaryLabel}>Visitors today</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{packages.length}</Text>
            <Text style={styles.summaryLabel}>Parcels held</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{onDuty.length}</Text>
            <Text style={styles.summaryLabel}>Staff on duty</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {actions.map((act) => (
            <TouchableOpacity key={act.label} style={styles.actionBtn} onPress={() => router.push(act.to)}>
              <Text style={styles.actionText}>{act.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gate log */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Gate Log (Today)</Text>
        {visitors.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nobody has been logged through the gate today.
            </Text>
          </View>
        ) : visitors.slice(0, 20).map((v) => (
          <View key={String(v.id)} style={styles.logCard}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.logTitle}>{v.visitor_name || 'Visitor'}</Text>
              <Text style={styles.logMeta}>
                {[v.purpose, v.flat_number ? `Flat ${v.flat_number}` : null, v.vehicle_number]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.logStatus, v.checked_out_at ? styles.logOut : styles.logIn]}>
                {v.checked_out_at ? 'Checked out' : 'Inside'}
              </Text>
              <Text style={styles.logTime}>{time(v.checked_out_at || v.checked_in_at)}</Text>
            </View>
          </View>
        ))}

        {/* Parcels still at the gate */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Parcels Awaiting Collection</Text>
        {packages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No parcels are being held at the gate.</Text>
          </View>
        ) : packages.slice(0, 20).map((p) => (
          <View key={String(p.id)} style={styles.logCard}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.logTitle}>{p.flat_number ? `Flat ${p.flat_number}` : 'Unassigned'}</Text>
              <Text style={styles.logMeta}>
                {[p.courier_name, p.package_description].filter(Boolean).join(' • ') || 'Parcel'}
              </Text>
            </View>
            <Text style={styles.logTime}>{time(p.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },

  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 13 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2, textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionBtn: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', height: 80 },
  actionText: { fontSize: 13, fontWeight: '700', color: '#0f172a', textAlign: 'center' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  logTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 3 },
  logMeta: { fontSize: 12, color: '#64748b' },
  logStatus: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 3 },
  logIn: { color: '#15803d' },
  logOut: { color: '#64748b' },
  logTime: { fontSize: 12, color: '#64748b', fontWeight: '600' },
});

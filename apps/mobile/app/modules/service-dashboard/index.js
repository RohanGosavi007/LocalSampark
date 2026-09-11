import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
const { width } = Dimensions.get('window');

export default function ServiceDashboardScreen() {
  const { authToken, API_URL } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  /**
   * Every figure was seeded — 5 bookings today, ₹12,500 earned, a 4.6 rating
   * from 89 reviews — alongside three invented jobs for named customers and a
   * seven-day earnings curve. A provider opening this on their first day saw a
   * fortnight of business they had not done.
   *
   * It did call /services/dashboard, but merged json.data while that endpoint
   * returns stats and trend, so a successful response replaced nothing and the
   * seeded numbers stayed on screen looking like live data.
   *
   * The upcoming-bookings list has its own screen — the Bookings tab, backed by
   * /shops/my-shop/appointments — so it links there instead of duplicating a
   * list it has no endpoint for.
   */
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/services/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not load your dashboard.');

      setStats(json.stats || null);
      setWeeklyData((json.trend || []).map((t) => ({ day: t.day, value: Number(t.value) || 0 })));
    } catch (err) {
      setStats(null);
      setWeeklyData([]);
      setError(err?.message || 'Could not load your dashboard.');
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  const maxVal = Math.max(1, ...weeklyData.map(d => d.value));
  const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
          <View><Text style={styles.title}>Service Dashboard</Text><Text style={styles.subtitle}>Manage bookings & services</Text></View>
        </View>

        {error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Could not load your dashboard</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.kpiGrid}>
          {[
            { label: 'Today Bookings', value: Number(stats?.todayBookings) || 0, icon: '📅', color: '#3b82f6' },
            { label: 'Upcoming', value: Number(stats?.upcomingBookings) || 0, icon: '⏰', color: '#f59e0b' },
            { label: 'Completed', value: Number(stats?.completedToday) || 0, icon: '✅', color: '#10b981' },
            { label: 'Earnings', value: money(stats?.totalEarnings), icon: '💰', color: '#8b5cf6' },
            // The endpoint reports 0 until provider ratings are aggregated, so
            // show a dash rather than a 0.0-star score the provider has not
            // earned. "4.6 from 89 reviews" was previously printed for everyone.
            { label: 'Rating', value: Number(stats?.avgRating) ? `⭐ ${stats.avgRating}` : '—', icon: '⭐', color: '#f59e0b' },
            { label: 'Services', value: Number(stats?.activeServices) || 0, icon: '🔧', color: '#06b6d4' },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { borderLeftColor: k.color, borderLeftWidth: 4 }]}>
              <Text style={{ fontSize: 20 }}>{k.icon}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* This section listed three invented jobs for named customers. The
            real list lives on the Bookings tab, which reads
            /shops/my-shop/appointments; there is no endpoint that returns it in
            dashboard form, so this links there rather than duplicating it. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/(tabs)/bookings')}>
            <Text style={styles.linkCardText}>
              {Number(stats?.upcomingBookings) || 0} upcoming — open the Bookings tab
            </Text>
            <Text style={styles.linkCardChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Chart */}
        <View style={styles.chartCard}>
          {/* The endpoint's trend is a booking count per day, not a rupee
              amount — the axis said "Weekly Earnings" over values that were
              never money. */}
          <Text style={styles.sectionTitle}>Bookings This Week</Text>
          {weeklyData.length === 0 ? (
            <Text style={styles.emptyBody}>No completed bookings recorded yet.</Text>
          ) : (
            <View style={styles.chartContainer}>
              {weeklyData.map((d, i) => (
                <View key={d.day || i} style={styles.barWrapper}>
                  <Text style={styles.barValue}>{d.value}</Text>
                  <View style={[styles.bar, { height: (d.value / maxVal) * 100, backgroundColor: '#8b5cf6' }]} />
                  <Text style={styles.barLabel}>{d.day}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.actionsRow}>
            {[{ icon: '📅', label: 'Bookings', r: '/(tabs)/bookings' }, { icon: '⭐', label: 'Reviews', r: '/(tabs)/reviews' }, { icon: '💰', label: 'Earnings', r: '/(tabs)/earnings' }, { icon: '👤', label: 'Profile', r: '/(tabs)/profile' }].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionBtn} onPress={() => router.push(a.r)}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text><Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyBox: { backgroundColor: '#ffffff', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', margin: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 16, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  linkCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', minHeight: 44 },
  linkCardText: { color: '#0f172a', fontSize: 14, fontWeight: '600', flex: 1 },
  linkCardChevron: { color: '#94a3b8', fontSize: 22, fontWeight: '700' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  kpiCard: { width: (width - 52) / 3, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', elevation: 2 },
  kpiValue: { fontSize: 16, fontWeight: '800', marginVertical: 3 },
  kpiLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  bookingCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, elevation: 2, alignItems: 'center', gap: 12 },
  bookingTime: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 60 },
  bookingTimeText: { fontSize: 13, fontWeight: '800', color: '#3b82f6' },
  bookingDate: { fontSize: 10, color: '#64748b', marginTop: 2 },
  bookingService: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  bookingCustomer: { fontSize: 12, color: '#64748b', marginTop: 3 },
  bookingAmount: { fontSize: 16, fontWeight: '800', color: '#10b981' },
  chartCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, paddingTop: 10 },
  barWrapper: { alignItems: 'center', flex: 1 }, bar: { width: 22, borderRadius: 6, minHeight: 6 },
  barValue: { fontSize: 8, color: '#64748b', marginBottom: 3, fontWeight: '600' },
  barLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2, gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#0f172a' },
});

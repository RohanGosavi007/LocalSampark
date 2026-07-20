import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
const { width } = Dimensions.get('window');

export default function ServiceDashboardScreen() {
  const { authToken, API_URL } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayBookings: 5, upcomingBookings: 3, completedToday: 2, totalEarnings: 12500,
    weeklyEarnings: 8500, avgRating: 4.6, totalReviews: 89, activeServices: 8,
  });
  const [upcomingBookings] = useState([
    { id: 'BK001', customer: 'Anita Deshmukh', service: 'Deep Cleaning', time: '2:00 PM', date: 'Today', amount: 1500 },
    { id: 'BK002', customer: 'Raj Patil', service: 'AC Repair', time: '4:30 PM', date: 'Today', amount: 800 },
    { id: 'BK003', customer: 'Meena Shah', service: 'Plumbing Fix', time: '10:00 AM', date: 'Tomorrow', amount: 600 },
  ]);
  const [weeklyData] = useState([
    { day: 'Mon', value: 1200 }, { day: 'Tue', value: 1800 }, { day: 'Wed', value: 900 },
    { day: 'Thu', value: 2200 }, { day: 'Fri', value: 1500 }, { day: 'Sat', value: 2800 }, { day: 'Sun', value: 600 },
  ]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/services/dashboard`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const json = await res.json();
      if (json.success) setStats(prev => ({ ...prev, ...json.data }));
    } catch (err) { console.warn('Using mock service data'); }
  };
  useEffect(() => { fetchData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  const maxVal = Math.max(...weeklyData.map(d => d.value));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
          <View><Text style={styles.title}>Service Dashboard</Text><Text style={styles.subtitle}>Manage bookings & services</Text></View>
        </View>

        <View style={styles.kpiGrid}>
          {[
            { label: 'Today Bookings', value: stats.todayBookings, icon: '📅', color: '#3b82f6' },
            { label: 'Upcoming', value: stats.upcomingBookings, icon: '⏰', color: '#f59e0b' },
            { label: 'Completed', value: stats.completedToday, icon: '✅', color: '#10b981' },
            { label: 'Earnings', value: `₹${stats.totalEarnings.toLocaleString()}`, icon: '💰', color: '#8b5cf6' },
            { label: 'Rating', value: `⭐ ${stats.avgRating}`, icon: '⭐', color: '#f59e0b' },
            { label: 'Services', value: stats.activeServices, icon: '🔧', color: '#06b6d4' },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { borderLeftColor: k.color, borderLeftWidth: 4 }]}>
              <Text style={{ fontSize: 20 }}>{k.icon}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          {upcomingBookings.map((bk, i) => (
            <View key={i} style={styles.bookingCard}>
              <View style={styles.bookingTime}><Text style={styles.bookingTimeText}>{bk.time}</Text><Text style={styles.bookingDate}>{bk.date}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingService}>{bk.service}</Text>
                <Text style={styles.bookingCustomer}>👤 {bk.customer}</Text>
              </View>
              <Text style={styles.bookingAmount}>₹{bk.amount}</Text>
            </View>
          ))}
        </View>

        {/* Earnings Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Weekly Earnings</Text>
          <View style={styles.chartContainer}>
            {weeklyData.map((d, i) => (
              <View key={i} style={styles.barWrapper}>
                <Text style={styles.barValue}>₹{d.value}</Text>
                <View style={[styles.bar, { height: (d.value / maxVal) * 100, backgroundColor: '#8b5cf6' }]} />
                <Text style={styles.barLabel}>{d.day}</Text>
              </View>
            ))}
          </View>
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

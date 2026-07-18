import { apiGet, apiPost, apiPut, apiDelete } from '../../../../../../../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
const { width } = Dimensions.get('window');

export default function FieldDashboardScreen() {
  const { authToken, API_URL } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    shopsOnboarded: 23, pendingLeads: 8, monthlyTarget: 30, earnings: 15600,
    conversionRate: 76, totalLeads: 45, approvedShops: 18, rejectedShops: 4,
  });
  const [recentLeads] = useState([
    { id: 'L001', shopName: 'Fresh Mart Grocery', owner: 'Sunil Verma', phone: '+919876543210', status: 'approved', date: 'Today' },
    { id: 'L002', shopName: 'Quick Fix Electronics', owner: 'Deepak Joshi', phone: '+919876543211', status: 'pending', date: 'Yesterday' },
    { id: 'L003', shopName: 'Style Salon & Spa', owner: 'Rekha Patil', phone: '+919876543212', status: 'pending', date: '2 days ago' },
    { id: 'L004', shopName: 'Bharat Hardware', owner: 'Mohan Gupta', phone: '+919876543213', status: 'rejected', date: '3 days ago' },
  ]);
  const [weeklyData] = useState([
    { day: 'Mon', value: 3 }, { day: 'Tue', value: 5 }, { day: 'Wed', value: 2 },
    { day: 'Thu', value: 4 }, { day: 'Fri', value: 6 }, { day: 'Sat', value: 3 }, { day: 'Sun', value: 0 },
  ]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/territory/field-dashboard`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const json = await res.json();
      if (json.success) setStats(prev => ({ ...prev, ...json.data }));
    } catch (err) { console.warn('Using mock field agent data'); }
  };
  useEffect(() => { fetchData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  const maxVal = Math.max(...weeklyData.map(d => d.value), 1);
  const statusColors = { approved: '#10b981', pending: '#f59e0b', rejected: '#ef4444' };
  const progress = (stats.shopsOnboarded / stats.monthlyTarget) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
          <View><Text style={styles.title}>Field Agent Dashboard</Text><Text style={styles.subtitle}>Onboarding & lead tracking</Text></View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Monthly Target Progress</Text>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} /></View>
          <Text style={styles.progressText}>{stats.shopsOnboarded} / {stats.monthlyTarget} shops onboarded ({Math.round(progress)}%)</Text>
        </View>

        <View style={styles.kpiGrid}>
          {[
            { label: 'Onboarded', value: stats.shopsOnboarded, icon: '🏪', color: '#10b981' },
            { label: 'Pending Leads', value: stats.pendingLeads, icon: '⏳', color: '#f59e0b' },
            { label: 'Earnings', value: `₹${stats.earnings.toLocaleString()}`, icon: '💰', color: '#3b82f6' },
            { label: 'Conversion', value: `${stats.conversionRate}%`, icon: '📊', color: '#8b5cf6' },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { borderTopColor: k.color, borderTopWidth: 3 }]}>
              <Text style={{ fontSize: 22 }}>{k.icon}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Onboarding Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Weekly Onboarding</Text>
          <View style={styles.chartContainer}>
            {weeklyData.map((d, i) => (
              <View key={i} style={styles.barWrapper}>
                <Text style={styles.barValue}>{d.value}</Text>
                <View style={[styles.bar, { height: (d.value / maxVal) * 80, backgroundColor: '#10b981' }]} />
                <Text style={styles.barLabel}>{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Leads */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Leads</Text>
          {recentLeads.map((lead, i) => (
            <View key={i} style={styles.leadCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.leadShop}>{lead.shopName}</Text>
                <Text style={styles.leadOwner}>👤 {lead.owner} • {lead.date}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: (statusColors[lead.status] || '#64748b') + '20' }]}>
                <Text style={[styles.statusText, { color: statusColors[lead.status] }]}>{lead.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.actionsRow}>
            {[{ icon: '🏪', label: 'Onboard', r: '/(tabs)/onboard' }, { icon: '📊', label: 'Leads', r: '/(tabs)/leads' }, { icon: '💰', label: 'Earnings', r: '/(tabs)/earnings' }].map((a, i) => (
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
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' }, subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  progressCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  progressBar: { height: 12, backgroundColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 6 },
  progressText: { fontSize: 13, color: '#64748b', marginTop: 8, fontWeight: '600' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  kpiCard: { width: (width - 52) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 2 },
  kpiValue: { fontSize: 20, fontWeight: '800', marginVertical: 4 }, kpiLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  chartCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingTop: 10 },
  barWrapper: { alignItems: 'center', flex: 1 }, bar: { width: 24, borderRadius: 6, minHeight: 4 },
  barValue: { fontSize: 10, color: '#64748b', marginBottom: 3, fontWeight: '700' },
  barLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '500' },
  leadCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, alignItems: 'center' },
  leadShop: { fontSize: 14, fontWeight: '700', color: '#0f172a' }, leadOwner: { fontSize: 12, color: '#64748b', marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2, gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#0f172a' },
});

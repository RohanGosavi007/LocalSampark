import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
const { width } = Dimensions.get('window');

export default function FranchiseDashboardScreen() {
  const { authToken, API_URL } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  /**
   * Every number on this dashboard was seeded: 45 shops, 12 agents, ₹1,85,000
   * monthly revenue, ₹27,500 commission, a six-month revenue curve, four named
   * "top performing shops" — including "Apollo Pharmacy", a real national chain
   * — and three named field agents with earnings attached to them.
   *
   * It did call /territory/dashboard, but merged json.data while that endpoint
   * returns stats and trend. The merge therefore never replaced anything and
   * the seeded figures survived every successful fetch, which is why they looked
   * stable and plausible.
   *
   * Top shops and field agents have no endpoint at all, so those sections say so
   * rather than listing invented ones.
   */
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/territory/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not load your territory.');

      setStats(json.stats || null);
      setRevenueData(
        (json.trend || []).map((t) => ({ month: t.month, value: Number(t.value) || 0 }))
      );
    } catch (err) {
      // No fallback figures. An operator seeing nothing knows to retry; an
      // operator seeing ₹1,85,000 does not.
      setStats(null);
      setRevenueData([]);
      setError(err?.message || 'Could not load your territory.');
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  const maxVal = Math.max(1, ...revenueData.map(d => d.value));
  const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
          <View><Text style={styles.title}>Franchise Dashboard</Text><Text style={styles.subtitle}>Territory management & analytics</Text></View>
        </View>

        {error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Could not load your territory</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.kpiGrid}>
          {[
            { label: 'Total Shops', value: Number(stats?.totalShops) || 0, icon: '🏪', color: '#3b82f6' },
            { label: 'Active Agents', value: Number(stats?.activeAgents) || 0, icon: '👥', color: '#10b981' },
            { label: 'Revenue', value: money(stats?.monthlyRevenue), icon: '💰', color: '#8b5cf6' },
            { label: 'Commission', value: money(stats?.commissionEarned), icon: '🏦', color: '#f59e0b' },
            { label: 'Pending', value: Number(stats?.pendingApprovals) || 0, icon: '⏳', color: '#ef4444' },
            { label: 'Total Orders', value: Number(stats?.totalOrders) || 0, icon: '📦', color: '#06b6d4' },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { borderTopColor: k.color, borderTopWidth: 3 }]}>
              <Text style={{ fontSize: 20 }}>{k.icon}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          {revenueData.length === 0 ? (
            <Text style={styles.emptyBody}>No revenue recorded for this territory yet.</Text>
          ) : (
            <View style={styles.chartContainer}>
              {revenueData.map((d, i) => (
                <View key={d.month || i} style={styles.barWrapper}>
                  <Text style={styles.barValue}>₹{(d.value / 1000).toFixed(0)}k</Text>
                  <View style={[styles.bar, { height: (d.value / maxVal) * 100, backgroundColor: '#8b5cf6' }]} />
                  <Text style={styles.barLabel}>{d.month}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* "Top Performing Shops" and "Field Agents" listed four businesses and
            three named people with revenue and earnings against them. Neither
            has an endpoint — nothing in the backend ranks shops by revenue for a
            territory, and field-agent earnings are settled through the
            commissions module, which has no per-agent read. Rather than keep
            the invented lists, the sections state what is missing. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Shops</Text>
          <Text style={styles.emptyBody}>
            Shop rankings are not available yet. Use the Shops tab for the full
            list in your territory.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Field Agents</Text>
          <Text style={styles.emptyBody}>
            Agent performance is not available yet.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.actionsRow}>
            {[{ icon: '🏪', label: 'Shops', r: '/(tabs)/shops' }, { icon: '👥', label: 'Agents', r: '/(tabs)/agents' }, { icon: '💰', label: 'Revenue', r: '/(tabs)/revenue' }].map((a, i) => (
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' }, subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  kpiCard: { width: (width - 52) / 3, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', elevation: 2 },
  kpiValue: { fontSize: 16, fontWeight: '800', marginVertical: 3 }, kpiLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  chartCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130, paddingTop: 10 },
  barWrapper: { alignItems: 'center', flex: 1 }, bar: { width: 28, borderRadius: 6, minHeight: 6 },
  barValue: { fontSize: 9, color: '#64748b', marginBottom: 3, fontWeight: '600' },
  barLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: '500' },
  shopCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, alignItems: 'center', gap: 12 },
  shopRank: { fontSize: 18, fontWeight: '900', color: '#8b5cf6', width: 30 },
  shopName: { fontSize: 14, fontWeight: '700', color: '#0f172a' }, shopMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  shopRevenue: { fontSize: 16, fontWeight: '800', color: '#10b981' },
  agentCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, alignItems: 'center', gap: 12 },
  agentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  agentName: { fontSize: 14, fontWeight: '700', color: '#0f172a' }, agentRole: { fontSize: 12, color: '#64748b', marginTop: 2 },
  agentEarnings: { fontSize: 15, fontWeight: '800', color: '#3b82f6' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', elevation: 2, gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#0f172a' },
});

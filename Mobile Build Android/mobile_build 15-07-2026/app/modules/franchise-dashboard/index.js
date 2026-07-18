import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
const { width } = Dimensions.get('window');

export default function FranchiseDashboardScreen() {
  const { authToken, API_URL } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalShops: 45, activeAgents: 12, monthlyRevenue: 185000, commissionEarned: 27500,
    pendingApprovals: 5, totalOrders: 1250, avgOrderValue: 320, territories: 3,
  });
  const [revenueData] = useState([
    { month: 'Jan', value: 120000 }, { month: 'Feb', value: 145000 }, { month: 'Mar', value: 135000 },
    { month: 'Apr', value: 160000 }, { month: 'May', value: 175000 }, { month: 'Jun', value: 185000 },
  ]);
  const [topShops] = useState([
    { name: 'Sharma Grocery Hub', revenue: 45000, orders: 320, rating: 4.8 },
    { name: 'Royal Grill Cafe', revenue: 38000, orders: 280, rating: 4.6 },
    { name: 'Apollo Pharmacy', revenue: 32000, orders: 250, rating: 4.7 },
    { name: 'Velvet Salon & Spa', revenue: 28000, orders: 190, rating: 4.5 },
  ]);
  const [agents] = useState([
    { name: 'Amit Kumar', role: 'Field Agent', onboarded: 15, earnings: 8500, status: 'active' },
    { name: 'Priya Singh', role: 'Field Agent', onboarded: 12, earnings: 7200, status: 'active' },
    { name: 'Raj Patil', role: 'Area Agent', onboarded: 28, earnings: 15000, status: 'active' },
  ]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/territory/dashboard`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const json = await res.json();
      if (json.success) setStats(prev => ({ ...prev, ...json.data }));
    } catch (err) { console.warn('Using mock franchise data'); }
  };
  useEffect(() => { fetchData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };
  const maxVal = Math.max(...revenueData.map(d => d.value));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
          <View><Text style={styles.title}>Franchise Dashboard</Text><Text style={styles.subtitle}>Territory management & analytics</Text></View>
        </View>

        <View style={styles.kpiGrid}>
          {[
            { label: 'Total Shops', value: stats.totalShops, icon: '🏪', color: '#3b82f6' },
            { label: 'Active Agents', value: stats.activeAgents, icon: '👥', color: '#10b981' },
            { label: 'Monthly Revenue', value: `₹${(stats.monthlyRevenue / 1000).toFixed(0)}k`, icon: '💰', color: '#8b5cf6' },
            { label: 'Commission', value: `₹${(stats.commissionEarned / 1000).toFixed(0)}k`, icon: '🏦', color: '#f59e0b' },
            { label: 'Pending', value: stats.pendingApprovals, icon: '⏳', color: '#ef4444' },
            { label: 'Total Orders', value: stats.totalOrders, icon: '📦', color: '#06b6d4' },
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
          <View style={styles.chartContainer}>
            {revenueData.map((d, i) => (
              <View key={i} style={styles.barWrapper}>
                <Text style={styles.barValue}>₹{(d.value / 1000).toFixed(0)}k</Text>
                <View style={[styles.bar, { height: (d.value / maxVal) * 100, backgroundColor: '#8b5cf6' }]} />
                <Text style={styles.barLabel}>{d.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Shops */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Shops</Text>
          {topShops.map((shop, i) => (
            <View key={i} style={styles.shopCard}>
              <Text style={styles.shopRank}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{shop.name}</Text>
                <Text style={styles.shopMeta}>📦 {shop.orders} orders • ⭐ {shop.rating}</Text>
              </View>
              <Text style={styles.shopRevenue}>₹{(shop.revenue / 1000).toFixed(0)}k</Text>
            </View>
          ))}
        </View>

        {/* Agents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Field Agents</Text>
          {agents.map((agent, i) => (
            <View key={i} style={styles.agentCard}>
              <View style={styles.agentAvatar}><Text style={{ fontSize: 18 }}>👤</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agentName}>{agent.name}</Text>
                <Text style={styles.agentRole}>{agent.role} • {agent.onboarded} shops</Text>
              </View>
              <Text style={styles.agentEarnings}>₹{agent.earnings.toLocaleString()}</Text>
            </View>
          ))}
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

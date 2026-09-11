import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { apiGet } from '../../src/lib/api';

/**
 * Platform revenue portal.
 *
 * Every figure here was a literal typed into the JSX: "Net Revenue (MTD)
 * ₹1,24,500", "↑ 15% vs Last Month", "Commissions ₹45,200", "Subscriptions
 * ₹79,300", a seven-bar chart drawn from [40,60,45,80,50,90,75], and three
 * settlements including "₹4,500 from Sharma Grocery". An operator could read
 * this screen, believe the platform had turned over a lakh and a quarter this
 * month, and act on it. It called no API at all.
 *
 * /admin/dashboard, /admin/revenue/chart and /admin/payouts/pending back it now.
 * Where the backend has no figure — the month-on-month change, and the
 * commission/subscription split — the tile is left out rather than filled in.
 */
export default function RevenuePortal() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'payouts', label: 'Payouts' },
  ];

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [statsRes, chartRes, payoutsRes] = await Promise.allSettled([
        apiGet('/admin/dashboard'),
        apiGet('/admin/revenue/chart'),
        apiGet('/admin/payouts/pending'),
      ]);

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value?.data ?? statsRes.value?.stats ?? statsRes.value;
        setStats(d || null);
      }
      setChart(chartRes.status === 'fulfilled' ? (chartRes.value?.data ?? []) : []);
      setPayouts(payoutsRes.status === 'fulfilled' ? (payoutsRes.value?.data ?? []) : []);

      if (statsRes.status === 'rejected') {
        setError(statsRes.reason?.message || 'Could not load revenue figures.');
      }
    } catch (err) {
      setError(err?.message || 'Could not load revenue figures.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

  // Bars are scaled against the largest real value; the old chart used fixed
  // percentages that described nothing.
  const chartMax = Math.max(1, ...chart.map((c) => (Number(c.platform) || 0) + (Number(c.franchise) || 0)));

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Platform Revenue</Text>
          <Text style={styles.kpiValue}>{money(stats?.totalRevenue ?? stats?.revenue)}</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, styles.kpiHalf]}>
          <Text style={styles.kpiLabel}>Orders</Text>
          <Text style={styles.kpiValueSmall}>{Number(stats?.totalOrders) || 0}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiHalf]}>
          <Text style={styles.kpiLabel}>Shops</Text>
          <Text style={styles.kpiValueSmall}>{Number(stats?.shopsCount ?? stats?.totalShops) || 0}</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <Text style={styles.filterText}>Last 7 days</Text>
        </View>

        {chart.length === 0 ? (
          <View style={styles.inlineEmpty}>
            <Text style={styles.stateBody}>No revenue recorded in the last 7 days.</Text>
          </View>
        ) : (
          <View style={styles.mockChart}>
            {chart.map((point, i) => {
              const total = (Number(point.platform) || 0) + (Number(point.franchise) || 0);
              return (
                <View key={point.name || i} style={styles.barColumn}>
                  <View style={[styles.bar, { height: `${Math.round((total / chartMax) * 100)}%` }]} />
                  <Text style={styles.barLabel}>{point.name}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );

  const renderPayouts = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Payouts</Text>
      </View>

      {payouts.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Nothing pending</Text>
          <Text style={styles.stateBody}>Payouts awaiting settlement will appear here.</Text>
        </View>
      ) : (
        <View style={styles.transactionList}>
          {payouts.map((p, i) => (
            <View key={p.id ?? i} style={styles.trxItem}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.trxShop}>{p.payee || 'Payee'}</Text>
                <Text style={styles.trxTime}>
                  {p.type || ''}
                  {p.date ? ` • ${new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.trxAmount}>{money(p.amount)}</Text>
                {p.status ? <Text style={styles.trxFee}>{p.status}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Revenue</Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#3b82f6" />
          }
        >
          {error ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>Could not load revenue</Text>
              <Text style={styles.stateBody}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === 'overview' ? renderOverview() : renderPayouts()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },

  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#3b82f6' },

  tabContent: { padding: 16 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  kpiHalf: { flex: 1 },
  kpiLabel: { color: '#64748b', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  kpiValue: { color: '#0f172a', fontSize: 30, fontWeight: '900' },
  kpiValueSmall: { color: '#0f172a', fontSize: 22, fontWeight: '900' },

  chartContainer: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  filterText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  mockChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140 },
  barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: 16, backgroundColor: '#3b82f6', borderRadius: 6, minHeight: 4 },
  barLabel: { color: '#64748b', fontSize: 11, marginTop: 6 },
  inlineEmpty: { paddingVertical: 24, alignItems: 'center' },

  transactionList: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  trxItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  trxShop: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  trxTime: { color: '#64748b', fontSize: 12, marginTop: 2 },
  trxAmount: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  trxFee: { color: '#64748b', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },

  stateBox: { backgroundColor: '#ffffff', borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', margin: 16 },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});

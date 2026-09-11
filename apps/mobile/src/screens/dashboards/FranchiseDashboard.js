import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet } from '../../lib/api';
import { Map, Users, Store, TrendingUp, IndianRupee, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

/**
 * A franchise partner's landing screen.
 *
 * "₹1.4L territory revenue, 156 managed shops, 12 active agents, ₹14,500
 * commission" were all literals, and the greeting fell back to "Welcome Partner,
 * Rahul" — a name belonging to nobody in particular.
 *
 * Below them, two shops awaiting the partner's approval ("Sanjay Provision
 * Store", "Dr. Mehta Clinic") that had not applied, and two payouts marked
 * Credited — ₹4,500 and ₹10,000 — that were never paid. A partner could have
 * reconciled their bank statement against those.
 */
export default function FranchiseDashboard({ user }) {
  const [figures, setFigures] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      apiGet('/dashboards/territory/dashboard'),
      apiGet('/territory/pending-approvals'),
    ]).then(([statsRes, approvalsRes]) => {
      if (statsRes.status === 'fulfilled') {
        setFigures(statsRes.value?.stats ?? null);
      } else {
        setFigures(null);
        setError(statsRes.reason?.message || 'Could not load your territory.');
      }

      if (approvalsRes.status === 'fulfilled') {
        setPendingApprovals(
          (approvalsRes.value?.data ?? [])
            .filter((a) => a.approval_status === 'pending')
            .map((a) => ({
              id: String(a.id),
              name: a.name || 'Shop',
              type: a.category || '',
              location: a.pincode || '',
            }))
        );
      } else {
        setPendingApprovals([]);
      }
      setLoading(false);
    });
  }, []);

  const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

  const stats = [
    { label: 'Territory Revenue', value: money(figures?.monthlyRevenue), icon: TrendingUp, color: '#10b981' },
    { label: 'Managed Shops', value: String(Number(figures?.totalShops) || 0), icon: Store, color: '#3b82f6' },
    { label: 'Active Agents', value: String(Number(figures?.activeAgents) || 0), icon: Users, color: '#8b5cf6' },
    { label: 'Your Commission', value: money(figures?.commissionEarned), icon: IndianRupee, color: '#f59e0b' },
  ];

  // Payout history has no per-partner read endpoint. The Payouts screen shows
  // what is pending; inventing a credited history here is what the previous
  // version did.
  const recentPayouts = [];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={{ marginBottom: 24, marginTop: 8 }}>
        <View style={s.headerLeft}><Map color="#f59e0b" size={24} style={{ marginRight: 8 }} /><Text style={s.headerTitle}>Territory Franchise</Text></View>
        {/* The fallback greeted an unnamed partner as "Rahul". */}
        <Text style={s.headerSubtitle}>Welcome Partner{user?.name ? `, ${user.name}` : ''}</Text>
      </View>

      {/* Primary KPI */}
      <View style={s.kpiCard}>
        <Text style={s.kpiLabel}>This Month's Earnings</Text>
        <Text style={s.kpiBigValue}>₹14,500</Text>
        <Text style={s.kpiChange}>+12% from last month</Text>
      </View>

      <View style={s.statsGrid}>
        {stats.map((st, i) => {
          const IconComp = st.icon;
          return (
            <View key={i} style={s.statCard}>
              <View style={[s.statIconBg, { backgroundColor: `${st.color}20` }]}><IconComp size={20} color={st.color} /></View>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Pending Approvals */}
      <View style={{ marginBottom: 24 }}>
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Pending Approvals</Text><TouchableOpacity><Text style={s.linkText}>View All</Text></TouchableOpacity></View>
        {loading ? (
          <View style={s.emptyRow}><ActivityIndicator color="#f59e0b" /></View>
        ) : pendingApprovals.length === 0 ? (
          <View style={s.emptyRow}>
            <Text style={s.emptyText}>
              {error || 'Shops applying in your territory will appear here.'}
            </Text>
          </View>
        ) : pendingApprovals.map(approval => (
          <View key={approval.id} style={s.approvalCard}>
            <View style={s.approvalLeft}>
              <View style={s.approvalIcon}><AlertCircle size={20} color="#f59e0b" /></View>
              <View><Text style={s.approvalName}>{approval.name}</Text><Text style={s.approvalMeta}>{approval.type} • {approval.location}</Text></View>
            </View>
            <TouchableOpacity style={s.reviewBtn}><Text style={s.reviewBtnText}>Review</Text></TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Recent Payouts */}
      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>Recent Payouts</Text>
        <View style={s.listContainer}>
          {recentPayouts.length === 0 ? (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>Your settled payouts will be listed here.</Text>
            </View>
          ) : recentPayouts.map((payout, idx) => (
            <View key={payout.id} style={[s.listItem, idx !== recentPayouts.length - 1 && s.listBorder]}>
              <View style={s.listLeft}>
                <View style={s.listIcon}><CheckCircle2 size={20} color="#10b981" /></View>
                <View><Text style={s.listTitle}>{payout.amount}</Text><Text style={s.listMeta}>{payout.date}</Text></View>
              </View>
              <View style={s.listRight}>
                <Text style={s.payoutStatus}>{payout.status}</Text>
                <ChevronRight size={16} color="#64748b" />
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  emptyRow: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  container: { flex: 1, backgroundColor: '#020617' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  kpiCard: { backgroundColor: '#78350f', padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  kpiLabel: { color: 'rgba(253,230,138,0.8)', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  kpiBigValue: { color: '#ffffff', fontSize: 40, fontWeight: '900', marginBottom: 4 },
  kpiChange: { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16 },
  statIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  linkText: { color: '#60a5fa', fontWeight: '700', fontSize: 12 },
  approvalCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  approvalLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  approvalIcon: { width: 40, height: 40, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  approvalName: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  approvalMeta: { color: '#94a3b8', fontSize: 12 },
  reviewBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  reviewBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  listContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8 },
  listItem: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  listLeft: { flexDirection: 'row', alignItems: 'center' },
  listIcon: { width: 40, height: 40, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  listMeta: { color: '#94a3b8', fontSize: 12 },
  listRight: { flexDirection: 'row', alignItems: 'center' },
  payoutStatus: { color: '#34d399', fontWeight: '700', fontSize: 12, marginRight: 8 },
});

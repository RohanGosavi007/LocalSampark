import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Map, Users, Store, TrendingUp, IndianRupee, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function FranchiseDashboard({ user }) {
  const stats = [
    { label: 'Territory Revenue', value: '₹1.4L', icon: TrendingUp, color: '#10b981' },
    { label: 'Managed Shops', value: '156', icon: Store, color: '#3b82f6' },
    { label: 'Active Agents', value: '12', icon: Users, color: '#8b5cf6' },
    { label: 'Your Commission', value: '₹14,500', icon: IndianRupee, color: '#f59e0b' }
  ];

  const pendingApprovals = [
    { id: 1, name: 'Sanjay Provision Store', type: 'Retail', location: 'Sector 4' },
    { id: 2, name: 'Dr. Mehta Clinic', type: 'Medical', location: 'Sector 1' },
  ];

  const recentPayouts = [
    { id: 1, date: '15 Jul', amount: '₹4,500', status: 'Credited' },
    { id: 2, date: '01 Jul', amount: '₹10,000', status: 'Credited' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={{ marginBottom: 24, marginTop: 8 }}>
        <View style={s.headerLeft}><Map color="#f59e0b" size={24} style={{ marginRight: 8 }} /><Text style={s.headerTitle}>Territory Franchise</Text></View>
        <Text style={s.headerSubtitle}>Welcome Partner, {user?.name || 'Rahul'}</Text>
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
        {pendingApprovals.map(approval => (
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
          {recentPayouts.map((payout, idx) => (
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

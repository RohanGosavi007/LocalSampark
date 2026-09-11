import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { apiGet } from '../../lib/api';
import { Briefcase, Target, Users, IndianRupee, Store, CheckCircle2, ChevronRight, FileText } from 'lucide-react-native';

const { width } = Dimensions.get('window');

/**
 * A field agent's landing screen.
 *
 * The four figures were literals — "42 shops onboarded, 14 active leads, 3
 * pending KYC, ₹2,100 bounty earned" — and the weekly target below them read
 * "12 / 15 Shops" with the progress bar hardcoded to 80% and "Just 3 more to
 * earn ₹500 bonus!". An agent on their first day saw a fortnight of work they
 * had not done and a bonus they were three shops from earning.
 *
 * "Recent Onboards" listed two shops they had not registered, one already
 * "KYC Verified".
 *
 * /dashboards/territory/field-dashboard reports what they have actually done.
 */
export default function FieldDashboard({ user }) {
  const [figures, setFigures] = useState(null);
  const [recentOnboards, setRecentOnboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/dashboards/territory/field-dashboard')
      .then((res) => {
        setFigures(res?.stats ?? null);
        setRecentOnboards(
          (res?.recent ?? []).map((r) => ({
            id: String(r.id),
            name: r.shopName || 'Shop',
            type: r.owner && r.owner !== '—' ? r.owner : '',
            status: r.status || 'pending',
          }))
        );
      })
      .catch((err) => {
        setFigures(null);
        setRecentOnboards([]);
        setError(err?.message || 'Could not load your dashboard.');
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Onboarded Shops', value: String(Number(figures?.shopsOnboarded) || 0), icon: Store, color: '#3b82f6' },
    { label: 'Pending Leads', value: String(Number(figures?.pendingLeads) || 0), icon: Users, color: '#8b5cf6' },
    { label: 'Conversion', value: figures?.conversionRate || '0%', icon: FileText, color: '#f59e0b' },
    // The endpoint reports 0 until field-agent payouts are settled through the
    // commissions module; "₹2,100 bounty earned" was invented.
    { label: 'Bounty Earned', value: `₹${Number(figures?.earnings) || 0}`, icon: IndianRupee, color: '#10b981' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={{ marginBottom: 24, marginTop: 8 }}>
        <View style={s.headerLeft}><Briefcase color="#14b8a6" size={24} style={{ marginRight: 8 }} /><Text style={s.headerTitle}>Field Agent CRM</Text></View>
        <Text style={s.headerSubtitle}>Welcome back, {user?.name || 'Agent'}</Text>
      </View>

      {/* The weekly target card claimed "12 / 15 Shops" with an 80% bar and a
          ₹500 bonus three shops away. No target is set anywhere in the backend —
          monthlyTarget comes back as 0 — so the card is gone rather than
          showing a goal the agent was never given. */}

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

      <TouchableOpacity style={s.onboardBtn}><Store color="#fff" size={20} style={{ marginRight: 8 }} /><Text style={s.onboardBtnText}>Onboard New Shop</Text></TouchableOpacity>

      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>Recent Onboards</Text>
        {loading ? (
          <View style={s.listContainer}>
            <View style={s.listItem}><ActivityIndicator color="#14b8a6" /></View>
          </View>
        ) : recentOnboards.length === 0 ? (
          <View style={s.listContainer}>
            <View style={s.listItem}>
              <Text style={s.listMeta}>
                {error || 'Shops you register will appear here.'}
              </Text>
            </View>
          </View>
        ) : (
        <View style={s.listContainer}>
          {recentOnboards.map((shop, idx) => (
            <View key={shop.id} style={[s.listItem, idx !== recentOnboards.length - 1 && s.listBorder]}>
              <View style={s.listLeft}>
                <View style={s.listIcon}><CheckCircle2 size={20} color={String(shop.status).toLowerCase() === 'approved' ? '#10b981' : '#f59e0b'} /></View>
                <View>
                  <Text style={s.listTitle}>{shop.name}</Text>
                  <Text style={s.listMeta}>{[shop.type, shop.status].filter(Boolean).join(' • ')}</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#64748b" />
            </View>
          ))}
        </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  targetCard: { backgroundColor: '#134e4a', padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)' },
  targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  targetLabel: { color: 'rgba(153,246,228,0.8)', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  targetValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  targetBigValue: { color: '#ffffff', fontSize: 40, fontWeight: '900' },
  targetSuffix: { color: '#99f6e4', fontWeight: '600', fontSize: 16, marginBottom: 4, marginLeft: 4 },
  progressBar: { height: 8, backgroundColor: '#042f2e', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2dd4bf', borderRadius: 4 },
  targetHint: { color: '#2dd4bf', fontSize: 12, fontWeight: '600', marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16 },
  statIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  onboardBtn: { backgroundColor: '#0d9488', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  onboardBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  sectionTitle: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  listContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8 },
  listItem: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  listLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  listIcon: { width: 40, height: 40, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  listMeta: { color: '#94a3b8', fontSize: 12 },
});

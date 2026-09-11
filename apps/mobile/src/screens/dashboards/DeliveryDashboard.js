import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { apiGet } from '../../lib/api';
import { Package, MapPin, IndianRupee, Clock, Star, Navigation, Zap, CalendarDays } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const StoreIcon = ({ color, size, style }) => (
  <View style={style}><Package color={color} size={size} /></View>
);

/**
 * A rider's landing screen.
 *
 * Everything on it was invented. "₹1,240 earned today, 28 deliveries, 4.9
 * rating" were literals, and the greeting fell back to "Welcome, Ramesh".
 *
 * The card at the top was the worst of it: a CURRENT TASK, #DEL-8831, pickup at
 * Sampark Supermarket, drop at "Silver Oaks Society, Flat 402", 12 minutes out,
 * ₹45 for the run - with a Navigate button beside it. A rider could have gone
 * looking for a flat that had ordered nothing.
 *
 * /delivery/analytics and /delivery/my-jobs report what they have actually been
 * assigned and paid.
 */
export default function DeliveryDashboard({ user }) {
  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      apiGet('/delivery/analytics'),
      apiGet('/delivery/my-jobs'),
    ]).then(([analytics, myJobs]) => {
      if (analytics.status === 'fulfilled') {
        setData(analytics.value?.data ?? null);
      } else {
        setData(null);
        setError(analytics.reason?.message || 'Could not load your figures.');
      }
      setJobs(myJobs.status === 'fulfilled' ? (myJobs.value?.data ?? []) : []);
      setLoading(false);
    });
  }, []);

  const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

  const stats = [
    { label: 'Today Earnings', value: money(data?.todayAnalytics?.total_earnings), icon: IndianRupee, color: '#10b981' },
    { label: 'Deliveries Today', value: String(Number(data?.todayAnalytics?.total_deliveries) || 0), icon: Package, color: '#3b82f6' },
    { label: 'Active Runs', value: String(jobs.length), icon: Zap, color: '#f59e0b' },
    // A rider who has not been rated yet is shown a dash, not 0.0 out of 5.
    { label: 'Rating', value: data?.rating != null ? String(data.rating) : '—', icon: Star, color: '#8b5cf6' },
  ];

  const activeJob = jobs[0] || null;

  // The wallet ledger is the only per-rider payment record there is, so the
  // section below lists real credits rather than invented drop-offs in
  // Viman Nagar and Kalyani Nagar.
  const history = (data?.transactions ?? [])
    .filter((t) => String(t.transaction_type || '').toLowerCase() === 'credit')
    .slice(0, 5)
    .map((t, i) => ({
      id: t.id ?? i,
      time: t.created_at
        ? new Date(t.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
        : '',
      location: t.purpose || 'Delivery credit',
      amount: money(t.amount),
    }));

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={s.headerRow}>
        <View>
          <View style={s.headerLeft}>
            <Package color="#3b82f6" size={24} style={{ marginRight: 8 }} />
            <Text style={s.headerTitle}>Delivery Agent</Text>
          </View>
          {/* The fallback greeted an unnamed rider as "Ramesh". */}
          <Text style={s.headerSubtitle}>Online{user?.name ? ` • Welcome, ${user.name}` : ''}</Text>
        </View>
        <TouchableOpacity style={s.statusBadge}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>GO OFFLINE</Text>
        </TouchableOpacity>
      </View>

      {/* Active Run Card. Rendered only when the rider genuinely has a job
          assigned; nothing computes an ETA, so that field is gone rather than
          showing a guessed "12 Mins". */}
      {activeJob && (
      <View style={s.activeCard}>
        <View style={s.activeCardHeader}>
          <View style={s.activeCardBadge}><Text style={s.activeCardBadgeText}>CURRENT TASK</Text></View>
          <Text style={s.activeCardId}>#{String(activeJob.id).slice(0, 8)}</Text>
        </View>
        <View style={{ marginBottom: 16 }}>
          <View style={s.rowCenter}><StoreIcon color="#fff" size={16} style={{ marginRight: 8, opacity: 0.8 }} /><Text style={s.activeRestaurant}>{activeJob.pickup || 'Pickup pending'}</Text></View>
          <View style={s.rowCenter}><MapPin color="#fff" size={16} style={{ marginRight: 8, opacity: 0.8 }} /><Text style={s.activeDropoff}>{activeJob.dropoff || 'Address not shared yet'}</Text></View>
        </View>
        <View style={s.activeFooter}>
          <View><Text style={s.activeLabel}>STATUS</Text><Text style={s.activeBigValue}>{String(activeJob.status || '').replace(/_/g, ' ')}</Text></View>
          <View><Text style={s.activeLabel}>YOUR EARNINGS</Text><Text style={s.activeBigValue}>{money(activeJob.earnings)}</Text></View>
          <TouchableOpacity style={s.navBtn} onPress={() => router.push('/(tabs)/active')}><Navigation size={16} color="#2563eb" style={{ marginRight: 6 }} /><Text style={s.navBtnText}>Open</Text></TouchableOpacity>
        </View>
      </View>
      )}

      {/* Stats */}
      <View style={s.statsGrid}>
        {stats.map((st, i) => {
          const IconComp = st.icon;
          return (
            <View key={i} style={s.statCard}>
              <View style={s.statIconRow}><View style={[s.statIconBg, { backgroundColor: `${st.color}20` }]}><IconComp size={20} color={st.color} /></View></View>
              <Text style={s.statValue}>{st.value}{st.label === 'Rating' && <Text style={s.statSuffix}> /5</Text>}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          );
        })}
      </View>

      {/* History */}
      <View style={{ marginBottom: 24 }}>
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Recent Earnings</Text><TouchableOpacity style={s.rowCenter} onPress={() => router.push('/(tabs)/earnings')}><CalendarDays size={14} color="#60a5fa" style={{ marginRight: 4 }} /><Text style={s.linkText}>History</Text></TouchableOpacity></View>
        <View style={s.listContainer}>
          {loading ? (
            <View style={s.listItem}><ActivityIndicator color="#3b82f6" /></View>
          ) : history.length === 0 ? (
            <View style={s.listItem}>
              <Text style={s.listMeta}>{error || 'Payments for completed runs will show up here.'}</Text>
            </View>
          ) : history.map((h, idx) => (
            <View key={h.id} style={[s.listItem, idx !== history.length - 1 && s.listBorder]}>
              <View style={s.rowCenter}>
                <View style={s.listIcon}><Package size={16} color="#94a3b8" /></View>
                <View><Text style={s.listTitle}>{h.location}</Text><Text style={s.listMeta}>{h.time}</Text></View>
              </View>
              <Text style={s.listAmount}>{h.amount}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerRow: { marginBottom: 24, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  statusBadge: { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 8 },
  statusText: { color: '#34d399', fontWeight: '700', fontSize: 12 },
  activeCard: { backgroundColor: '#2563eb', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#3b82f6' },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  activeCardBadge: { backgroundColor: 'rgba(59,130,246,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  activeCardBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  activeCardId: { color: '#bfdbfe', fontWeight: '700', fontSize: 14 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  activeRestaurant: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  activeDropoff: { color: '#bfdbfe', fontWeight: '500', fontSize: 14 },
  activeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(59,130,246,0.5)', paddingTop: 16 },
  activeLabel: { color: '#bfdbfe', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  activeBigValue: { color: '#ffffff', fontWeight: '900', fontSize: 20 },
  navBtn: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  navBtnText: { color: '#2563eb', fontWeight: '900', fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16 },
  statIconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statSuffix: { fontSize: 16, color: '#64748b' },
  statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  linkText: { color: '#60a5fa', fontWeight: '700', fontSize: 12 },
  listContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8 },
  listItem: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  listIcon: { width: 40, height: 40, backgroundColor: '#1e293b', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#334155' },
  listTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  listMeta: { color: '#94a3b8', fontSize: 12 },
  listAmount: { color: '#34d399', fontWeight: '900', fontSize: 16 },
});

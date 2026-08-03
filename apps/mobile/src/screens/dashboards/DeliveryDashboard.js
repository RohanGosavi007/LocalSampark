import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Package, MapPin, IndianRupee, Clock, Star, Navigation, Zap, CalendarDays } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const StoreIcon = ({ color, size, style }) => (
  <View style={style}><Package color={color} size={size} /></View>
);

export default function DeliveryDashboard({ user }) {
  const stats = [
    { label: 'Today Earnings', value: '₹1,240', icon: IndianRupee, color: '#10b981' },
    { label: 'Deliveries', value: '28', icon: Package, color: '#3b82f6' },
    { label: 'Active Run', value: '1', icon: Zap, color: '#f59e0b' },
    { label: 'Rating', value: '4.9', icon: Star, color: '#8b5cf6' }
  ];

  const activeTask = { id: '#DEL-8831', restaurant: 'Sampark Supermarket', dropoff: 'Silver Oaks Society, Flat 402', eta: '12 Mins', earnings: '₹45' };

  const history = [
    { id: 1, time: '2:30 PM', location: 'Viman Nagar', amount: '₹60' },
    { id: 2, time: '1:15 PM', location: 'Kalyani Nagar', amount: '₹40' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={s.headerRow}>
        <View>
          <View style={s.headerLeft}>
            <Package color="#3b82f6" size={24} style={{ marginRight: 8 }} />
            <Text style={s.headerTitle}>Delivery Agent</Text>
          </View>
          <Text style={s.headerSubtitle}>Online • Welcome, {user?.name || 'Ramesh'}</Text>
        </View>
        <TouchableOpacity style={s.statusBadge}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>GO OFFLINE</Text>
        </TouchableOpacity>
      </View>

      {/* Active Run Card */}
      <View style={s.activeCard}>
        <View style={s.activeCardHeader}>
          <View style={s.activeCardBadge}><Text style={s.activeCardBadgeText}>CURRENT TASK</Text></View>
          <Text style={s.activeCardId}>{activeTask.id}</Text>
        </View>
        <View style={{ marginBottom: 16 }}>
          <View style={s.rowCenter}><StoreIcon color="#fff" size={16} style={{ marginRight: 8, opacity: 0.8 }} /><Text style={s.activeRestaurant}>{activeTask.restaurant}</Text></View>
          <View style={s.rowCenter}><MapPin color="#fff" size={16} style={{ marginRight: 8, opacity: 0.8 }} /><Text style={s.activeDropoff}>{activeTask.dropoff}</Text></View>
        </View>
        <View style={s.activeFooter}>
          <View><Text style={s.activeLabel}>ETA</Text><Text style={s.activeBigValue}>{activeTask.eta}</Text></View>
          <View><Text style={s.activeLabel}>EST. EARNINGS</Text><Text style={s.activeBigValue}>{activeTask.earnings}</Text></View>
          <TouchableOpacity style={s.navBtn}><Navigation size={16} color="#2563eb" style={{ marginRight: 6 }} /><Text style={s.navBtnText}>Navigate</Text></TouchableOpacity>
        </View>
      </View>

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
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Today's Runs</Text><TouchableOpacity style={s.rowCenter}><CalendarDays size={14} color="#60a5fa" style={{ marginRight: 4 }} /><Text style={s.linkText}>History</Text></TouchableOpacity></View>
        <View style={s.listContainer}>
          {history.map((h, idx) => (
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

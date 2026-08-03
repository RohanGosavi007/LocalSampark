import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Wrench, Calendar, CheckCircle2, IndianRupee, Star, Clock, MapPin, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ServiceDashboard({ user }) {
  const stats = [
    { label: 'Pending Jobs', value: '4', icon: Calendar, color: '#f59e0b' },
    { label: 'Completed Today', value: '3', icon: CheckCircle2, color: '#10b981' },
    { label: 'Profile Rating', value: '4.8', icon: Star, color: '#3b82f6' },
    { label: 'Total Earnings', value: '₹3,450', icon: IndianRupee, color: '#8b5cf6' }
  ];

  const pendingAppointments = [
    { id: 'JOB-902', service: 'AC Gas Refill', time: '02:00 PM', location: 'Sector 4, Flat 102' },
    { id: 'JOB-905', service: 'Washing Machine Repair', time: '04:30 PM', location: 'Sector 1, Flat 505' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={s.headerRow}>
        <View>
          <View style={s.headerLeft}><Wrench color="#3b82f6" size={24} style={{ marginRight: 8 }} /><Text style={s.headerTitle}>Service Partner</Text></View>
          <Text style={s.headerSubtitle}>Online • Welcome, {user?.name || 'Suresh'}</Text>
        </View>
        <TouchableOpacity style={s.statusBadge}><View style={s.statusDot} /><Text style={s.statusText}>ACCEPTING JOBS</Text></TouchableOpacity>
      </View>

      <View style={s.statsGrid}>
        {stats.map((st, i) => {
          const IconComp = st.icon;
          return (
            <View key={i} style={s.statCard}>
              <View style={s.statIconRow}><View style={[s.statIconBg, { backgroundColor: `${st.color}20` }]}><IconComp size={20} color={st.color} /></View></View>
              <Text style={s.statValue}>{st.value}{st.label.includes('Rating') && <Text style={s.statSuffix}> /5</Text>}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>Pending Appointments</Text>
        {pendingAppointments.map((job) => (
          <View key={job.id} style={s.jobCard}>
            <View style={s.jobHeader}>
              <View style={s.jobIdBadge}><Text style={s.jobIdText}>{job.id}</Text></View>
              <View style={s.rowCenter}><Clock size={14} color="#f59e0b" style={{ marginRight: 4 }} /><Text style={s.jobTime}>{job.time}</Text></View>
            </View>
            <Text style={s.jobTitle}>{job.service}</Text>
            <View style={s.rowCenter}><MapPin color="#64748b" size={16} style={{ marginRight: 8 }} /><Text style={s.jobLocation}>{job.location}</Text></View>
            <View style={s.jobActions}>
              <TouchableOpacity style={s.rescheduleBtn}><Text style={s.rescheduleBtnText}>Reschedule</Text></TouchableOpacity>
              <TouchableOpacity style={s.startBtn}><Text style={s.startBtnText}>Start Job</Text></TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.catalogCard}>
        <View style={s.rowCenter}>
          <View style={s.catalogIcon}><Wrench size={20} color="#a855f7" /></View>
          <View><Text style={s.catalogTitle}>Service Catalog</Text><Text style={s.catalogSubtitle}>Manage prices and availability</Text></View>
        </View>
        <ChevronRight size={20} color="#64748b" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerRow: { marginBottom: 24, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  statusBadge: { backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6', marginRight: 8 },
  statusText: { color: '#60a5fa', fontWeight: '700', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16 },
  statIconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statSuffix: { fontSize: 16, color: '#64748b' },
  statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  jobCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, padding: 20, marginBottom: 16 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  jobIdBadge: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  jobIdText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  jobTime: { color: '#fbbf24', fontWeight: '700', fontSize: 14 },
  jobTitle: { color: '#ffffff', fontWeight: '900', fontSize: 20, marginBottom: 12 },
  jobLocation: { color: '#94a3b8', fontWeight: '500', fontSize: 14 },
  jobActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rescheduleBtn: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  rescheduleBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  startBtn: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  startBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  catalogCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  catalogIcon: { width: 40, height: 40, backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catalogTitle: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 2 },
  catalogSubtitle: { color: '#94a3b8', fontSize: 12 },
});

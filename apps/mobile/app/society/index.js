import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, RefreshControl , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Users, Building, AlertTriangle, ShieldCheck, FileText, Settings, Megaphone } from 'lucide-react-native';
import { apiGet } from '../../src/lib/api';

export default function NativeSocietyDashboardScreen() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiGet('/society/dashboard');
      if (data && data.success && data.dashboard) {
        setDashboard(data.dashboard);
      } else {
        // Mock data if API returns empty/unconfigured
        setDashboard({
          name: 'Silver Oaks Society',
          total_flats: 120,
          active_residents: 345,
          pending_complaints: 3,
          visitors_today: 12,
          notices: [
            { id: 1, title: 'Water Tank Cleaning', date: 'Today, 2:00 PM', urgency: 'HIGH' },
            { id: 2, title: 'Annual General Meeting', date: 'Sunday, 10:00 AM', urgency: 'NORMAL' }
          ]
        });
      }
    } catch (err) {
      console.warn('Failed to fetch society dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <View style={s.s0}>
      <View style={s.s26}>
        <Icon size={20} color="#fff" />
      </View>
      <Text style={s.s1}>{value}</Text>
      <Text style={s.s2}>{title}</Text>
    </View>
  );

  const QuickAction = ({ title, icon: Icon }) => (
    <TouchableOpacity style={s.s3}>
      <View style={s.s4}>
        <Icon size={24} color="#3b82f6" />
      </View>
      <Text style={s.s5}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.s6}>
      {/* Header */}
      <View style={s.s7}>
        <TouchableOpacity onPress={() => router.back()} style={s.s8}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s9}>Society Admin</Text>
        <TouchableOpacity style={s.s10}>
          <Settings color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {loading && !dashboard ? (
        <View style={s.s11}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView 
          style={s.s12}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} tintColor="#3b82f6" />}
        >
          {/* Welcome Banner */}
          <View style={s.s13}>
            <Text style={s.s14}>Managing</Text>
            <Text style={s.s15}>{dashboard?.name}</Text>
          </View>

          {/* Metrics Grid */}
          <View style={s.s16}>
            <StatCard title="Total Flats" value={dashboard?.total_flats} icon={Building} colorClass="bg-blue-600" />
            <StatCard title="Active Residents" value={dashboard?.active_residents} icon={Users} colorClass="bg-emerald-600" />
            <StatCard title="Visitors Today" value={dashboard?.visitors_today} icon={ShieldCheck} colorClass="bg-purple-600" />
            <StatCard title="Open Complaints" value={dashboard?.pending_complaints} icon={AlertTriangle} colorClass="bg-red-600" />
          </View>

          {/* Quick Actions (Horizontal) */}
          <View style={s.s17}>
            <Text style={s.s18}>Quick Actions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <QuickAction title="Broadcast Notice" icon={Megaphone} />
              <QuickAction title="Add Visitor" icon={ShieldCheck} />
              <QuickAction title="View Bills" icon={FileText} />
              <QuickAction title="Manage Flats" icon={Building} />
            </ScrollView>
          </View>

          {/* Notice Board */}
          <View>
            <View style={s.s19}>
              <Text style={s.s20}>Active Notices</Text>
              <TouchableOpacity>
                <Text style={s.s21}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {dashboard?.notices?.map((notice) => (
              <View key={notice.id} style={s.s22}>
                <View style={[s.s27, notice.urgency === 'HIGH' ? s.s28 : s.s29]} />
                <View style={s.s23}>
                  <Text style={s.s24}>{notice.title}</Text>
                  <Text style={s.s25}>{notice.date}</Text>
                </View>
                <ChevronLeft color="#64748b" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
            ))}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, width: '48%', marginBottom: 16 },
  s1: { fontSize: 30, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  s2: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  s3: { alignItems: 'center', marginRight: 24 },
  s4: { width: 56, height: 56, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  s5: { color: '#94a3b8', fontSize: 12, fontWeight: '700', width: 64, textAlign: 'center' },
  s6: { flex: 1, backgroundColor: '#020617' },
  s7: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a', backgroundColor: '#020617', zIndex: 10 },
  s8: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s9: { color: '#ffffff', fontSize: 20, fontWeight: '900', flex: 1 },
  s10: { padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s11: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  s12: { flex: 1 },
  s13: { marginBottom: 24 },
  s14: { color: '#94a3b8', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  s15: { fontSize: 30, fontWeight: '900', color: '#ffffff' },
  s16: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  s17: { marginBottom: 32, marginTop: 8 },
  s18: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s19: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  s20: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s21: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
  s22: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  s23: { flex: 1 },
  s24: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  s25: { color: '#94a3b8', fontSize: 12 },
  s26: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  s27: { width: 8, height: '100%', borderRadius: 9999, marginRight: 16 },
  s28: { backgroundColor: '#ef4444' },
  s29: { backgroundColor: '#3b82f6' },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, RefreshControl , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Users, TrendingUp, IndianRupee, Phone, Mail, Calendar, CheckCircle2 } from 'lucide-react-native';
import { apiGet } from '../../src/lib/api';

export default function NativeCRMScreen() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiGet('/crm/dashboard');
      if (data && data.success && data.dashboard) {
        setDashboard(data.dashboard);
      } else {
        // Mock data for B2B UI visualization
        setDashboard({
          total_leads: 142,
          converted: 89,
          pipeline_value: 450000,
          win_rate: '62%',
          recent_leads: [
            { id: 1, name: 'Rahul Enterprise', contact: 'Rahul Verma', status: 'HOT', amount: 25000, updated: '2h ago' },
            { id: 2, name: 'Tech Solutions Ltd', contact: 'Priya Singh', status: 'IN_PROGRESS', amount: 80000, updated: '1d ago' },
            { id: 3, name: 'Sunrise Retail', contact: 'Amit Shah', status: 'NEW', amount: 15000, updated: '2d ago' },
          ]
        });
      }
    } catch (err) {
      console.warn('Failed to fetch crm dashboard:', err);
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
      <View style={s.s44}>
        <Icon size={20} color="#fff" />
      </View>
      <Text style={s.s1} numberOfLines={1}>{value}</Text>
      <Text style={s.s2}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.s3}>
      {/* Header */}
      <View style={s.s4}>
        <TouchableOpacity onPress={() => router.back()} style={s.s5}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s6}>Sales CRM</Text>
        <TouchableOpacity style={s.s7}>
          <Text style={s.s8}>Add Lead</Text>
        </TouchableOpacity>
      </View>

      {loading && !dashboard ? (
        <View style={s.s9}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView 
          style={s.s10}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} tintColor="#3b82f6" />}
        >
          
          <View style={s.s11}>
            <View>
              <Text style={s.s12}>Overview</Text>
              <Text style={s.s13}>This Month</Text>
            </View>
            <View style={s.s14}>
              <Text style={s.s15}>+12% vs last month</Text>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={s.s16}>
            <StatCard title="Pipeline Value" value={`₹${(dashboard?.pipeline_value || 0).toLocaleString()}`} icon={IndianRupee} colorClass="bg-blue-600" />
            <StatCard title="Total Leads" value={dashboard?.total_leads} icon={Users} colorClass="bg-purple-600" />
            <StatCard title="Converted" value={dashboard?.converted} icon={CheckCircle2} colorClass="bg-emerald-600" />
            <StatCard title="Win Rate" value={dashboard?.win_rate} icon={TrendingUp} colorClass="bg-amber-500" />
          </View>

          {/* Pipeline Funnel UI (Visual Mockup) */}
          <View style={s.s17}>
            <Text style={s.s18}>Pipeline Health</Text>
            
            <View style={s.s19}>
              <View style={s.s20} />
              <View style={s.s21} />
              <View style={s.s22} />
            </View>
            
            <View style={s.s23}>
              <View style={s.s24}>
                <View style={s.s25} />
                <Text style={s.s26}>New (50%)</Text>
              </View>
              <View style={s.s27}>
                <View style={s.s28} />
                <Text style={s.s29}>In Prog (25%)</Text>
              </View>
              <View style={s.s30}>
                <View style={s.s31} />
                <Text style={s.s32}>Won (25%)</Text>
              </View>
            </View>
          </View>

          {/* Recent Leads */}
          <View>
            <View style={s.s33}>
              <Text style={s.s34}>Active Deals</Text>
              <TouchableOpacity>
                <Text style={s.s35}>View Pipeline</Text>
              </TouchableOpacity>
            </View>
            
            {dashboard?.recent_leads?.map((lead) => (
              <TouchableOpacity key={lead.id} style={s.s36}>
                
                <View style={s.s37}>
                  <Text style={s.s38}>{lead.name}</Text>
                  <View style={s.s39}>
                    <Users size={12} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={s.s40}>{lead.contact}</Text>
                  </View>
                  <Text style={s.s41}>{lead.updated}</Text>
                </View>

                <View style={s.s42}>
                  <Text style={s.s43}>₹{(lead.amount || 0).toLocaleString()}</Text>
                  
                  <View style={s.s45}
                  >
                    <Text style={s.s46}
                    >
                      {lead.status}
                    </Text>
                  </View>
                </View>

              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, width: '48%', marginBottom: 16 },
  s1: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  s2: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  s3: { flex: 1, backgroundColor: '#020617' },
  s4: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a', backgroundColor: '#020617', zIndex: 10 },
  s5: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s6: { color: '#ffffff', fontSize: 20, fontWeight: '900', flex: 1 },
  s7: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  s8: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s9: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  s10: { flex: 1 },
  s11: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  s12: { color: '#94a3b8', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  s13: { fontSize: 30, fontWeight: '900', color: '#ffffff' },
  s14: { backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  s15: { color: '#34d399', fontWeight: '700', fontSize: 12 },
  s16: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  s17: { backgroundColor: '#0f172a', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', marginBottom: 32 },
  s18: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s19: { flexDirection: 'row', height: 16, borderRadius: 9999, overflow: 'hidden', marginBottom: 8 },
  s20: { backgroundColor: '#3b82f6', width: '50%' },
  s21: { backgroundColor: '#eab308', width: '25%' },
  s22: { backgroundColor: '#10b981', width: '25%' },
  s23: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  s24: { flexDirection: 'row', alignItems: 'center' },
  s25: { width: 8, height: 8, borderRadius: 9999, backgroundColor: '#3b82f6', marginRight: 8 },
  s26: { color: '#94a3b8', fontSize: 12 },
  s27: { flexDirection: 'row', alignItems: 'center' },
  s28: { width: 8, height: 8, borderRadius: 9999, backgroundColor: '#eab308', marginRight: 8 },
  s29: { color: '#94a3b8', fontSize: 12 },
  s30: { flexDirection: 'row', alignItems: 'center' },
  s31: { width: 8, height: 8, borderRadius: 9999, backgroundColor: '#10b981', marginRight: 8 },
  s32: { color: '#94a3b8', fontSize: 12 },
  s33: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  s34: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s35: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
  s36: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s37: { flex: 1, marginRight: 8 },
  s38: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  s39: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  s40: { color: '#94a3b8', fontSize: 12 },
  s41: { color: '#64748b', fontSize: 12 },
  s42: { alignItems: 'flex-end' },
  s43: { color: '#ffffff', fontWeight: '900', fontSize: 18, marginBottom: 4 },
  s44: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  s45: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  s46: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
});

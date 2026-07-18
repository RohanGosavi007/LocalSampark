import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
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
    <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-[48%] mb-4 shadow-sm">
      <View className={`w-10 h-10 rounded-full items-center justify-center mb-3 ${colorClass}`}>
        <Icon size={20} color="#fff" />
      </View>
      <Text className="text-2xl font-black text-white mb-1" numberOfLines={1}>{value}</Text>
      <Text className="text-slate-400 text-sm font-medium">{title}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black flex-1">Sales CRM</Text>
        <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-full">
          <Text className="text-white font-bold text-xs">Add Lead</Text>
        </TouchableOpacity>
      </View>

      {loading && !dashboard ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} tintColor="#3b82f6" />}
        >
          
          <View className="mb-6 flex-row justify-between items-end">
            <View>
              <Text className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Overview</Text>
              <Text className="text-3xl font-black text-white">This Month</Text>
            </View>
            <View className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
              <Text className="text-emerald-400 font-bold text-xs">+12% vs last month</Text>
            </View>
          </View>

          {/* Metrics Grid */}
          <View className="flex-row flex-wrap justify-between mb-2">
            <StatCard title="Pipeline Value" value={`₹${(dashboard?.pipeline_value || 0).toLocaleString()}`} icon={IndianRupee} colorClass="bg-blue-600" />
            <StatCard title="Total Leads" value={dashboard?.total_leads} icon={Users} colorClass="bg-purple-600" />
            <StatCard title="Converted" value={dashboard?.converted} icon={CheckCircle2} colorClass="bg-emerald-600" />
            <StatCard title="Win Rate" value={dashboard?.win_rate} icon={TrendingUp} colorClass="bg-amber-500" />
          </View>

          {/* Pipeline Funnel UI (Visual Mockup) */}
          <View className="bg-slate-900 p-5 rounded-3xl border border-slate-800 mb-8">
            <Text className="text-white font-bold text-lg mb-4">Pipeline Health</Text>
            
            <View className="flex-row h-4 rounded-full overflow-hidden mb-2">
              <View className="bg-blue-500 w-1/2" />
              <View className="bg-yellow-500 w-1/4" />
              <View className="bg-emerald-500 w-1/4" />
            </View>
            
            <View className="flex-row justify-between mt-2">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                <Text className="text-slate-400 text-xs">New (50%)</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                <Text className="text-slate-400 text-xs">In Prog (25%)</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-slate-400 text-xs">Won (25%)</Text>
              </View>
            </View>
          </View>

          {/* Recent Leads */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white font-bold text-lg">Active Deals</Text>
              <TouchableOpacity>
                <Text className="text-blue-400 text-sm font-bold">View Pipeline</Text>
              </TouchableOpacity>
            </View>
            
            {dashboard?.recent_leads?.map((lead) => (
              <TouchableOpacity key={lead.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
                
                <View className="flex-1 mr-2">
                  <Text className="text-white font-bold text-base mb-1">{lead.name}</Text>
                  <View className="flex-row items-center mb-1">
                    <Users size={12} color="#64748b" style={{ marginRight: 4 }} />
                    <Text className="text-slate-400 text-xs">{lead.contact}</Text>
                  </View>
                  <Text className="text-slate-500 text-xs">{lead.updated}</Text>
                </View>

                <View className="items-end">
                  <Text className="text-white font-black text-lg mb-1">₹{(lead.amount || 0).toLocaleString()}</Text>
                  
                  <View className={`px-2 py-1 rounded border 
                    ${lead.status === 'HOT' ? 'bg-red-500/10 border-red-500/30' : 
                      lead.status === 'NEW' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}
                  >
                    <Text className={`text-[10px] font-bold tracking-widest 
                      ${lead.status === 'HOT' ? 'text-red-400' : 
                        lead.status === 'NEW' ? 'text-blue-400' : 'text-yellow-400'}`}
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
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
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
    <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-[48%] mb-4 shadow-sm">
      <View className={`w-10 h-10 rounded-full items-center justify-center mb-3 ${colorClass}`}>
        <Icon size={20} color="#fff" />
      </View>
      <Text className="text-3xl font-black text-white mb-1">{value}</Text>
      <Text className="text-slate-400 text-sm font-medium">{title}</Text>
    </View>
  );

  const QuickAction = ({ title, icon: Icon }) => (
    <TouchableOpacity className="items-center mr-6">
      <View className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-full items-center justify-center shadow-lg shadow-black/20 mb-2">
        <Icon size={24} color="#3b82f6" />
      </View>
      <Text className="text-slate-400 text-xs font-bold w-16 text-center">{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black flex-1">Society Admin</Text>
        <TouchableOpacity className="p-2 bg-slate-900 border border-slate-800 rounded-full">
          <Settings color="#fff" size={20} />
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
          {/* Welcome Banner */}
          <View className="mb-6">
            <Text className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Managing</Text>
            <Text className="text-3xl font-black text-white">{dashboard?.name}</Text>
          </View>

          {/* Metrics Grid */}
          <View className="flex-row flex-wrap justify-between mb-2">
            <StatCard title="Total Flats" value={dashboard?.total_flats} icon={Building} colorClass="bg-blue-600" />
            <StatCard title="Active Residents" value={dashboard?.active_residents} icon={Users} colorClass="bg-emerald-600" />
            <StatCard title="Visitors Today" value={dashboard?.visitors_today} icon={ShieldCheck} colorClass="bg-purple-600" />
            <StatCard title="Open Complaints" value={dashboard?.pending_complaints} icon={AlertTriangle} colorClass="bg-red-600" />
          </View>

          {/* Quick Actions (Horizontal) */}
          <View className="mb-8 mt-2">
            <Text className="text-white font-bold text-lg mb-4">Quick Actions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <QuickAction title="Broadcast Notice" icon={Megaphone} />
              <QuickAction title="Add Visitor" icon={ShieldCheck} />
              <QuickAction title="View Bills" icon={FileText} />
              <QuickAction title="Manage Flats" icon={Building} />
            </ScrollView>
          </View>

          {/* Notice Board */}
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white font-bold text-lg">Active Notices</Text>
              <TouchableOpacity>
                <Text className="text-blue-400 text-sm font-bold">View All</Text>
              </TouchableOpacity>
            </View>
            
            {dashboard?.notices?.map((notice) => (
              <View key={notice.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center">
                <View className={`w-2 h-full rounded-full mr-4 ${notice.urgency === 'HIGH' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <View className="flex-1">
                  <Text className="text-white font-bold text-base mb-1">{notice.title}</Text>
                  <Text className="text-slate-400 text-xs">{notice.date}</Text>
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
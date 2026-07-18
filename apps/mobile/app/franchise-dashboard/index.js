import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Store, ShoppingBag, IndianRupee, MapPin, Award, Activity } from 'lucide-react-native';
import { apiGet } from '../../src/lib/api';

export default function NativeFranchiseDashboardScreen() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiGet('/franchise/dashboard');
      if (data && data.success && data.dashboard) {
        setDashboard(data.dashboard);
      } else {
        // Mock data for B2B UI visualization
        setDashboard({
          region_name: 'Pune East',
          active_shops: 45,
          total_orders: 1240,
          commission_earned: 85400,
          growth_rate: '+18%',
          top_shops: [
            { id: 1, name: 'Dhanori Fresh Mart', orders: 320, revenue: 45000 },
            { id: 2, name: 'City Medico', orders: 210, revenue: 28000 },
            { id: 3, name: 'TechHub Electronics', orders: 45, revenue: 150000 },
          ]
        });
      }
    } catch (err) {
      console.warn('Failed to fetch franchise dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
    <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-4">
        <View className={`w-12 h-12 rounded-2xl items-center justify-center ${colorClass}`}>
          <Icon size={24} color="#fff" />
        </View>
        {subtitle && (
          <View className="bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
            <Text className="text-emerald-400 font-bold text-xs">{subtitle}</Text>
          </View>
        )}
      </View>
      <Text className="text-4xl font-black text-white mb-1">{value}</Text>
      <Text className="text-slate-400 text-base font-medium">{title}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black flex-1">Partner Portal</Text>
        <TouchableOpacity className="p-2">
          <Activity color="#3b82f6" size={24} />
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
          
          <View className="mb-6 flex-row items-center">
            <MapPin color="#64748b" size={20} className="mr-2" />
            <Text className="text-slate-300 text-lg font-bold">Region: <Text className="text-white font-black">{dashboard?.region_name}</Text></Text>
          </View>

          {/* Metrics Column */}
          <View>
            <StatCard 
              title="Total Commission" 
              value={`₹${(dashboard?.commission_earned || 0).toLocaleString()}`} 
              icon={IndianRupee} 
              colorClass="bg-blue-600 shadow-lg shadow-blue-900/50" 
              subtitle="This Month"
            />
            
            <View className="flex-row justify-between">
              <View className="w-[48%]">
                <StatCard title="Active Shops" value={dashboard?.active_shops} icon={Store} colorClass="bg-emerald-600" />
              </View>
              <View className="w-[48%]">
                <StatCard title="Total Orders" value={dashboard?.total_orders} icon={ShoppingBag} colorClass="bg-purple-600" />
              </View>
            </View>
          </View>

          {/* Regional Leaderboard */}
          <View className="mt-4">
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <Award color="#eab308" size={24} className="mr-2" />
                <Text className="text-white font-bold text-xl">Top Performers</Text>
              </View>
              <TouchableOpacity>
                <Text className="text-blue-400 text-sm font-bold">See All</Text>
              </TouchableOpacity>
            </View>
            
            {dashboard?.top_shops?.map((shop, index) => (
              <View key={shop.id} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl mb-3 flex-row items-center">
                
                <View className="w-10 h-10 bg-slate-800 rounded-full items-center justify-center mr-4">
                  <Text className="text-white font-black">{index + 1}</Text>
                </View>

                <View className="flex-1 mr-2">
                  <Text className="text-white font-bold text-base mb-1">{shop.name}</Text>
                  <Text className="text-slate-400 text-xs">{shop.orders} Orders Completed</Text>
                </View>

                <View className="items-end bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Revenue</Text>
                  <Text className="text-emerald-400 font-black text-sm">₹{(shop.revenue || 0).toLocaleString()}</Text>
                </View>

              </View>
            ))}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
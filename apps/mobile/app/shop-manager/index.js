import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, LayoutDashboard, ShoppingBag, Bell, CreditCard, TrendingUp, Users, Star, Package, AlertTriangle, Settings, ArrowRight } from 'lucide-react-native';
import { apiGet } from '../../src/lib/api';
import { useAppStore } from '../../src/store/useAppStore';
import NativeOrdersManager from './components/NativeOrdersManager';
import NativeInventoryManager from './components/NativeInventoryManager';
import NativeStaffManager from './components/NativeStaffManager';
import NativeSettingsManager from './components/NativeSettingsManager';

export default function NativeShopManagerScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');

  const { shopDashboardStats, setShopDashboardStats, setShopId } = useAppStore();

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiGet('/shops/my-shop/dashboard');
      if (data && data.success) {
        setShopDashboardStats(data.stats);
        if (data.shopId || data.shop?.id) {
          setShopId(data.shopId || data.shop?.id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch shop dashboard", err);
    }
  }, [setShopDashboardStats, setShopId]);

  useEffect(() => {
    fetchDashboard().finally(() => setLoading(false));
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard().finally(() => setRefreshing(false));
  }, [fetchDashboard]);

  const TABS = ['Dashboard', 'Orders', 'Inventory', 'Staff', 'Reviews', 'Settings'];

  const renderMetricCard = (label, value, IconComponent, colorHex) => (
    <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1 m-1 min-w-[45%]">
      <View className="flex-row items-center justify-between mb-3">
        <View style={{ backgroundColor: `${colorHex}20` }} className="p-2 rounded-xl">
          <IconComponent size={20} color={colorHex} />
        </View>
        {label === 'Pending' && parseInt(value) > 0 && (
          <View className="w-2 h-2 rounded-full bg-amber-500" />
        )}
      </View>
      <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</Text>
      <Text className="text-xl font-black text-white">{value}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-slate-800 bg-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold capitalize">Shop Manager Pro</Text>
      </View>

      {/* Tabs List */}
      <View className="bg-slate-900 border-b border-slate-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`mr-3 px-4 py-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}
              >
                <Text className={`font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>{tab}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {loading && !shopDashboardStats ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-400 mt-4">Loading Live Analytics...</Text>
          </View>
        ) : activeTab === 'Dashboard' ? (
          <View className="p-4">
            <View className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6 mb-6">
              <View className="flex-row items-center gap-4 mb-2">
                <View className="w-12 h-12 bg-blue-500/20 rounded-xl items-center justify-center border-2 border-blue-500/40">
                  <LayoutDashboard size={24} color="#60a5fa" />
                </View>
                <View>
                  <Text className="text-xl font-black text-white">Live Overview</Text>
                  <Text className="text-slate-400 text-sm">Real-time metrics for your business</Text>
                </View>
              </View>
            </View>

            <View className="flex-row flex-wrap justify-between">
              {renderMetricCard("Today's Orders", shopDashboardStats?.ordersToday || 0, ShoppingBag, '#3b82f6')}
              {renderMetricCard("Pending", shopDashboardStats?.ordersPending || 0, Bell, '#f59e0b')}
              {renderMetricCard("Today's Revenue", `₹${shopDashboardStats?.revenueToday || 0}`, CreditCard, '#22c55e')}
              {renderMetricCard("Total Revenue", `₹${shopDashboardStats?.revenueTotal || 0}`, TrendingUp, '#8b5cf6')}
              {renderMetricCard("Staff", shopDashboardStats?.staffCount || 0, Users, '#06b6d4')}
              {renderMetricCard("Avg Rating", `⭐ ${shopDashboardStats?.avgRating || '—'}`, Star, '#eab308')}
              {renderMetricCard("Products", shopDashboardStats?.productsCount || 0, Package, '#a855f7')}
              {renderMetricCard("Open Issues", shopDashboardStats?.disputesOpen || 0, AlertTriangle, '#ef4444')}
            </View>
          </View>
        ) : activeTab === 'Orders' ? (
          <NativeOrdersManager />
        ) : activeTab === 'Inventory' ? (
          <NativeInventoryManager />
        ) : activeTab === 'Staff' ? (
          <NativeStaffManager />
        ) : activeTab === 'Settings' ? (
          <NativeSettingsManager />
        ) : (
          <View className="py-20 items-center justify-center mx-4">
            <View className="bg-slate-800 p-4 rounded-full mb-4">
              <Settings size={32} color="#64748b" />
            </View>
            <Text className="text-lg font-bold text-white mb-2">{activeTab} Module</Text>
            <Text className="text-slate-400 text-sm text-center">
              The {activeTab} Native module is planned for Phase 2. Continue using the main web dashboard for advanced configuration.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
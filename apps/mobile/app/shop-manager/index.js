import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, RefreshControl , StyleSheet } from 'react-native';
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
    <View style={s.s0}>
      <View style={s.s1}>
        <View style={{ backgroundColor: `${colorHex}20` }} style={s.s2}>
          <IconComponent size={20} color={colorHex} />
        </View>
        {label === 'Pending' && parseInt(value) > 0 && (
          <View style={s.s3} />
        )}
      </View>
      <Text style={s.s4}>{label}</Text>
      <Text style={s.s5}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.s6}>
      {/* Header */}
      <View style={s.s7}>
        <TouchableOpacity onPress={() => router.back()} style={s.s8}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s9}>Shop Manager Pro</Text>
      </View>

      {/* Tabs List */}
      <View style={s.s10}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[s.s25, isActive ? s.s26 : s.s27]}
              >
                <Text style={[s.s28, isActive ? s.s29 : s.s30]}>{tab}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={s.s11}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
      >
        {loading && !shopDashboardStats ? (
          <View style={s.s12}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={s.s13}>Loading Live Analytics...</Text>
          </View>
        ) : activeTab === 'Dashboard' ? (
          <View style={s.s14}>
            <View style={s.s15}>
              <View style={s.s16}>
                <View style={s.s17}>
                  <LayoutDashboard size={24} color="#60a5fa" />
                </View>
                <View>
                  <Text style={s.s18}>Live Overview</Text>
                  <Text style={s.s19}>Real-time metrics for your business</Text>
                </View>
              </View>
            </View>

            <View style={s.s20}>
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
          <View style={s.s21}>
            <View style={s.s22}>
              <Settings size={32} color="#64748b" />
            </View>
            <Text style={s.s23}>{activeTab} Module</Text>
            <Text style={s.s24}>
              The {activeTab} Native module is planned for Phase 2. Continue using the main web dashboard for advanced configuration.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, flex: 1, margin: 4, minWidth: '45%' },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  s2: { padding: 8, borderRadius: 12 },
  s3: { width: 8, height: 8, borderRadius: 9999, backgroundColor: '#f59e0b' },
  s4: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  s5: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  s6: { flex: 1, backgroundColor: '#020617' },
  s7: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a' },
  s8: { marginRight: 16, padding: 8, backgroundColor: '#1e293b', borderRadius: 9999 },
  s9: { color: '#ffffff', fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
  s10: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b' },
  s11: { flex: 1 },
  s12: { paddingVertical: 80, justifyContent: 'center', alignItems: 'center' },
  s13: { color: '#94a3b8', marginTop: 16 },
  s14: { padding: 16 },
  s15: { backgroundColor: 'rgba(37,99,235,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 16, padding: 24, marginBottom: 24 },
  s16: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  s17: { width: 48, height: 48, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(59,130,246,0.4)' },
  s18: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  s19: { color: '#94a3b8', fontSize: 14 },
  s20: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  s21: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
  s22: { backgroundColor: '#1e293b', padding: 16, borderRadius: 9999, marginBottom: 16 },
  s23: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  s24: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  s25: { marginRight: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  s26: { backgroundColor: '#2563eb' },
  s27: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  s28: { fontWeight: '700' },
  s29: { color: '#ffffff' },
  s30: { color: '#cbd5e1' },
});

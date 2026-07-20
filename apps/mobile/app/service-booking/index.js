import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar, Clock, User, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react-native';
import { apiGet } from '../../src/lib/api';
import { useAppStore } from '../../src/store/useAppStore';

export default function NativeServiceBookingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Active');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const { serviceBookings, setServiceBookings } = useAppStore();

  const fetchBookings = useCallback(async () => {
    try {
      // Connects to our newly generated full-stack endpoint
      const data = await apiGet('/services/my-bookings');
      if (data && Array.isArray(data)) {
        setServiceBookings(data);
      }
    } catch (err) {
      console.warn("Failed to fetch bookings", err);
    }
  }, [setServiceBookings]);

  useEffect(() => {
    fetchBookings().finally(() => setLoading(false));
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings().finally(() => setRefreshing(false));
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    return serviceBookings.filter(b => {
      const status = b.status?.toLowerCase() || '';
      if (activeTab === 'Active') return status === 'pending' || status === 'confirmed';
      if (activeTab === 'Completed') return status === 'completed';
      if (activeTab === 'Cancelled') return status === 'cancelled';
      return true;
    });
  }, [serviceBookings, activeTab]);

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'confirmed': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'pending': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'completed': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'confirmed': return <CheckCircle2 size={12} color="#34d399" />;
      case 'pending': return <RefreshCcw size={12} color="#fbbf24" />;
      case 'completed': return <CheckCircle2 size={12} color="#60a5fa" />;
      case 'cancelled': return <AlertCircle size={12} color="#f87171" />;
      default: return null;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'TBD';
    const d = new Date(isoString);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  const renderBooking = ({ item }) => (
    <View className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4 shadow-md mx-4">
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-2 mb-2 flex-wrap">
            <View className="bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
              <Text className="text-[10px] font-bold text-slate-400 uppercase">ID: {item.id?.substring(0,8) || 'Mock'}</Text>
            </View>
            <View className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full border ${getStatusColor(item.status)}`}>
              {getStatusIcon(item.status)}
              <Text className={`text-[10px] font-bold capitalize ${getStatusColor(item.status).split(' ')[0]}`}>
                {item.status || 'Pending'}
              </Text>
            </View>
          </View>
          <Text className="text-lg font-black text-white">{item.service_name || 'Service Booking'}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xl font-black text-blue-400">₹{item.price || 0}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-4 pt-4 border-t border-slate-800 flex-wrap">
        <View className="flex-row items-center gap-2">
          <Calendar size={14} color="#64748b" />
          <Text className="text-xs font-medium text-slate-300">{formatTime(item.scheduled_time).split(',')[0]}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Clock size={14} color="#64748b" />
          <Text className="text-xs font-medium text-slate-300">{formatTime(item.scheduled_time).split(',')[1]?.trim() || 'TBD'}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <User size={14} color="#64748b" />
          <Text className="text-xs font-medium text-slate-300" numberOfLines={1}>{item.provider || 'Provider Assigned Soon'}</Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View className="px-4 py-6">
      <Text className="text-3xl font-black text-white mb-2">My Bookings</Text>
      <Text className="text-slate-400 mb-6">Track and manage your upcoming and past service requests.</Text>

      {/* Segmented Tabs */}
      <View className="flex-row bg-slate-900 border border-slate-800 rounded-xl p-1 mb-2">
        {['Active', 'Completed', 'Cancelled'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === tab ? 'bg-blue-600' : 'bg-transparent'}`}
          >
            <Text className={`text-sm font-bold ${activeTab === tab ? 'text-white' : 'text-slate-400'}`}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-800 bg-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold capitalize">Service Booking</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlashList estimatedItemSize={100}
          data={filteredBookings}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderBooking}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={["#3b82f6"]} />
          }
          ListEmptyComponent={
            <View className="py-20 items-center justify-center mx-4 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 mt-4">
              <Calendar size={48} color="#475569" style={{ marginBottom: 16 }} />
              <Text className="text-lg font-bold text-white mb-2">No {activeTab.toLowerCase()} bookings</Text>
              <Text className="text-slate-400 text-sm">You don't have any bookings in this category.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
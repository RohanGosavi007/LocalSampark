import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl , StyleSheet } from 'react-native';
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
    <View style={s.s0}>
      <View style={s.s1}>
        <View style={s.s2}>
          <View style={s.s3}>
            <View style={s.s4}>
              <Text style={s.s5}>ID: {item.id?.substring(0,8) || 'Mock'}</Text>
            </View>
            <View style={s.s28}>
              {getStatusIcon(item.status)}
              <Text style={s.s29}>
                {item.status || 'Pending'}
              </Text>
            </View>
          </View>
          <Text style={s.s6}>{item.service_name || 'Service Booking'}</Text>
        </View>
        <View style={s.s7}>
          <Text style={s.s8}>₹{item.price || 0}</Text>
        </View>
      </View>

      <View style={s.s9}>
        <View style={s.s10}>
          <Calendar size={14} color="#64748b" />
          <Text style={s.s11}>{formatTime(item.scheduled_time).split(',')[0]}</Text>
        </View>
        <View style={s.s12}>
          <Clock size={14} color="#64748b" />
          <Text style={s.s13}>{formatTime(item.scheduled_time).split(',')[1]?.trim() || 'TBD'}</Text>
        </View>
        <View style={s.s14}>
          <User size={14} color="#64748b" />
          <Text style={s.s15} numberOfLines={1}>{item.provider || 'Provider Assigned Soon'}</Text>
        </View>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={s.s16}>
      <Text style={s.s17}>My Bookings</Text>
      <Text style={s.s18}>Track and manage your upcoming and past service requests.</Text>

      {/* Segmented Tabs */}
      <View style={s.s19}>
        {['Active', 'Completed', 'Cancelled'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[s.s30, activeTab === tab ? s.s31 : s.s32]}
          >
            <Text style={[s.s33, activeTab === tab ? s.s34 : s.s35]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.s20}>
      <View style={s.s21}>
        <TouchableOpacity onPress={() => router.back()} style={s.s22}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s23}>Service Booking</Text>
      </View>

      {loading ? (
        <View style={s.s24}>
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
            <View style={s.s25}>
              <Calendar size={48} color="#475569" style={{ marginBottom: 16 }} />
              <Text style={s.s26}>No {activeTab.toLowerCase()} bookings</Text>
              <Text style={s.s27}>You don't have any bookings in this category.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, marginHorizontal: 16 },
  s1: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  s2: { flex: 1, paddingRight: 8 },
  s3: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  s4: { backgroundColor: '#1e293b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#334155' },
  s5: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  s6: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  s7: { alignItems: 'flex-end' },
  s8: { fontSize: 20, fontWeight: '900', color: '#60a5fa' },
  s9: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#1e293b', flexWrap: 'wrap' },
  s10: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  s11: { fontSize: 12, fontWeight: '500', color: '#cbd5e1' },
  s12: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  s13: { fontSize: 12, fontWeight: '500', color: '#cbd5e1' },
  s14: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  s15: { fontSize: 12, fontWeight: '500', color: '#cbd5e1' },
  s16: { paddingHorizontal: 16, paddingVertical: 24 },
  s17: { fontSize: 30, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  s18: { color: '#94a3b8', marginBottom: 24 },
  s19: { flexDirection: 'row', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 4, marginBottom: 8 },
  s20: { flex: 1, backgroundColor: '#020617' },
  s21: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a' },
  s22: { marginRight: 16, padding: 8, backgroundColor: '#1e293b', borderRadius: 9999 },
  s23: { color: '#ffffff', fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
  s24: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  s25: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#334155', marginTop: 16 },
  s26: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  s27: { color: '#94a3b8', fontSize: 14 },
  s28: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
  s29: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  s30: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  s31: { backgroundColor: '#2563eb' },
  s32: { backgroundColor: 'transparent' },
  s33: { fontSize: 14, fontWeight: '700' },
  s34: { color: '#ffffff' },
  s35: { color: '#94a3b8' },
});

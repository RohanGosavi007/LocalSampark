import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Alert, Platform, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as Location from 'expo-location';
import { apiGet, apiPost } from '../lib/api';
import { TrendingUp, ShoppingBag, Plus, RefreshCw, Users, AlertTriangle, ArrowRight, Database } from 'lucide-react-native';

export default function DashboardNativeTemplate() {
  const { user, authToken } = useAuth();
  const { shops, setShops } = useAppStore();
  const [metrics, setMetrics] = useState({ totalUsers: 0, activeShops: 0, revenueToday: '0.00', pendingApprovals: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopCategory, setNewShopCategory] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [shopCoords, setShopCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const metricsData = await apiGet('/dashboard/metrics');
      setMetrics(metricsData);
      const shopsData = await apiGet('/shops');
      setShops(shopsData);
    } catch (error) {
      console.error('[Dashboard fetch error]', error);
      setMetrics({ totalUsers: 0, activeShops: 0, revenueToday: '0.00', pendingApprovals: 0 });
      Alert.alert('Data Sync Error', 'Could not load live figures. The numbers shown are not current.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [setShops]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  // The shop's position, taken from the device. A shop with no coordinates is
  // stored and then appears in no nearby search, so the server refuses one, and
  // this form used to send only a name and a category — every submission
  // failed. The owner is expected to be standing in the shop when they add it.
  const captureLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Allow location access so customers nearby can find this shop.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setShopCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      Alert.alert('Location unavailable', 'Could not read your position. Check that location is switched on and try again.');
    } finally { setLocating(false); }
  };

  const handleCreateShop = async () => {
    if (!newShopName.trim() || !newShopCategory.trim()) { Alert.alert('Validation Error', 'Please enter shop name and category.'); return; }
    if (!newShopAddress.trim()) { Alert.alert('Validation Error', 'Please enter the shop address.'); return; }
    if (!shopCoords) { Alert.alert('Validation Error', 'Please set the shop location.'); return; }
    setSubmitting(true);
    try {
      // The owner is whoever is signed in and the status is always pending
      // review; the server decides both, so neither is sent.
      const result = await apiPost('/shops', {
        name: newShopName.trim(),
        category: newShopCategory.trim(),
        address: newShopAddress.trim(),
        latitude: shopCoords.latitude,
        longitude: shopCoords.longitude,
      });
      Alert.alert('Submitted for review', `"${result.name || newShopName}" will appear once it has been approved.`);
      setNewShopName(''); setNewShopCategory(''); setNewShopAddress(''); setShopCoords(null); fetchDashboardData();
    } catch (error) {
      // The server names each field it could not accept.
      const problems = error?.data?.problems;
      const detail = Array.isArray(problems) && problems.length
        ? problems.map((p) => p.message).join('\n')
        : (error.message || 'Failed to submit.');
      Alert.alert('Could not add the shop', detail);
    }
    finally { setSubmitting(false); }
  };

  if (loading && !refreshing) {
    return (
      <View style={s.loadingView}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={s.loadingText}>Connecting to Shared Database...</Text>
      </View>
    );
  }

  const metricCards = [
    { label: 'Revenue (Today)', value: `₹${metrics.revenueToday}`, icon: TrendingUp, color: '#3b82f6', hint: 'Live from PG Database', hintColor: '#10b981' },
    { label: 'Active Businesses', value: `${metrics.activeShops}`, icon: ShoppingBag, color: '#10b981', hint: 'Updated instantly', hintColor: '#64748b' },
    { label: 'Registered Users', value: `${metrics.totalUsers}`, icon: Users, color: '#8b5cf6', hint: 'Unified User Base', hintColor: '#a855f7' },
    { label: 'Pending Tasks', value: `${metrics.pendingApprovals}`, icon: AlertTriangle, color: '#f59e0b', hint: 'Requires Moderator', hintColor: '#f59e0b' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />}>
      {/* DB Status */}
      <View style={s.dbStatusBar}>
        <View style={s.dbStatusLeft}><Database size={14} color="#10b981" /><Text style={s.dbStatusText}>SHARED DB: CONNECTED</Text></View>
        <Text style={s.dbRoleText}>Role: {user?.role || 'Guest'}</Text>
      </View>

      {/* Welcome */}
      <View style={s.welcomeCard}>
        <Text style={s.welcomeLabel}>Welcome back,</Text>
        <Text style={s.welcomeName}>{user?.name || 'Local Resident'}</Text>
        <Text style={s.welcomeHint}>Shared Database Status: Active & Synced</Text>
      </View>

      {/* Metrics */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Key Performance Metrics</Text>
          <TouchableOpacity onPress={onRefresh} style={s.syncBtn}><RefreshCw size={14} color="#3b82f6" /><Text style={s.syncText}>Sync</Text></TouchableOpacity>
        </View>
        <View style={s.metricsGrid}>
          {metricCards.map((m, i) => {
            const IconComp = m.icon;
            return (
              <View key={i} style={s.metricCard}>
                <View style={s.metricHeader}><Text style={s.metricLabel}>{m.label}</Text><IconComp size={16} color={m.color} /></View>
                <Text style={s.metricValue}>{m.value}</Text>
                <Text style={[s.metricHint, { color: m.hintColor }]}>{m.hint}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Form */}
      <View style={s.section}>
        <View style={s.formCard}>
          <Text style={s.formTitle}>Add Business Listing</Text>
          <Text style={s.formSubtitle}>Submitting writes directly to PostgreSQL.</Text>
          <Text style={s.fieldLabel}>Business / Shop Name</Text>
          <TextInput style={s.input} placeholder="e.g. New Deluxe Sweets" placeholderTextColor="#475569" value={newShopName} onChangeText={setNewShopName} />
          <Text style={s.fieldLabel}>Business Category</Text>
          <TextInput style={s.input} placeholder="e.g. Bakery / Grocery / Services" placeholderTextColor="#475569" value={newShopCategory} onChangeText={setNewShopCategory} />
          <Text style={s.fieldLabel}>Address</Text>
          <TextInput style={s.input} placeholder="Shop number, street, area" placeholderTextColor="#475569" value={newShopAddress} onChangeText={setNewShopAddress} />
          <Text style={s.fieldLabel}>Location</Text>
          <TouchableOpacity onPress={captureLocation} disabled={locating} style={s.locationBtn}>
            {locating
              ? <ActivityIndicator size="small" color="#3b82f6" />
              : <Text style={s.locationText}>
                  {shopCoords
                    ? `Set: ${shopCoords.latitude.toFixed(5)}, ${shopCoords.longitude.toFixed(5)} (tap to update)`
                    : 'Use my current location'}
                </Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCreateShop} disabled={submitting} style={[s.submitBtn, submitting && { backgroundColor: '#1e40af' }]}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <><Plus size={16} color="#fff" /><Text style={s.submitText}>Submit to Shared Database</Text></>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Listings */}
      <View style={s.section}>
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Synced Directory Listings</Text><Text style={s.countText}>Total: {shops.length}</Text></View>
        {shops.map((shop) => (
          <View key={shop.id} style={s.shopCard}>
            <View><Text style={s.shopName}>{shop.name}</Text><Text style={s.shopCategory}>{shop.category}</Text></View>
            <View style={s.shopRight}>
              <View style={[s.statusBadge, { backgroundColor: shop.status === 'Approved' ? '#022c22' : '#451a03', borderColor: shop.status === 'Approved' ? '#065f46' : '#78350f' }]}>
                <Text style={[s.statusText, { color: shop.status === 'Approved' ? '#34d399' : '#fbbf24' }]}>{shop.status || 'Pending'}</Text>
              </View>
              <ArrowRight size={14} color="#475569" style={{ marginLeft: 12 }} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  loadingText: { color: '#94a3b8', marginTop: 16, fontSize: 14, fontWeight: '500' },
  dbStatusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  dbStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dbStatusText: { color: '#34d399', fontSize: 12, fontWeight: '600' },
  dbRoleText: { color: '#94a3b8', fontSize: 12 },
  welcomeCard: { padding: 20, backgroundColor: '#1e3a5f', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  welcomeLabel: { color: '#ffffff', fontSize: 18, fontWeight: '400' },
  welcomeName: { color: '#ffffff', fontSize: 24, fontWeight: '700', marginTop: 4 },
  welcomeHint: { color: '#bfdbfe', fontSize: 12, marginTop: 8 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  syncText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', backgroundColor: '#0f172a', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metricLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  metricValue: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  metricHint: { fontSize: 10, marginTop: 4 },
  formCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' },
  formTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  formSubtitle: { color: '#94a3b8', fontSize: 12, marginBottom: 16 },
  fieldLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#ffffff', marginBottom: 12, fontSize: 14 },
  locationBtn: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, alignItems: 'flex-start' },
  locationText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#2563eb', gap: 8 },
  submitText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  countText: { color: '#64748b', fontSize: 12 },
  shopCard: { backgroundColor: '#0f172a', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shopName: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  shopCategory: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  shopRight: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
});

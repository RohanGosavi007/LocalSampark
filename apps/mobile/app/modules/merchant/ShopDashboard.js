import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Switch, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPut } from '../../../src/lib/api';

/**
 * The merchant terminal, reached from the profile screen.
 *
 * Its own source called the order list "Dummy live orders", and that is what it
 * was: ORD-8921 for "2x Milk, 1x Bread" at ₹145 marked NEW "Just Now", and
 * ORD-8920 for "1x Soap, 1x Shampoo" at ₹320 already PREPARING. Above them,
 * ₹4,250 in sales and 14 orders completed today. None of it existed.
 *
 * Accept Order, Reject and "Mark Ready for Runner" had no handlers, so a
 * merchant pressing Accept on what looked like a live order changed nothing and
 * was told nothing — and a real customer waiting on that order would never have
 * been served. The Online switch was local state that no request followed.
 *
 * The working order queue is /(tabs)/orders, which reads /shops/my-shop/orders
 * and moves orders through /shops/my-shop/orders/:id/status. Rather than a
 * second, divergent implementation of accept/reject, this screen reports the
 * real figures from /shops/my-shop/dashboard and sends the merchant there.
 */
export default function ShopDashboard() {
  const [shop, setShop] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [togglingLive, setTogglingLive] = useState(false);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiGet('/shops/my-shop/dashboard');
      setShop(res?.shop ?? null);
      setStats(res?.stats ?? null);
      setPendingOrders(
        (res?.recentOrders ?? []).filter((o) =>
          ['pending', 'confirmed', 'preparing'].includes(String(o.order_status || '').toLowerCase())
        )
      );
      setError(null);
    } catch (err) {
      setShop(null);
      setStats(null);
      setPendingOrders([]);
      setError(err?.message || 'Could not load your shop.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The switch was local state only. It now writes through and reverts if the
  // server refuses, so it cannot show Online while the shop is hidden.
  const isOnline = shop ? Boolean(Number(shop.is_active ?? 1)) : false;

  const toggleLive = useCallback(async (next) => {
    setTogglingLive(true);
    setShop((prev) => (prev ? { ...prev, is_active: next ? 1 : 0 } : prev));
    try {
      await apiPut('/shops/my-shop/live-status', { isLive: next });
    } catch (err) {
      setShop((prev) => (prev ? { ...prev, is_active: next ? 0 : 1 } : prev));
      Alert.alert('Not saved', err?.message || 'Your shop status was not changed.');
    } finally {
      setTogglingLive(false);
    }
  }, []);

  const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Merchant Terminal</Text>
          <Switch
            value={isOnline}
            onValueChange={toggleLive}
            disabled={!shop || togglingLive}
            trackColor={{ false: '#94a3b8', true: '#10b981' }}
            style={{ marginLeft: 16 }}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centre}><ActivityIndicator size="large" color="#1e293b" /></View>
      ) : (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} />}
      >
        {error && (
          <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{money(stats?.revenueToday)}</Text>
            <Text style={styles.statTitle}>Today&apos;s Sales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Number(stats?.ordersToday) || 0}</Text>
            <Text style={styles.statTitle}>Orders Today</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Number(stats?.ordersPending) || 0}</Text>
            <Text style={styles.statTitle}>Awaiting Action</Text>
          </View>
          <View style={styles.statCard}>
            {/* An unrated shop shows a dash, not a rating it has not earned. */}
            <Text style={styles.statValue}>{stats?.avgRating != null ? stats.avgRating : '—'}</Text>
            <Text style={styles.statTitle}>Avg Rating</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Orders Awaiting You</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
            <Text style={styles.linkText}>Open queue</Text>
          </TouchableOpacity>
        </View>

        {pendingOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {error
                ? 'Your orders could not be loaded.'
                : 'Nothing is waiting. New orders appear here and in the Orders tab.'}
            </Text>
          </View>
        ) : pendingOrders.slice(0, 5).map((order) => (
          <TouchableOpacity
            key={String(order.id)}
            style={styles.orderCard}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>#{String(order.id).slice(0, 8)}</Text>
              <Text style={styles.orderStatus}>{String(order.order_status || '').toUpperCase()}</Text>
            </View>
            <Text style={styles.orderItems}>{order.customer_name || 'Customer'}</Text>
            <Text style={styles.orderTotal}>{money(order.total_amount)}</Text>
            <Text style={styles.orderHint}>Accept, reject or dispatch this order in the Orders tab.</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Management</Text>
        <View style={styles.manageGrid}>
          {/* Both buttons were dead. They now go to the screens that do the work. */}
          <TouchableOpacity style={styles.manageBtn} onPress={() => router.push('/(tabs)/products')}>
            <Text style={styles.manageBtnText}>Catalog Manager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manageBtn} onPress={() => router.push('/(tabs)/revenue')}>
            <Text style={styles.manageBtnText}>Settlements</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { marginRight: 16 },
  backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },

  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 13 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  statTitle: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 12 },
  linkText: { fontSize: 13, fontWeight: '700', color: '#3b82f6', marginBottom: 12 },

  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  orderStatus: { fontSize: 12, color: '#ef4444', fontWeight: '800' },
  orderItems: { fontSize: 14, color: '#475569', marginBottom: 8, fontWeight: '500' },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#10b981', marginBottom: 8 },
  orderHint: { fontSize: 12, color: '#94a3b8' },

  manageGrid: { flexDirection: 'row', gap: 12 },
  manageBtn: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  manageBtnText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
});

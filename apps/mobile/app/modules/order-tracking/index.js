import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { apiGet } from '../../../src/lib/api';

export default function OrderTrackingScreen() {
  // This screen called no API at all. A setTimeout handed back one invented
  // order — "ORD-1234 from Sharma Grocery, ₹540, Aashirvaad Atta and Amul
  // Butter" — with a handover OTP of "4921". A customer could have read that
  // code out to a delivery rider at the door. /orders/my-orders has been
  // available the whole time.
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadOrders = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(null);
    try {
      const res = await apiGet('/orders/my-orders');
      const rows = res?.data ?? (Array.isArray(res) ? res : []);
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setOrders([]);
      setLoadError(err?.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const getStatusStep = (status) => {
    const steps = ['pending', 'accepted', 'packing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'];
    return steps.indexOf(status);
  };

  const steps = ['Placed', 'Packing', 'Dispatched', 'Completed'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Order Tracking</Text>
          <Text style={styles.subtitle}>Track your recent orders</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOrders({ isRefresh: true })}
            tintColor="#3b82f6"
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {loadError || 'You have no active orders.'}
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => (loadError ? loadOrders({ isRefresh: true }) : router.push('/(tabs)/directory'))}
            >
              <Text style={styles.primaryBtnText}>{loadError ? 'Retry' : 'Browse Shops'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.shopName}>{order.shop_name}</Text>
                  <Text style={styles.orderMeta}>Order #{order.id} • {new Date(order.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.totalAmount}>₹{order.total_amount}</Text>
                  <View style={styles.typeBadge}>
                    {/* /orders/my-orders returns fulfillment_method. delivery_type
                        was the mock's own field name and is always undefined on
                        a real order, so every order read as "Delivery". */}
                    <Text style={styles.typeText}>
                      {(order.fulfillment_method || order.delivery_type) === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress Timeline */}
              <View style={styles.timelineContainer}>
                <View style={styles.timelineLineBg} />
                <View style={[styles.timelineLineFill, { width: `${Math.max(0, (getStatusStep(order.status) / 4) * 80)}%` }]} />
                
                <View style={styles.timelineSteps}>
                  {steps.map((step, idx) => {
                    const isActive = getStatusStep(order.status) >= idx;
                    return (
                      <View key={idx} style={styles.timelineStep}>
                        <View style={[styles.stepDot, isActive && styles.stepDotActive]}>
                          {isActive && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                        </View>
                        <Text style={[styles.stepText, isActive && styles.stepTextActive]}>{step}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Rendered only when the server actually sent a handover code.
                  The mock supplied one unconditionally, so this box always
                  showed a number that no rider could verify. */}
              {order.tracking_otp && (order.status === 'out_for_delivery' || order.status === 'packing') && (
                <View style={styles.otpBox}>
                  <View>
                    <Text style={styles.otpLabel}>Share OTP with Delivery Agent</Text>
                    <Text style={styles.otpText}>{order.tracking_otp}</Text>
                  </View>
                  <Text style={{ fontSize: 32 }}>🔐</Text>
                </View>
              )}

              {/* /orders/my-orders returns items_count rather than the line
                  items themselves, so this lists them when they are present and
                  otherwise states the count. `order.items.map` on the real
                  response threw — items is undefined there. */}
              <View style={styles.itemsContainer}>
                <Text style={styles.itemsTitle}>Items</Text>
                {Array.isArray(order.items) && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
                      <Text style={styles.itemPrice}>₹{(Number(item.price) || 0) * (Number(item.quantity) || 0)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.itemName}>
                    {Number(order.items_count) || 0} item{Number(order.items_count) === 1 ? '' : 's'}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scrollContent: { padding: 16 },
  emptyState: { padding: 32, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, marginTop: 40 },
  emptyText: { fontSize: 16, color: '#64748b', marginBottom: 20 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 16, marginBottom: 20 },
  shopName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  orderMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#3b82f6' },
  typeBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6 },
  typeText: { color: '#3730a3', fontSize: 11, fontWeight: '700' },
  timelineContainer: { position: 'relative', marginBottom: 24, marginHorizontal: 10 },
  timelineLineBg: { position: 'absolute', top: 12, left: '5%', right: '5%', height: 4, backgroundColor: '#e2e8f0', zIndex: 1 },
  timelineLineFill: { position: 'absolute', top: 12, left: '5%', height: 4, backgroundColor: '#3b82f6', zIndex: 2 },
  timelineSteps: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 3 },
  timelineStep: { alignItems: 'center', width: 60 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#3b82f6' },
  stepText: { fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
  stepTextActive: { color: '#0f172a', fontWeight: '700' },
  otpBox: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fbbf24', borderStyle: 'dashed', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  otpLabel: { fontSize: 12, color: '#b45309' },
  otpText: { fontSize: 24, fontWeight: '900', letterSpacing: 4, color: '#92400e', marginTop: 4 },
  itemsContainer: { marginTop: 8 },
  itemsTitle: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { fontSize: 14, color: '#334155' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiGet, apiPost } from '../../src/lib/api';

/**
 * Available delivery jobs for a rider.
 *
 * The list was two invented jobs — "DEL-1049, Food Delivery, pickup Sharma
 * Grocery, drop Flat 402 Goodwill Society, ₹45" — served by a setTimeout, and
 * Accept popped "Order Accepted!" while calling nothing. A rider could accept a
 * job that did not exist and then wait for a pickup that was never coming.
 * The header also read "Pincode: 400001" for every rider regardless of where
 * they are.
 *
 * GET /delivery/jobs and POST /delivery/jobs/:id/accept back it now. Those
 * endpoints previously queried a `delivery_routes` table that no migration
 * creates, so they had never returned a job either; they now derive available
 * work from orders a shop has marked ready.
 */
export default function AvailableOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/delivery/jobs');
      setOrders(res?.data ?? []);
    } catch (err) {
      setOrders([]);
      setError(err?.message || 'Could not load available jobs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (job) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAccepting(job.id);
    try {
      await apiPost(`/delivery/jobs/${job.id}/accept`, {});
      setOrders((prev) => prev.filter((o) => o.id !== job.id));
      Alert.alert('Job accepted', 'It is now in your active deliveries.', [
        { text: 'OK' },
        { text: 'Go there', onPress: () => router.push('/(tabs)/active') },
      ]);
    } catch (err) {
      // Another rider may have taken it first; the old version always claimed
      // success.
      Alert.alert('Not accepted', err?.message || 'This job could not be accepted.');
      await load({ isRefresh: true });
    } finally {
      setAccepting(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📡 Available Jobs</Text>
        <Text style={styles.subtitle}>
          {orders.length} job{orders.length === 1 ? '' : 's'} waiting to be picked up
        </Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#3b82f6" />
          }
        >
          {orders.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {error ? 'Could not load jobs' : 'No available jobs right now'}
              </Text>
              <Text style={styles.stateBody}>
                {error || 'Pull down to refresh when you are ready for the next one.'}
              </Text>
              {error ? (
                <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : orders.map(order => (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>#{String(order.id).slice(0, 8)}</Text>
                <Text style={styles.earnings}>₹{Number(order.earnings) || 0}</Text>
              </View>

              <Text style={styles.orderType}>{order.type === 'pickup' ? 'Customer Pickup' : 'Delivery'}</Text>

              {/* Each leg renders only when the order carries it. */}
              {order.pickup ? (
                <Text style={styles.legText}>📦 Pick up from {order.pickup}</Text>
              ) : null}
              {order.dropoff ? (
                <Text style={styles.legText}>📍 Drop at {order.dropoff}</Text>
              ) : null}

              <TouchableOpacity
                style={[styles.acceptBtn, accepting === order.id && { opacity: 0.6 }]}
                disabled={accepting === order.id}
                onPress={() => handleAccept(order)}
              >
                {accepting === order.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.acceptBtnText}>Accept Job</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  content: { padding: 15 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  earnings: { color: '#10b981', fontSize: 20, fontWeight: '900' },
  orderType: { color: '#0f172a', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  legText: { color: '#475569', fontSize: 14, marginBottom: 4 },
  acceptBtn: { marginTop: 12, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  acceptBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', margin: 15 },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});

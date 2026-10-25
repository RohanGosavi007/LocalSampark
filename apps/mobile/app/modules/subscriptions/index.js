import React, { useState, useEffect, useCallback } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';

// Plans and the customer's own subscriptions come from /subscriptions. This screen used to
// ship four invented plans (a named dairy, a water-can brand, a home chef, a news agent), a
// hard-coded ₹1,420 wallet balance and a pre-subscribed "milk" plan, and its subscribe,
// pause and stop buttons only changed local state, so nothing was ever ordered.
const money = (v) => (v == null || v === '' ? '' : (String(v).startsWith('₹') ? String(v) : `₹${v}`));
const list = (r) => (Array.isArray(r) ? r : (r && (r.data || r.rows)) || []);

function SubscriptionsModule() {
  const [plans, setPlans] = useState([]);
  const [mine, setMine] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, m] = await Promise.all([apiGet('/subscriptions/plans'), apiGet('/subscriptions/my-subscriptions')]);
      setPlans(list(p));
      setMine(list(m));
    } catch (e) {
      setError(e.message || 'Could not load subscriptions.');
    }
    try {
      const w = await apiGet('/wallet/history');
      setBalance(typeof w.balance === 'number' ? w.balance : null);
    } catch (e) { /* the balance is informational; leave it blank */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (id, action, success) => {
    setBusyId(id);
    try {
      await action();
      await load();
      if (success) Alert.alert('Done', success);
    } catch (e) {
      Alert.alert('Not changed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const subscribe = (plan) => Alert.alert(
    'Subscribe',
    `Subscribe to ${plan.name}${plan.price != null ? ` for ${money(plan.price)}` : ''}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Subscribe', onPress: () => run(plan.id, () => apiPost('/subscriptions/subscribe', { planId: plan.id }), 'You are subscribed.') },
    ]
  );

  const manage = (sub) => Alert.alert(sub.plan_name || 'Subscription', 'What would you like to do?', [
    { text: 'Close', style: 'cancel' },
    sub.status === 'paused'
      ? { text: 'Resume', onPress: () => run(sub.id, () => apiPut(`/subscriptions/${sub.id}/resume`, {}), 'Deliveries resumed.') }
      : { text: 'Pause', onPress: () => run(sub.id, () => apiPut(`/subscriptions/${sub.id}/pause`, {}), 'Deliveries paused.') },
    { text: 'Cancel subscription', style: 'destructive', onPress: () => run(sub.id, () => apiDelete(`/subscriptions/${sub.id}`), 'Subscription cancelled.') },
  ]);

  const subscribedPlanIds = new Set(mine.map((s) => s.plan_id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>📅 Subscriptions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {balance !== null && (
          <View style={styles.walletCard}>
            <View>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletAmount}>₹{balance}</Text>
            </View>
            <TouchableOpacity style={styles.addMoneyBtn} onPress={() => router.push('/(tabs)/wallet')}>
              <Text style={styles.addMoneyBtnText}>+ Add Money</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => { setLoading(true); load(); }}><Text style={styles.btnText}>Try again</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>My Subscriptions</Text>
            {mine.length === 0 ? (
              <Text style={styles.empty}>You have no active subscriptions.</Text>
            ) : mine.map((s) => (
              <View key={s.id} style={styles.card}>
                <Text style={styles.planName}>{s.icon ? `${s.icon} ` : ''}{s.plan_name}</Text>
                {s.provider_name ? <Text style={styles.sub}>{s.provider_name}</Text> : null}
                <Text style={styles.sub}>{s.status === 'paused' ? 'Paused' : (s.next_delivery_date ? `Next delivery: ${new Date(s.next_delivery_date).toLocaleDateString()}` : 'Active')}</Text>
                <TouchableOpacity style={styles.btn} disabled={busyId === s.id} onPress={() => manage(s)}>
                  <Text style={styles.btnText}>{busyId === s.id ? 'Working…' : 'Manage'}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Available Plans</Text>
            {plans.length === 0 ? (
              <Text style={styles.empty}>No plans are available in your area yet.</Text>
            ) : plans.map((p) => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.planName}>{p.icon ? `${p.icon} ` : ''}{p.name}</Text>
                {p.provider_name ? <Text style={styles.sub}>{p.provider_name}</Text> : null}
                {p.price != null ? <Text style={styles.price}>{money(p.price)}</Text> : null}
                {p.schedule ? <Text style={styles.sub}>{p.schedule}</Text> : null}
                <TouchableOpacity style={[styles.btn, subscribedPlanIds.has(p.id) && styles.btnOff]} disabled={subscribedPlanIds.has(p.id) || busyId === p.id} onPress={() => subscribe(p)}>
                  <Text style={styles.btnText}>{subscribedPlanIds.has(p.id) ? 'Subscribed' : (busyId === p.id ? 'Working…' : 'Subscribe')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16, paddingBottom: 48 },
  walletCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  walletLabel: { color: '#94a3b8', fontSize: 12 }, walletAmount: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  addMoneyBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }, addMoneyBtnText: { color: '#fff', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 12, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  planName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  sub: { color: '#64748b', marginTop: 4 },
  price: { color: '#0f172a', fontWeight: 'bold', marginTop: 6 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  btnOff: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  empty: { color: '#64748b', marginBottom: 8 },
  errorText: { color: '#dc2626', fontWeight: '600' },
});

export default withRoleGuard(SubscriptionsModule, 'subscriptions');

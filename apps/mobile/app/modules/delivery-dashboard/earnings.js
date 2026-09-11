import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { apiGet } from '../../../src/lib/api';

/**
 * The rider's earnings ledger.
 *
 * Two separate problems lived here, and the second one was the serious one.
 *
 * First, the numbers were invented: a ₹1,240.50 balance and four transactions
 * nobody had been paid — ₹45 for DEL001 at a 1.2x surge, ₹35.50 for DEL002, a
 * ₹150 "Rain Incentive Bonus", and a ₹5,000 bank withdrawal shown as already
 * taken. Beneath them sat an "Incentive Projections" panel promising a ₹340
 * weekly fuel incentive, an active rain bonus of ₹20 per order and 1.5x surge
 * in Viman Nagar. None of those schemes exist; a rider could have planned their
 * week around them.
 *
 * Second, "Withdraw Now (Instant)" called no API at all. It popped a
 * confirmation naming RazorpayX, then told the rider "Payout initiated
 * successfully. It should reflect in your account within 5 minutes" and set the
 * on-screen balance to zero. Nothing was transferred and nothing was recorded,
 * so a rider was told their money had been sent when it had not — and the
 * screen then agreed with them that the balance was spent.
 *
 * There is no rider-initiated payout endpoint in the backend, so the button is
 * gone rather than reimplemented against nothing. /delivery/analytics returns
 * the real wallet balance and ledger.
 */
export default function EarningsLedger() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiGet('/delivery/analytics');
      setData(res?.data ?? null);
      setError(null);
    } catch (err) {
      setData(null);
      setError(err?.message || 'Could not load your ledger.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const money = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const history = (data?.transactions ?? []).map((t, i) => ({
    id: t.id ?? `txn-${i}`,
    credit: String(t.transaction_type || '').toLowerCase() === 'credit',
    title: t.purpose || 'Wallet activity',
    amount: Number(t.amount) || 0,
    date: t.created_at
      ? new Date(t.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      : '',
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Earnings & Ledger</Text>
      </View>

      {loading ? (
        <View style={styles.centre}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : (
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} />}
      >
        {error && (
          <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>
        )}

        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{money(data?.wallet?.balance)}</Text>
          <Text style={styles.balanceNote}>Settled to your registered bank account</Text>
        </View>

        {/* Lifetime totals, in place of the invented incentive schemes. */}
        <View style={styles.projectionContainer}>
          <Text style={styles.sectionTitle}>Your Totals</Text>
          <View style={styles.projectionCard}>
            <View style={styles.projRow}>
              <Text style={styles.projLabel}>Earned today</Text>
              <Text style={styles.projValue}>₹{money(data?.todayAnalytics?.total_earnings)}</Text>
            </View>
            <View style={styles.projRow}>
              <Text style={styles.projLabel}>Deliveries today</Text>
              <Text style={styles.projValue}>{Number(data?.todayAnalytics?.total_deliveries) || 0}</Text>
            </View>
            <View style={styles.projRow}>
              <Text style={styles.projLabel}>Earned all time</Text>
              <Text style={styles.projValue}>₹{money(data?.lifetime?.total_earnings)}</Text>
            </View>
            <View style={[styles.projRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.projLabel}>Deliveries all time</Text>
              <Text style={styles.projValue}>{Number(data?.lifetime?.total_deliveries) || 0}</Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No wallet activity yet. Payments for completed deliveries are credited here.
              </Text>
            </View>
          ) : history.map((txn) => (
            <View key={txn.id} style={styles.txnItem}>
              <View style={styles.txnIconBox}>
                <Text style={{ fontSize: 18 }}>{txn.credit ? '🟢' : '🔴'}</Text>
              </View>
              <View style={styles.txnDetails}>
                <Text style={styles.txnTitle}>{txn.title}</Text>
                <Text style={styles.txnDate}>{txn.date}</Text>
              </View>
              <Text style={[styles.txnAmount, { color: txn.credit ? '#10b981' : '#ef4444' }]}>
                {txn.credit ? '+' : '−'}₹{money(txn.amount)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, backgroundColor: '#fff' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, margin: 16, marginBottom: 0 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  balanceCard: { backgroundColor: '#0f172a', margin: 16, borderRadius: 16, padding: 24, elevation: 5, alignItems: 'center' },
  balanceLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  balanceAmount: { color: '#fff', fontSize: 42, fontWeight: 'bold', marginVertical: 8 },
  balanceNote: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  projectionContainer: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  projectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  projRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  projLabel: { fontSize: 14, color: '#475569' },
  projValue: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  historyContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  txnItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  txnIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnDetails: { flex: 1 },
  txnTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  txnDate: { fontSize: 12, color: '#64748b' },
  txnAmount: { fontSize: 16, fontWeight: '800' },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { apiGet } from '../../src/lib/api';

/**
 * A delivery agent's earnings.
 *
 * Every figure on this screen was a literal. It opened on an available balance
 * of ₹1,450.00 and reported ₹75 earned across 2 deliveries today, under a
 * "Withdraw to Bank" button that was a plain View — not even pressable — so a
 * rider who tried to draw that balance down simply found nothing happened.
 *
 * The transaction list named three payments that had never been made: ₹45
 * against DEL-1049, ₹30 against DEL-1042, and a ₹200 "Weekly Bonus" for a bonus
 * scheme that does not exist. A rider reconciling their bank statement against
 * this list would have been chasing ₹275 nobody owed them.
 *
 * /delivery/analytics returns the real wallet balance, today's completed runs
 * and the wallet ledger behind them.
 */
export default function AgentEarnings() {
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
      // A rider without a delivery profile gets a 404 here, which is a
      // different problem from the server being unreachable.
      setError(err?.message || 'Could not load your earnings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const transactions = (data?.transactions ?? []).map((t, i) => ({
    id: t.id ?? i,
    type: t.purpose || (String(t.transaction_type || '').toLowerCase() === 'credit' ? 'Credit' : 'Debit'),
    credit: String(t.transaction_type || '').toLowerCase() === 'credit',
    amount: Number(t.amount) || 0,
    date: t.created_at
      ? new Date(t.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      : '',
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><Text style={styles.title}>💰 My Earnings</Text></View>
        <View style={styles.centre}><ActivityIndicator size="large" color="#10b981" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 My Earnings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} />}
      >
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Available Balance</Text>
          <Text style={styles.summaryValue}>{money(data?.wallet?.balance)}</Text>
          {/* Was a "Withdraw to Bank" button with no handler and no endpoint
              behind it. There is no self-serve withdrawal yet, so the screen
              says what actually happens instead of offering a control that
              does nothing. */}
          <Text style={styles.summaryNote}>Settled to your registered bank account</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Today&apos;s Earnings</Text>
            <Text style={styles.statValue}>{money(data?.todayAnalytics?.total_earnings)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Deliveries Today</Text>
            <Text style={styles.statValue}>{Number(data?.todayAnalytics?.total_deliveries) || 0}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Lifetime Earnings</Text>
            <Text style={styles.statValue}>{money(data?.lifetime?.total_earnings)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Lifetime Deliveries</Text>
            <Text style={styles.statValue}>{Number(data?.lifetime?.total_deliveries) || 0}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No wallet activity yet. Payments for completed deliveries will be listed here.
            </Text>
          </View>
        ) : transactions.map((txn) => (
          <View key={txn.id} style={styles.txnCard}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.txnType} numberOfLines={2}>{txn.type}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txnAmount, !txn.credit && styles.txnDebit]}>
                {txn.credit ? '+' : '−'}{money(txn.amount)}
              </Text>
              <Text style={styles.txnDate}>{txn.date}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { padding: 15 },

  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 15 },
  errorText: { color: '#b91c1c', fontSize: 13 },

  summaryCard: { backgroundColor: '#10b981', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  summaryLabel: { color: '#ecfdf5', fontSize: 14, fontWeight: 'bold' },
  summaryValue: { color: '#0f172a', fontSize: 36, fontWeight: 'bold', marginVertical: 10 },
  summaryNote: { color: '#ecfdf5', fontSize: 12, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#ffffff', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { color: '#64748b', fontSize: 12, marginBottom: 5 },
  statValue: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },

  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  emptyCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  txnCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  txnType: { color: '#0f172a', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  txnAmount: { color: '#10b981', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  txnDebit: { color: '#ef4444' },
  txnDate: { color: '#64748b', fontSize: 11 },
});

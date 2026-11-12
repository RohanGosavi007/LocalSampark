import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { getCash, settleCash } from '../services/rider';

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
// The entry types the server writes (delivery.controller completeJob, the
// admin cash-deposit route and /delivery/cash/settle). A wallet settlement is a
// 'deposited' entry whose note says so.
const LABEL = { collected: 'Cash collected', deposited: 'Deposited' };

/**
 * Cash the rider is holding from cash-on-delivery orders (R5).
 *
 * The server stops a rider going online once this reaches the limit, and until
 * now the app gave them no way to see the figure: going online simply failed.
 * The card shows what they hold, the limit, the entries behind it, and lets
 * them settle from wallet earnings instead of travelling to hand cash in.
 */
export default function RiderCashCard({ onSettled }) {
  const [cash, setCash] = useState(null);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCash(await getCash());
      setError(null);
    } catch (err) {
      setError(err?.message || 'Could not load the cash you are holding.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const settle = async () => {
    setBusy(true);
    try {
      await settleCash(amount);
      setAmount('');
      await load();
      if (onSettled) onSettled();
      Alert.alert('Settled', 'The amount was paid from your wallet.');
    } catch (err) {
      Alert.alert('Not settled', err?.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <View style={styles.card}><Text style={styles.error}>{error}</Text></View>;
  if (!cash) return <View style={styles.card}><ActivityIndicator color="#f59e0b" /></View>;

  return (
    <View style={[styles.card, cash.isBlocked && styles.blocked]} testID="rider-cash">
      <Text style={styles.label}>Cash in hand (COD)</Text>
      <Text style={styles.value}>{money(cash.cashInHand)}</Text>
      {cash.limit > 0 ? (
        <Text style={styles.note}>
          {cash.isBlocked
            ? `At the ${money(cash.limit)} limit: deposit or settle before going online.`
            : `Limit ${money(cash.limit)}`}
        </Text>
      ) : null}

      {cash.cashInHand > 0 ? (
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="Amount"
            placeholderTextColor="#94a3b8"
            accessibilityLabel="Amount to settle from wallet"
          />
          <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} disabled={busy} onPress={settle}>
            <Text style={styles.btnText}>{busy ? '…' : 'Settle from wallet'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {cash.ledger.slice(0, 5).map((e) => (
        <View key={e.id} style={styles.entry}>
          <Text style={styles.entryText}>
            {LABEL[e.entry_type] || e.entry_type}{e.order_id ? ` · #${String(e.order_id).slice(0, 8)}` : ''}{e.note ? ` · ${e.note}` : ''}
          </Text>
          <Text style={styles.entryAmount}>{money(e.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', padding: 16, borderRadius: 12, marginBottom: 20 },
  blocked: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  label: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  value: { color: '#0f172a', fontSize: 28, fontWeight: 'bold', marginVertical: 6 },
  note: { color: '#92400e', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  error: { color: '#b91c1c', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, color: '#0f172a' },
  btn: { backgroundColor: '#f59e0b', paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 },
  btnText: { color: '#0f172a', fontWeight: 'bold' },
  entry: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  entryText: { color: '#334155', fontSize: 13 },
  entryAmount: { color: '#0f172a', fontWeight: '600', fontSize: 13 },
});

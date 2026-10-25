import React, { useState, useEffect, useCallback } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../../src/lib/api';

// Pay a bill from the wallet through POST /bills/pay. This screen used to list four invented
// bills (an electricity board, a gas company, a named society, a water tax) with made-up due
// dates and amounts, start from a fixed ₹4,820 balance, and "pay" by subtracting from local
// state. There is no biller integration yet: the server takes the amount from the wallet and
// records the payment as "processing" for an operator to settle, and this screen says so.
const CATEGORIES = ['Electricity', 'Gas', 'Water', 'Society maintenance', 'Broadband', 'Mobile'];
const STATUS_LABEL = { processing: 'Processing', completed: 'Paid', failed: 'Failed' };

function BillsModule() {
  const [available, setAvailable] = useState(null);
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, w, h] = await Promise.all([
        apiGet('/bills/status').catch(() => ({ available: false })),
        apiGet('/wallet/history').catch(() => null),
        apiGet('/bills/history'),
      ]);
      setAvailable(Boolean(s && s.available));
      setBalance(w && typeof w.balance === 'number' ? w.balance : null);
      setHistory(Array.isArray(h) ? h : (h && (h.data || h.rows)) || []);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load your bills.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = Number(amount);
  const valid = provider.trim().length > 0 && Number.isFinite(value) && value >= 1;

  const pay = () => {
    if (!valid || paying) return;
    Alert.alert('Confirm payment', `Pay ₹${value} to ${provider.trim()} from your wallet?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay',
        onPress: async () => {
          setPaying(true);
          try {
            await apiPost('/bills/pay', { provider: provider.trim(), amount: value });
            setProvider('');
            setAmount('');
            await load();
            Alert.alert('Payment received', 'The amount was taken from your wallet. It shows as Processing until the biller is paid.');
          } catch (e) {
            Alert.alert('Not paid', e.message || 'Your payment could not be made. Nothing was charged.');
          } finally {
            setPaying(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🧾 Pay Bills</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <>
            {error && <Text style={styles.error}>{error}</Text>}
            {balance !== null && <Text style={styles.balance}>Wallet balance: ₹{balance}</Text>}

            {available === false ? (
              <View style={styles.card}><Text style={styles.sub}>Bill payments are not open yet. Nothing on this screen will charge you.</Text></View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.label}>Biller</Text>
                <TextInput style={styles.input} value={provider} onChangeText={setProvider} placeholder="Who are you paying?" maxLength={80} />
                <View style={styles.chips}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity key={c} style={styles.chip} onPress={() => setProvider(c)}><Text style={styles.chipText}>{c}</Text></TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
                <TouchableOpacity style={[styles.btn, (!valid || paying) && styles.btnOff]} disabled={!valid || paying} onPress={pay}>
                  <Text style={styles.btnText}>{paying ? 'Paying…' : 'Pay from wallet'}</Text>
                </TouchableOpacity>
                <Text style={styles.note}>Payments are settled with the biller by our team, so they show as Processing first.</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Your payments</Text>
            {history.length === 0 ? (
              <Text style={styles.sub}>No bill payments yet.</Text>
            ) : history.map((b) => (
              <View key={b.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{b.provider}</Text>
                  <Text style={styles.sub}>{b.created_at ? new Date(b.created_at).toLocaleDateString() : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.rowTitle}>₹{b.amount}</Text>
                  <Text style={styles.sub}>{STATUS_LABEL[b.status] || b.status}</Text>
                </View>
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
  balance: { fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { backgroundColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }, chipText: { color: '#334155' },
  btn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  btnOff: { backgroundColor: '#94a3b8' }, btnText: { color: '#fff', fontWeight: 'bold' },
  note: { color: '#64748b', fontSize: 12, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 20, marginBottom: 10 },
  row: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  rowTitle: { fontWeight: 'bold', color: '#0f172a' },
  sub: { color: '#64748b' },
  error: { color: '#dc2626', fontWeight: '600', marginBottom: 8 },
});

export default withRoleGuard(BillsModule, 'bills');

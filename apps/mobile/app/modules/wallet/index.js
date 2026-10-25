import { apiGet } from '../../../src/lib/api';
import { getPaymentConfig, topUpWallet } from '../../../src/lib/payments';
import { useAuth } from '../../../src/context/AuthContext';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const MIN_TOPUP = 10;
const MAX_TOPUP = 50000;

/**
 * The wallet: balance, ledger and top-up.
 *
 * Adding money is a Razorpay payment. The server opens it for the amount
 * entered, Razorpay Checkout collects it, and the wallet is credited by the
 * server once it has verified the result — this screen then reloads the
 * balance from the server rather than adding to it itself.
 *
 * It used to POST the amount to /wallet/topup, which credited the wallet with
 * no payment at all, and read the ledger with a token key that is never set
 * and field names the API does not return, so the history was always empty.
 */
export default function WalletScreen() {
  const { user, refreshWallet } = useAuth();
  const [balance, setBalance] = useState(0);
  const [amountInput, setAmountInput] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [paying, setPaying] = useState(false);
  const [onlineAvailable, setOnlineAvailable] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const data = await apiGet('/wallet/history');
      setBalance(Number(data?.balance) || 0);
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setLoadError('');
    } catch (e) {
      setLoadError(e?.message || 'Could not load your wallet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
    getPaymentConfig().then(config => setOnlineAvailable(config.enabled));
  }, [fetchWallet]);

  const handleAddMoney = async () => {
    const amt = Number(amountInput);
    if (!Number.isFinite(amt) || amt < MIN_TOPUP || amt > MAX_TOPUP) {
      Alert.alert('Enter an amount', `You can add between ₹${MIN_TOPUP} and ₹${MAX_TOPUP}.`);
      return;
    }

    setPaying(true);
    try {
      await topUpWallet(amt, {
        prefill: { contact: user?.phone_number || user?.phone || '', name: user?.full_name || user?.name || '' },
      });
      setAmountInput('');
      await fetchWallet();
      if (refreshWallet) refreshWallet();
      Alert.alert('Money added', `₹${amt} has been added to your wallet.`);
    } catch (e) {
      if (e.code !== 'DISMISSED') {
        Alert.alert(
          e.code === 'PAYMENTS_UNAVAILABLE' || e.code === 'CHECKOUT_UNAVAILABLE' ? 'Not available' : 'Payment failed',
          e.message
        );
      }
      // A payment that went through at the bank but could not be confirmed
      // here is credited by the server when Razorpay notifies it.
      fetchWallet();
    }
    setPaying(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👛 Local Wallet</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <LinearGradient
          colors={['#4f46e5', '#312e81']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          {loading
            ? <ActivityIndicator color="#fff" style={{ alignSelf: 'flex-start', marginVertical: 14 }} />
            : <Text style={styles.balanceValue}>{loadError ? '—' : `₹${balance.toFixed(2)}`}</Text>}
          {!!loadError && <Text style={styles.secureText}>{loadError}</Text>}
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Money</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
              editable={!paying}
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, (!onlineAvailable || paying) && { opacity: 0.5 }]}
            onPress={handleAddMoney}
            disabled={!onlineAvailable || paying}
          >
            {paying
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Add Money via UPI / Card</Text>}
          </TouchableOpacity>
          {!onlineAvailable && (
            <Text style={styles.noteText}>Adding money online is not available right now.</Text>
          )}
        </View>

        <View style={[styles.card, { marginTop: 24, padding: 0 }]}>
          <Text style={[styles.cardTitle, { padding: 16 }]}>Transaction History</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>{loading ? 'Loading…' : 'No transactions yet'}</Text>
          ) : (
            transactions.map(t => {
              // The ledger has recorded a debit both as a positive amount with
              // type 'debit' and as a negative amount; read either.
              const amount = Number(t.amount) || 0;
              const credit = String(t.type || '').toLowerCase() === 'credit' && amount >= 0;
              return (
                <View key={t.id} style={styles.transactionRow}>
                  <View style={styles.txInfo}>
                    <Text style={styles.txPurpose}>{String(t.purpose || t.description || 'Wallet transaction').replace(/_/g, ' ')}</Text>
                    <Text style={styles.txDate}>
                      {t.created_at ? new Date(t.created_at).toLocaleString() : ''}
                      {t.status ? ` | ${t.status}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: credit ? '#10b981' : '#334155' }]}>
                    {credit ? '+' : '-'}₹{Math.abs(amount).toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16 },

  balanceCard: { padding: 24, borderRadius: 16, marginBottom: 24, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  balanceValue: { color: '#fff', fontSize: 40, fontWeight: '900', marginBottom: 16 },
  secureText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noteText: { color: '#64748b', fontSize: 12, marginTop: 10, textAlign: 'center' },

  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderColor: '#f1f5f9' },
  txInfo: { flex: 1 },
  txPurpose: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4, textTransform: 'capitalize' },
  txDate: { fontSize: 12, color: '#64748b' },
  txAmount: { fontSize: 16, fontWeight: '800' },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 24, fontStyle: 'italic' }
});

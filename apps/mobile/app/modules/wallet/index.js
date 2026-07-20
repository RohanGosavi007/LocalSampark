import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { API_V1 } from '../../config/api';
export default function WalletScreen() {
  const [balance, setBalance] = useState(0.00);
  const [amountInput, setAmountInput] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/wallet/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.transactions) {
        setBalance(data.balance);
        setTransactions(data.transactions.map(t => ({
          id: t.id,
          type: t.transaction_type,
          purpose: t.description,
          amount: `₹${Math.abs(t.amount).toFixed(2)}`,
          date: new Date(t.created_at).toLocaleString(),
          status: 'Success'
        })));
      }
    } catch (e) { console.error(e); }
  };

  const handleAddMoney = async () => {
    const amt = parseFloat(amountInput);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await apiPost('/wallet/topup', { amount: amt });
      if (data.success) {
        Alert.alert('Success', `₹${amt} added to your wallet!`);
        setAmountInput('');
        fetchWallet();
      } else {
        Alert.alert('Error', 'Failed to add funds.');
      }
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👛 Local Wallet</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Balance Display with Linear Gradient */}
        <LinearGradient
          colors={['#4f46e5', '#312e81']}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceValue}>₹{balance.toFixed(2)}</Text>
          <Text style={styles.secureText}>🔒 Secure 256-bit SSL connection</Text>
        </LinearGradient>

        {/* Load Funds */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Load Funds</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
            />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAddMoney}>
            <Text style={styles.primaryBtnText}>Add Funds via UPI / Card</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <View style={[styles.card, { marginTop: 24, padding: 0 }]}>
          <Text style={[styles.cardTitle, { padding: 16 }]}>Transaction History</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No recent transactions</Text>
          ) : (
            transactions.map(t => (
              <View key={t.id} style={styles.transactionRow}>
                <View style={styles.txInfo}>
                  <Text style={styles.txPurpose}>{t.purpose}</Text>
                  <Text style={styles.txDate}>{t.date} | Status: <Text style={styles.txStatus}>{t.status}</Text></Text>
                </View>
                <Text style={[styles.txAmount, { color: t.type === 'credit' ? '#10b981' : '#334155' }]}>
                  {t.type === 'credit' ? '+' : '-'}{t.amount}
                </Text>
              </View>
            ))
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

  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderColor: '#f1f5f9' },
  txInfo: { flex: 1 },
  txPurpose: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  txDate: { fontSize: 12, color: '#64748b' },
  txStatus: { color: '#10b981', fontWeight: '600' },
  txAmount: { fontSize: 16, fontWeight: '800' },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 24, fontStyle: 'italic' }
});

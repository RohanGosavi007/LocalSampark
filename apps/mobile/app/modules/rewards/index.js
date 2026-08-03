import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';

import { API_V1 } from '../../config/api';
export default function MobileRewards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  const fetchBalance = async () => {
    try {
      const data = await apiGet('/loyalty/balance');
      if (data && !data.error) setData(data.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleSpin = async () => {
    setSpinning(true);
    // Simulate wheel spin animation delay
    setTimeout(async () => {
      try {
        const result = await apiPost('/loyalty/spin');
        setSpinning(false);
        Alert.alert('Fortune Wheel', result.message);
        fetchBalance(); // Refresh balance
      } catch (err) {
        setSpinning(false);
        Alert.alert('Error', 'Failed to spin the wheel.');
      }
    }, 2000);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Rewards & Gamification</Text>

      {/* Ledger Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>SamparkCoins Balance</Text>
        <Text style={styles.balance}>🪙 {data?.totalCoins || 0}</Text>
        <Text style={styles.subBalance}>≈ ₹{data?.equivalentRupees || 0} Wallet Balance</Text>
        
        <TouchableOpacity style={styles.redeemBtn} onPress={() => Alert.alert('Redeem', 'Convert 100 coins to ₹10?')}>
          <Text style={styles.redeemText}>Convert to Wallet</Text>
        </TouchableOpacity>
      </View>

      {/* Fortune Wheel Card */}
      <View style={styles.wheelCard}>
        <Text style={styles.cardTitle}>Daily Fortune Wheel</Text>
        <Text style={styles.wheelDesc}>Spin once a day to win up to 500 SamparkCoins instantly!</Text>
        
        <View style={styles.wheelVisual}>
          <Text style={styles.wheelEmoji}>{spinning ? '🎡 (Spinning...)' : '🎡'}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.spinBtn, spinning && styles.spinBtnDisabled]} 
          onPress={handleSpin}
          disabled={spinning}
        >
          <Text style={styles.spinText}>{spinning ? 'Spinning...' : 'SPIN NOW'}</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction History */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent History</Text>
        {data?.recentTransactions?.map((tx, idx) => (
          <View key={idx} style={styles.txRow}>
            <View>
              <Text style={styles.txSource}>{tx.source}</Text>
              <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.type === 'earned' ? '#34d399' : '#f87171' }]}>
              {tx.type === 'earned' ? '+' : '-'} {tx.amount} 🪙
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fbbf24', marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
  balance: { fontSize: 36, fontWeight: 'bold', color: '#fbbf24', marginBottom: 5 },
  subBalance: { color: '#34d399', fontSize: 14, fontWeight: '600', marginBottom: 20 },
  redeemBtn: { backgroundColor: '#f59e0b', padding: 12, borderRadius: 10, alignItems: 'center' },
  redeemText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
  
  wheelCard: { backgroundColor: '#312e81', borderRadius: 15, padding: 20, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#4338ca' },
  wheelDesc: { color: '#a5b4fc', textAlign: 'center', marginBottom: 20 },
  wheelVisual: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 4, borderColor: '#fbbf24' },
  wheelEmoji: { fontSize: 40 },
  spinBtn: { backgroundColor: '#fbbf24', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, shadowColor: '#fbbf24', shadowOpacity: 0.5, shadowRadius: 10 },
  spinBtnDisabled: { opacity: 0.6 },
  spinText: { color: '#f8fafc', fontWeight: '900', fontSize: 18, letterSpacing: 1 },

  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  txSource: { color: '#0f172a', fontSize: 16, fontWeight: '600' },
  txDate: { color: '#64748b', fontSize: 12, marginTop: 4 },
  txAmount: { fontSize: 16, fontWeight: 'bold' }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Alert } from 'react-native';
import { router } from 'expo-router';
import i18n from '../../../src/i18n';
import { useAuth } from '../../../src/context/AuthContext';

const { width } = Dimensions.get('window');

export default function EarningsLedger() {
  const { authToken, API_URL } = useAuth();
  const [balance, setBalance] = useState(1240.50);
  const [history, setHistory] = useState([
    { id: 'TXN001', type: 'credit', title: 'Order DEL001 Payout', amount: 45.00, date: 'Today, 2:30 PM', surge: '1.2x' },
    { id: 'TXN002', type: 'credit', title: 'Order DEL002 Payout', amount: 35.50, date: 'Today, 1:15 PM', surge: '1.0x' },
    { id: 'TXN003', type: 'credit', title: 'Rain Incentive Bonus', amount: 150.00, date: 'Yesterday, 8:00 PM', surge: '-' },
    { id: 'TXN004', type: 'debit', title: 'Bank Withdrawal', amount: 5000.00, date: 'Jul 2, 9:00 AM', surge: '-' }
  ]);

  const handleWithdraw = () => {
    Alert.alert(
      "Instant Payout",
      `Withdraw ₹${balance.toFixed(2)} to your registered bank account via RazorpayX?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: () => {
            // Mock API call
            Alert.alert("Success", "Payout initiated successfully. It should reflect in your account within 5 minutes.");
            setBalance(0);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <Text style={styles.title}>Earnings & Ledger</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Wallet Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
          <TouchableOpacity 
            style={[styles.withdrawBtn, balance <= 0 && { opacity: 0.5 }]} 
            onPress={handleWithdraw}
            disabled={balance <= 0}
          >
            <Text style={styles.withdrawText}>Withdraw Now (Instant)</Text>
          </TouchableOpacity>
        </View>

        {/* Incentive Projections */}
        <View style={styles.projectionContainer}>
          <Text style={styles.sectionTitle}>Incentive Projections</Text>
          <View style={styles.projectionCard}>
            <View style={styles.projRow}>
              <Text style={styles.projLabel}>Fuel Incentive (This Week)</Text>
              <Text style={styles.projValue}>₹340.00</Text>
            </View>
            <View style={styles.projRow}>
              <Text style={styles.projLabel}>Rain Bonus (Active)</Text>
              <Text style={styles.projValue}>+ ₹20 / order</Text>
            </View>
            <View style={styles.projRow}>
              <Text style={styles.projLabel}>Zone Surge (Viman Nagar)</Text>
              <Text style={styles.projValue}>1.5x</Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {history.map((txn, index) => (
            <View key={txn.id} style={styles.txnItem}>
              <View style={styles.txnIconBox}>
                <Text style={{ fontSize: 18 }}>{txn.type === 'credit' ? '🟢' : '🔴'}</Text>
              </View>
              <View style={styles.txnDetails}>
                <Text style={styles.txnTitle}>{txn.title}</Text>
                <Text style={styles.txnDate}>{txn.date} {txn.surge !== '-' && `• Surge: ${txn.surge}`}</Text>
              </View>
              <Text style={[styles.txnAmount, { color: txn.type === 'credit' ? '#10b981' : '#ef4444' }]}>
                {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16, backgroundColor: '#fff' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  balanceCard: { backgroundColor: '#0f172a', margin: 16, borderRadius: 16, padding: 24, elevation: 5, alignItems: 'center' },
  balanceLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  balanceAmount: { color: '#fff', fontSize: 42, fontWeight: 'bold', marginVertical: 8 },
  withdrawBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 12 },
  withdrawText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  projectionContainer: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  projectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  projRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  projLabel: { fontSize: 14, color: '#475569' },
  projValue: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  historyContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  txnItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  txnIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txnDetails: { flex: 1 },
  txnTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  txnDate: { fontSize: 12, color: '#64748b' },
  txnAmount: { fontSize: 16, fontWeight: '800' }
});

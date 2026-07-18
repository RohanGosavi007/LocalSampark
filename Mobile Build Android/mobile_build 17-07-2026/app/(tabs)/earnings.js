import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export default function AgentEarnings() {
  const transactions = [
    { id: 1, type: 'Delivery Payout', order: 'DEL-1049', amount: '+₹45', date: 'Today, 2:15 PM' },
    { id: 2, type: 'Delivery Payout', order: 'DEL-1042', amount: '+₹30', date: 'Today, 11:30 AM' },
    { id: 3, type: 'Weekly Bonus', order: 'BONUS-01', amount: '+₹200', date: 'Yesterday' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 My Earnings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Available Balance</Text>
          <Text style={styles.summaryValue}>₹1,450.00</Text>
          <View style={styles.withdrawBtn}>
            <Text style={styles.withdrawBtnText}>Withdraw to Bank</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={styles.statValue}>₹75</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Deliveries Today</Text>
            <Text style={styles.statValue}>2</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.map(txn => (
          <View key={txn.id} style={styles.txnCard}>
            <View>
              <Text style={styles.txnType}>{txn.type}</Text>
              <Text style={styles.txnOrder}>{txn.order}</Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.txnAmount}>{txn.amount}</Text>
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
  
  content: { padding: 15 },
  
  summaryCard: { backgroundColor: '#10b981', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  summaryLabel: { color: '#ecfdf5', fontSize: 14, fontWeight: 'bold' },
  summaryValue: { color: '#0f172a', fontSize: 36, fontWeight: 'bold', marginVertical: 10 },
  withdrawBtn: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  withdrawBtnText: { color: '#047857', fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#ffffff', padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { color: '#64748b', fontSize: 12, marginBottom: 5 },
  statValue: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },

  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  txnCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  txnType: { color: '#0f172a', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  txnOrder: { color: '#64748b', fontSize: 12 },
  txnAmount: { color: '#10b981', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  txnDate: { color: '#64748b', fontSize: 11 },
});

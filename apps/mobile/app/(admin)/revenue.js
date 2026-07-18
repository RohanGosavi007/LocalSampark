import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export default function MobileAdminRevenue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch for admin revenue on mobile
    setTimeout(() => {
      setData({
        revenueBreakdown: [
          { revenue_stream: 'Order Commission', estimated_revenue: '45000', total_transactions: '1240' },
          { revenue_stream: 'Carpool Booking Fees', estimated_revenue: '12500', total_transactions: '420' }
        ],
        historicalProjections: [
          { month: 'Jan', revenue: 150000, payouts: 90000 },
          { month: 'Feb', revenue: 180000, payouts: 105000 }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{ color: '#64748b', marginTop: 10 }}>Loading Projections...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Financial Projections</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Revenue Breakdown</Text>
        {data.revenueBreakdown.map((item, idx) => (
          <View key={idx} style={styles.row}>
            <View>
              <Text style={styles.streamName}>{item.revenue_stream}</Text>
              <Text style={styles.txCount}>{item.total_transactions} Transactions</Text>
            </View>
            <Text style={styles.amount}>₹{item.estimated_revenue}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.exportBtn}>
        <Text style={styles.exportText}>📥 Export CSV (Tally/QB)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#34d399', marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 15, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  streamName: { color: '#34d399', fontSize: 16, fontWeight: 'bold' },
  txCount: { color: '#64748b', fontSize: 12, marginTop: 4 },
  amount: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  exportBtn: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 10, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.5, shadowRadius: 10 },
  exportText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});

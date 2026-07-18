import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function BillsTab({ role }) {
  const [bills] = useState([
    { id: 1, month: 'Jun 2026', type: 'Maintenance', amount: '₹2,500', dueDate: '15 Jun 2026', status: 'Paid' },
    { id: 2, month: 'Jul 2026', type: 'Maintenance + Water', amount: '₹3,200', dueDate: '15 Jul 2026', status: 'Unpaid' }
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Generate Society Bills</Text>
          <Text style={styles.subtitle}>Select block and auto-generate maintenance invoices for all residents.</Text>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Generate July Bills</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>My Dues & Invoices</Text>
        {bills.map(bill => (
          <View key={bill.id} style={styles.billRow}>
            <View style={{flex: 1}}>
              <Text style={styles.billTitle}>{bill.month} - {bill.type}</Text>
              <Text style={styles.billMeta}>Due: {bill.dueDate}</Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.billAmount}>{bill.amount}</Text>
              <View style={[styles.badge, bill.status === 'Paid' ? styles.badgeSuccess : styles.badgeDanger]}>
                <Text style={[styles.badgeText, bill.status === 'Paid' ? styles.badgeSuccessText : styles.badgeDangerText]}>
                  {bill.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 16 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  billTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  billMeta: { color: '#64748b', fontSize: 12 },
  billAmount: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  badgeSuccessText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  badgeDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
  badgeDangerText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold' }
});

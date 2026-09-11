import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { apiGet } from '../../../../src/lib/api';

/**
 * Two maintenance bills were hardcoded — ₹2,500 marked paid and ₹3,200 due on
 * 15 July. A resident could have paid a bill they did not owe, or seen "Paid"
 * against one they did. /society-billing/my-bills is the real ledger.
 */
export default function BillsTab({ role }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet('/society-billing/my-bills');
        const rows = res?.bills ?? res?.data ?? (Array.isArray(res) ? res : []);
        setBills(
          rows.map((b) => ({
            id: String(b.id),
            month: b.billing_period || b.month || '',
            type: b.bill_type || b.type || 'Maintenance',
            amount: `₹${(Number(b.amount) || 0).toLocaleString('en-IN')}`,
            dueDate: b.due_date
              ? new Date(b.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
              : '',
            status: String(b.status || 'unpaid').toLowerCase() === 'paid' ? 'Paid' : 'Unpaid',
          }))
        );
      } catch (err) {
        setBills([]);
        setError(err?.message || 'Could not load your bills.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        {loading ? (
          <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
        ) : bills.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>
              {error ? 'Could not load your bills' : 'Nothing due'}
            </Text>
            <Text style={styles.stateBody}>
              {error || 'Maintenance invoices raised for your flat will appear here.'}
            </Text>
          </View>
        ) : bills.map(bill => (
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
  stateBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
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

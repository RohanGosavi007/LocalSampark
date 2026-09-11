import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiGet, apiPut } from '../../src/lib/api';

export default function PayoutsScreen() {
  /**
   * Four invented withdrawal requests sat here — ₹24,500 to "Rahul Desai (Pune
   * East)", ₹45,000 to "Amit Singh (NCR Central)", and two shop payouts —
   * ₹80,800 of money movement between people who do not exist.
   *
   * Approve and Reject confirmed the action, played a success haptic and changed
   * a value in React state. Nothing was sent anywhere. An administrator could
   * work through this queue believing they had released payments, and the
   * partners waiting on them would never be paid.
   *
   * GET /admin/payouts/pending lists the real requests and
   * PUT /admin/payouts/:id/approve releases one.
   */
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/admin/payouts/pending');
      const rows = res?.data ?? [];
      setPayouts(
        rows.map((p) => ({
          id: String(p.id),
          payee: p.payee || 'Payee',
          type: p.type || '',
          amount: Number(p.amount) || 0,
          date: p.date ? new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          status: p.status
            ? p.status.charAt(0).toUpperCase() + p.status.slice(1).toLowerCase()
            : 'Pending',
        }))
      );
    } catch (err) {
      setPayouts([]);
      setError(err?.message || 'Could not load payout requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = (id, action) => {
    Haptics.impactAsync(action === 'Approved' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy);

    // Only approval has an endpoint. Offering a Reject button that quietly does
    // nothing is how the previous version misled its user, so it says so.
    if (action === 'Rejected') {
      Alert.alert(
        'Rejection is not available yet',
        'There is no endpoint to reject a payout. Leave it pending and settle it outside the app for now.'
      );
      return;
    }

    Alert.alert(
      'Approve payout',
      `Release ${id} for payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setBusyId(id);
            try {
              await apiPut(`/admin/payouts/${id}/approve`, {});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await load({ isRefresh: true });
            } catch (err) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Not approved', err?.message || 'The payout was not released. Try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Pending': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
      case 'Approved': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'Rejected': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
      default: return { bg: '#334155', color: '#0f172a' };
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Payout Management', 
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#fff'
      }} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#f59e0b" />
        }
      >
        <Text style={styles.headerTitle}>Withdrawal Requests</Text>
        <Text style={styles.headerDesc}>Review and approve partner payout requests.</Text>

        {loading ? (
          <View style={styles.stateBox}><ActivityIndicator color="#f59e0b" /></View>
        ) : payouts.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>
              {error ? 'Could not load payout requests' : 'Nothing pending'}
            </Text>
            <Text style={styles.stateBody}>
              {error || 'Withdrawal requests awaiting approval will appear here.'}
            </Text>
            {error ? (
              <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : payouts.map((p) => {
          const s = getStatusStyle(p.status);
          
          return (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.payId}>{p.id}</Text>
                  <Text style={styles.payDate}>{p.date}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.statusText, { color: s.color }]}>{p.status}</Text>
                </View>
              </View>

              <Text style={styles.payee}>{p.payee}</Text>
              
              <View style={styles.detailsRow}>
                <Text style={styles.typeTag}>{p.type}</Text>
                <Text style={styles.amount}>₹{p.amount.toLocaleString()}</Text>
              </View>

              {p.status === 'Pending' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} 
                    onPress={() => handleAction(p.id, 'Rejected')}
                  >
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }, busyId === p.id && { opacity: 0.5 }]}
                    disabled={busyId === p.id}
                    onPress={() => handleAction(p.id, 'Approved')}
                  >
                    {busyId === p.id ? (
                      <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                      <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 18, backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  headerDesc: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  payId: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  payDate: { color: '#64748b', fontSize: 12, marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  
  payee: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  typeTag: { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: '600' },
  amount: { color: '#0f172a', fontSize: 24, fontWeight: 'bold' },
  
  actionsRow: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 16 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontWeight: 'bold', fontSize: 14 }
});

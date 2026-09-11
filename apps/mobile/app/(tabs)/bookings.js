import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { apiGet, apiPut } from '../../src/lib/api';

/**
 * Service provider's booking list.
 *
 * Two invented jobs — "BK-9021, Plumbing Repair for Vikram Singh at B-Wing Park
 * Springs, ₹450" and "BK-9018, AC Servicing for Anita Deshmukh, ₹799" — with
 * named customers at specific addresses. Accept, Reject and Mark as Completed
 * each popped "Success — Booking Accepted successfully!" and changed a value in
 * React state: the customer was never told, and nothing was recorded.
 *
 * Bookings come from /shops/my-shop/appointments and transitions go through
 * /shops/my-shop/appointments/:id/status. Both were querying a Prisma model
 * mapped to a table no migration creates until this round, so this list has
 * never had real data to show.
 */
const LABEL = {
  pending: 'Pending',
  confirmed: 'Accepted',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Rejected',
  no_show: 'No show',
};

export default function ServiceBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/shops/my-shop/appointments');
      const rows = res?.appointments ?? [];
      setBookings(
        rows.map((a) => {
          const when = a.appointment_date ? new Date(a.appointment_date) : null;
          const day = when && !Number.isNaN(when.getTime())
            ? when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
            : '';
          const price = Number(a.final_price ?? a.service_price);
          return {
            id: String(a.id),
            service: a.service_name || 'Service',
            // A booking taken over the counter may have no linked account.
            customer: a.customer_name || 'Customer',
            // Rendered only when present; the mock always had an address.
            address: a.customer_notes || null,
            date: [day, a.time_slot].filter(Boolean).join(', '),
            status: String(a.status || 'pending').toLowerCase(),
            price: Number.isFinite(price) && price > 0 ? `₹${price}` : null,
          };
        })
      );
    } catch (err) {
      setBookings([]);
      setError(err?.message || 'Could not load your bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (booking, status) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBusyId(booking.id);
    try {
      await apiPut(`/shops/my-shop/appointments/${booking.id}/status`, { status });
      await load({ isRefresh: true });
    } catch (err) {
      // Previously every action reported success regardless.
      Alert.alert('Not saved', err?.message || 'The booking was not updated. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 My Bookings</Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#3b82f6" />
          }
        >
          {bookings.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {error ? 'Could not load your bookings' : 'No bookings yet'}
              </Text>
              <Text style={styles.stateBody}>
                {error || 'Jobs customers book with you will appear here.'}
              </Text>
              {error ? (
                <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : bookings.map(bk => {
            const busy = busyId === bk.id;
            return (
              <View key={bk.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.bookingId}>#{bk.id.slice(0, 8)}</Text>
                  <Text style={[styles.statusTag, bk.status === 'confirmed' && styles.statusTagAccepted]}>
                    {LABEL[bk.status] || bk.status}
                  </Text>
                </View>

                <Text style={styles.serviceName}>{bk.service}</Text>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>👤 {bk.customer}</Text>
                  {bk.address ? <Text style={styles.infoText}>📍 {bk.address}</Text> : null}
                  {bk.date ? <Text style={styles.infoText}>🕒 {bk.date}</Text> : null}
                  {bk.price ? <Text style={styles.infoText}>💰 {bk.price}</Text> : null}
                </View>

                {bk.status === 'pending' && (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnReject, busy && { opacity: 0.5 }]}
                      disabled={busy}
                      onPress={() => handleAction(bk, 'cancelled')}
                    >
                      <Text style={styles.btnRejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnAccept, busy && { opacity: 0.5 }]}
                      disabled={busy}
                      onPress={() => handleAction(bk, 'confirmed')}
                    >
                      {busy ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.btnAcceptText}>Accept Job</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {bk.status === 'confirmed' && (
                  <TouchableOpacity
                    style={[styles.btnComplete, busy && { opacity: 0.5 }]}
                    disabled={busy}
                    onPress={() => handleAction(bk, 'in_progress')}
                  >
                    {busy ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.btnCompleteText}>Start Job</Text>}
                  </TouchableOpacity>
                )}

                {bk.status === 'in_progress' && (
                  <TouchableOpacity
                    style={[styles.btnComplete, busy && { opacity: 0.5 }]}
                    disabled={busy}
                    onPress={() => handleAction(bk, 'completed')}
                  >
                    {busy ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.btnCompleteText}>Mark as Completed</Text>}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },

  content: { padding: 15 },
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bookingId: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  statusTag: { color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  statusTagAccepted: { backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981' },
  serviceName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },

  infoBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, marginBottom: 15 },
  infoText: { color: '#475569', marginBottom: 5 },

  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnReject: { borderWidth: 1, borderColor: '#ef4444' },
  btnRejectText: { color: '#ef4444', fontWeight: 'bold' },
  btnAccept: { backgroundColor: '#3b82f6' },
  // Was #0f172a — near-black text on a blue button, and white on green below.
  btnAcceptText: { color: '#ffffff', fontWeight: 'bold' },

  btnComplete: { backgroundColor: '#10b981', minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnCompleteText: { color: '#ffffff', fontWeight: 'bold' },

  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', margin: 15 },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});

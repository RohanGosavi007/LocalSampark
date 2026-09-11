import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { apiGet, apiPost } from '../../src/lib/api';

/**
 * The rider's current delivery.
 *
 * This screen opened on an invented job — "DEL-1049, pickup Sharma Grocery, drop
 * Flat 402 Goodwill Society, customer 9876543210" — that no rider had accepted,
 * with a phone number belonging to nobody. Completing it announced "Delivery
 * Successful! Earnings (₹45) added to your wallet" having called no API: no
 * order was closed, no customer was notified, and no money moved. The rider's
 * next look at their wallet would show none of it.
 *
 * The OTP field only checked that four characters had been typed. That was true
 * on the server too — completeJob measured the OTP's length and never compared
 * it — so any four digits closed a delivery. Both ends now verify the real
 * handover code stored on the order.
 */
export default function ActiveOrders() {
  const [job, setJob] = useState(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/delivery/my-jobs');
      const jobs = res?.data ?? [];
      setJob(jobs[0] || null);
      setOtp('');
    } catch (err) {
      setJob(null);
      setError(err?.message || 'Could not load your active delivery.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markPickedUp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubmitting(true);
    try {
      await apiPost(`/delivery/jobs/${job.id}/status`, { status: 'out_for_delivery' });
      await load({ isRefresh: true });
    } catch (err) {
      Alert.alert('Not updated', err?.message || 'The status change was not saved.');
    } finally {
      setSubmitting(false);
    }
  };

  const completeDelivery = async () => {
    if (otp.trim().length < 4) {
      Alert.alert('Enter the code', 'Ask the customer for the handover code shown in their app.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubmitting(true);
    try {
      const res = await apiPost(`/delivery/jobs/${job.id}/complete`, { otp: otp.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const earned = Number(res?.data?.earnings) || 0;
      Alert.alert(
        'Delivery completed',
        earned > 0
          ? `₹${earned} has been credited to your wallet.`
          : 'The delivery has been marked complete.'
      );
      await load({ isRefresh: true });
    } catch (err) {
      // A wrong code now fails, where before any four digits succeeded.
      Alert.alert('Not completed', err?.message || 'The handover code was not accepted.');
    } finally {
      setSubmitting(false);
    }
  };

  const inTransit = String(job?.status || '').toLowerCase() === 'out_for_delivery';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚚 Active Delivery</Text>
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
          {!job ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {error ? 'Could not load your delivery' : 'No active delivery'}
              </Text>
              <Text style={styles.stateBody}>
                {error || 'Accept a job from the Available tab and it will appear here.'}
              </Text>
              {error ? (
                <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>#{String(job.id).slice(0, 8)}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{inTransit ? 'Picked up' : 'Assigned'}</Text>
                </View>
              </View>

              <Text style={styles.earnings}>₹{Number(job.earnings) || 0}</Text>

              {job.pickup ? <Text style={styles.legText}>📦 Pick up from {job.pickup}</Text> : null}
              {job.dropoff ? <Text style={styles.legText}>📍 Drop at {job.dropoff}</Text> : null}
              {job.customer_name ? <Text style={styles.legText}>👤 {job.customer_name}</Text> : null}

              {/* Rendered only when the order carries a number, and it dials. */}
              {job.customer_phone ? (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() =>
                    Linking.openURL(`tel:${job.customer_phone}`).catch(() =>
                      Alert.alert('Could not place the call', `Dial ${job.customer_phone} manually.`)
                    )
                  }
                >
                  <Text style={styles.callBtnText}>📞 Call customer</Text>
                </TouchableOpacity>
              ) : null}

              {!inTransit ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
                  disabled={submitting}
                  onPress={markPickedUp}
                >
                  {submitting ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.primaryBtnText}>Mark Picked Up</Text>}
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={styles.otpLabel}>Handover code from the customer</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="••••"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
                    disabled={submitting}
                    onPress={completeDelivery}
                  >
                    {submitting ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.primaryBtnText}>Complete Delivery</Text>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
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
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  statusBadge: { backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#3b82f6', fontSize: 12, fontWeight: '800' },
  earnings: { color: '#10b981', fontSize: 26, fontWeight: '900', marginBottom: 10 },
  legText: { color: '#475569', fontSize: 14, marginBottom: 4 },
  callBtn: { marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  callBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  otpLabel: { color: '#64748b', fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  otpInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 22, letterSpacing: 8, textAlign: 'center', color: '#0f172a', backgroundColor: '#f8fafc' },
  primaryBtn: { marginTop: 16, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', margin: 15 },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});

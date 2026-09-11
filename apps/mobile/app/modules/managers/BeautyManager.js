import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import ManagerLayout from './components/ManagerLayout';
import { apiGet } from '../../../src/lib/api';

/**
 * Salon manager — appointments.
 *
 * Two bookings were hardcoded here: "Neha Patel, Bridal Makeup, 2 Hrs, Stylist
 * Ritu, 02:00 PM" and "Anjali Desai, Hair Spa + Cut". Named clients, a named
 * stylist and specific times, shown to every salon owner as their afternoon.
 * The Assign buttons had no handlers.
 *
 * /shops/my-shop/appointments is the salon's real book. It was querying a Prisma
 * model mapped to a table no migration creates until this round, which is
 * presumably why the screen was filled in by hand.
 */
const BeautyAppointmentsTab = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/shops/my-shop/appointments');
      const rows = res?.appointments ?? [];
      setAppointments(
        rows
          .filter((a) => !['completed', 'cancelled', 'no_show'].includes(String(a.status || '').toLowerCase()))
          .map((a) => ({
            id: String(a.id),
            // A walk-in booked at the counter may have no account attached.
            client: a.customer_name || 'Customer',
            service: a.service_name || null,
            duration: Number(a.duration_minutes) || null,
            stylist: a.staff_name || null,
            time: a.time_slot || null,
          }))
      );
    } catch (err) {
      setAppointments([]);
      setError(err?.message || 'Could not load your appointments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.stateBox}><ActivityIndicator color="#ec4899" /></View>
    );
  }

  return (
    <ScrollView
      style={styles.tabContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#ec4899" />
      }
    >
      <Text style={styles.sectionTitle}>Upcoming Bookings</Text>

      {appointments.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>
            {error ? 'Could not load your appointments' : 'No upcoming bookings'}
          </Text>
          <Text style={styles.stateBody}>
            {error || 'Appointments customers book will appear here.'}
          </Text>
          {error ? (
            <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : appointments.map((a) => (
        <View key={a.id} style={styles.appointmentCard}>
          <View style={styles.detailColumn}>
            <Text style={styles.clientName}>{a.client}</Text>
            {/* Service, duration and stylist each show only when recorded. */}
            {a.service ? (
              <Text style={styles.serviceText}>
                {a.service}{a.duration ? ` • ${a.duration} mins` : ''}
              </Text>
            ) : null}
            {a.stylist ? <Text style={styles.stylistText}>Stylist: {a.stylist}</Text> : null}
          </View>
          <View style={styles.actionColumn}>
            {a.time ? <Text style={styles.timeText}>{a.time}</Text> : null}
            {/* "Assign" had no handler. Staff assignment happens on the
                Bookings tab, which can actually change a booking. */}
            <TouchableOpacity style={styles.statusBtn} onPress={() => router.push('/(tabs)/bookings')}>
              <Text style={styles.statusBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

export default function BeautyManager() {
  const tabs = [
    { name: 'Appointments', component: BeautyAppointmentsTab },
    { name: 'Stylist Schedules' },
    { name: 'Service Catalog' },
    { name: 'Walk-in Queue' },
    { name: 'Memberships' },
    { name: 'POS' },
  ];

  return <ManagerLayout title="Beauty & Salon" icon="cut" tabs={tabs} />;
}

const styles = StyleSheet.create({
  tabContainer: { paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  appointmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f472b6', borderLeftWidth: 4 },
  detailColumn: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  serviceText: { fontSize: 14, color: '#64748b', marginTop: 4 },
  stylistText: { fontSize: 12, color: '#f472b6', marginTop: 4, fontWeight: 'bold' },
  actionColumn: { alignItems: 'flex-end' },
  timeText: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  statusBtn: { backgroundColor: '#fdf2f8', paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#fbcfe8' },
  statusBtnText: { color: '#ec4899', fontWeight: 'bold', fontSize: 12 },
  stateBox: { backgroundColor: '#fff', padding: 28, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 18, backgroundColor: '#ec4899', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, ActivityIndicator, RefreshControl } from 'react-native';
import { apiGet } from '../../src/lib/api';

/**
 * Merchant appointment book.
 *
 * The list was three invented bookings — "Priya Sharma, Haircut + Spa, Today
 * 4:00 PM with Meera", "Rohan Patil, Beard Trim", "Sneha Gupta, Facial" — named
 * customers with named staff, shown to every salon owner as their diary for the
 * day. Reschedule and Mark Complete had no handlers, so a merchant could not
 * have acted on them even if they had been real.
 *
 * /shops/my-shop/appointments now reads shop_appointments, the table bookings
 * are actually written to. It previously queried a Prisma model mapped to a
 * table no migration creates, so it had never returned anything.
 */
export default function AppointmentsScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [slotsEnabled, setSlotsEnabled] = useState(true);
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
        rows.map((a) => {
          const when = a.appointment_date ? new Date(a.appointment_date) : null;
          const day = when && !Number.isNaN(when.getTime())
            ? when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
            : '';
          const done = ['completed', 'cancelled', 'no_show'].includes(String(a.status || '').toLowerCase());
          return {
            id: String(a.id),
            // Never a placeholder name: a walk-in booked without an account
            // shows as Customer.
            customer: a.customer_name || 'Customer',
            service: a.service_name || '',
            time: [day, a.time_slot].filter(Boolean).join(', '),
            staff: a.staff_name || '',
            status: done ? 'Completed' : 'Upcoming',
          };
        })
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

  const visible = appointments.filter((a) =>
    activeTab === 'upcoming' ? a.status === 'Upcoming' : a.status === 'Completed'
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.headerToggle}>
          <Text style={styles.toggleText}>Accepting Bookings</Text>
          <Switch 
            value={slotsEnabled} 
            onValueChange={setSlotsEnabled}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'slots' && styles.activeTab]}
          onPress={() => setActiveTab('slots')}
        >
          <Text style={[styles.tabText, activeTab === 'slots' && styles.activeTabText]}>Manage Slots</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>Past</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#3b82f6" />
        }
      >
        {activeTab === 'slots' ? (
          <View style={styles.slotsSection}>
            <Text style={styles.sectionTitle}>Today's Availability</Text>
            
            
            {/* The slot grid was eight fixed times with three marked blocked —
                two "booked", one "lunch break" — none of which came from this
                shop's schedule, and neither the chips nor "Save Configuration"
                had a handler. Service slots are managed through
                /shops/my-shop/service-slots; until this screen calls it, it says
                so rather than showing a schedule that is not the merchant's. */}
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>Slot management is not wired up yet</Text>
              <Text style={styles.stateBody}>
                Your bookable slots are set on your shop profile. This tab will
                show and edit them here in a future update.
              </Text>
            </View>
          </View>
        ) : (
          loading ? (
            <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
          ) : visible.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {error ? 'Could not load your appointments' : 'Nothing to show'}
              </Text>
              <Text style={styles.stateBody}>
                {error || (activeTab === 'upcoming'
                  ? 'Bookings customers make will appear here.'
                  : 'Completed appointments will appear here.')}
              </Text>
              {error ? (
                <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            visible.map(apt => (
              <View key={apt.id} style={styles.aptCard}>
                <View style={styles.aptHeader}>
                  <Text style={styles.aptId}>{apt.id}</Text>
                  <View style={[styles.statusBadge, apt.status === 'Completed' && styles.statusBadgeCompleted]}>
                    <Text style={[styles.statusText, apt.status === 'Completed' && styles.statusTextCompleted]}>{apt.status}</Text>
                  </View>
                </View>
                
                <Text style={styles.customerName}>{apt.customer}</Text>
                
                <View style={styles.aptDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>✂️</Text>
                    <Text style={styles.detailText}>{apt.service}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🕒</Text>
                    <Text style={styles.detailText}>{apt.time}</Text>
                  </View>
                  {apt.staff ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>👤</Text>
                      <Text style={styles.detailText}>Staff: {apt.staff}</Text>
                    </View>
                  ) : null}
                </View>

                {activeTab === 'upcoming' && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionBtn, styles.rescheduleBtn]}>
                      <Text style={styles.actionBtnTextReschedule}>Reschedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]}>
                      <Text style={styles.actionBtnText}>Mark Complete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  headerToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 12 },
  toggleText: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', paddingHorizontal: 8, paddingBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#3b82f6' },
  
  listContainer: { padding: 16 },
  
  aptCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aptId: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  statusBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeCompleted: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusText: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold' },
  statusTextCompleted: { color: '#10b981' },
  
  customerName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  aptDetails: { gap: 8, marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14 },
  detailText: { color: '#475569', fontSize: 14 },
  
  actions: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  rescheduleBtn: { backgroundColor: 'transparent', borderColor: '#e2e8f0' },
  completeBtn: { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
  actionBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  actionBtnTextReschedule: { color: '#475569', fontWeight: 'bold', fontSize: 14 },
  
  slotsSection: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  sectionSubtitle: { color: '#64748b', fontSize: 13, marginBottom: 20 },
  
  
});

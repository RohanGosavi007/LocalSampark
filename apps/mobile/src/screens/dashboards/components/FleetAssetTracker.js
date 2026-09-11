import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { Phone, CheckCircle2 } from 'lucide-react-native';
import { apiGet, apiPut } from '../../../lib/api';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}

/**
 * Rentals dashboard for the heavy-equipment archetype (tractors, borewell rigs,
 * construction plant, tent and vehicle hire).
 *
 * Everything on this panel used to be invented: a fixed "12 Available / 5 Rented
 * Out", and two identical bookings for a "Mahindra Tractor 575 DI" rented by
 * "Suresh Kumar (9876543210)", due "Tomorrow, 5:00 PM". A named person and a
 * phone number that belong to nobody, shown to a real merchant as their own
 * business. Both buttons only fired a haptic — "Call Client" dialled nothing and
 * "Mark Returned" returned nothing.
 *
 * The backing API existed at /fleet-assets but had never worked: fleet_assets,
 * rental_bookings and fleet_asset_logs were created by no migration, so every
 * endpoint answered 500. Migration 091 adds those tables; this panel now reads
 * and writes the real ones.
 */
export default function FleetAssetTracker({ themeColor = '#14b8a6' }) {
  const [summary, setSummary] = React.useState(null);
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [returning, setReturning] = React.useState(null);
  const [shopId, setShopId] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const shopRes = await apiGet('/shops/my-shop');
      const resolved = shopRes?.shop?.id ?? shopRes?.id ?? null;
      setShopId(resolved);
      if (!resolved) {
        setSummary(null);
        setBookings([]);
        setLoadError('No shop is linked to this account yet.');
        return;
      }

      const [assetsRes, bookingsRes] = await Promise.all([
        apiGet(`/fleet-assets/${resolved}`),
        apiGet(`/fleet-assets/${resolved}/bookings`),
      ]);

      const counts = assetsRes?.statusSummary ?? {};
      setSummary({
        available: Number(counts.available ?? 0),
        out: Number(counts.rented ?? 0) + Number(counts.in_field ?? 0) + Number(counts.reserved ?? 0),
      });

      const open = (bookingsRes?.bookings ?? []).filter(
        (b) => b.status !== 'completed' && b.status !== 'cancelled'
      );
      setBookings(open);
    } catch (err) {
      // No invented fleet, and above all no invented customer.
      setSummary(null);
      setBookings([]);
      setLoadError(err?.message || 'Could not load your fleet.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const tap = () => {
    if (Haptics) {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    }
  };

  const callClient = (booking) => {
    tap();
    const phone = booking.customer_phone;
    if (!phone) {
      Alert.alert('No phone number', 'This booking has no contact number on it.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Could not place the call', `Dial ${phone} manually.`)
    );
  };

  const markReturned = async (booking) => {
    if (!shopId || returning) return;
    tap();
    setReturning(booking.id);
    try {
      await apiPut(`/fleet-assets/${shopId}/${booking.asset_id}/status`, {
        status: 'available',
        notes: `Returned from booking ${booking.booking_number || booking.id}`,
      });
      await load();
    } catch (err) {
      Alert.alert('Could not mark returned', err?.message || 'The asset status was left unchanged.');
    } finally {
      setReturning(null);
    }
  };

  const formatDue = (booking) => {
    const raw = booking.end_date || booking.expected_return_date;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={s.root}>
        <Text style={s.title}>Asset Tracker</Text>
        <View style={s.stateBox}><ActivityIndicator color={themeColor} /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Text style={s.title}>Asset Tracker</Text>

      {loadError ? (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>Could not load your fleet</Text>
          <Text style={s.stateBody}>{loadError}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={s.summaryRow}>
            <View style={s.summaryCardActive}>
              <Text style={s.summaryBig}>{summary?.available ?? 0}</Text>
              <Text style={s.summaryLabel}>Available</Text>
            </View>
            <View style={s.summaryCardDefault}>
              <Text style={s.summaryBigWhite}>{summary?.out ?? 0}</Text>
              <Text style={s.summaryLabel}>Rented Out</Text>
            </View>
          </View>

          <Text style={s.sectionLabel}>Open Bookings</Text>

          {bookings.length === 0 ? (
            <View style={s.stateBox}>
              <Text style={s.stateTitle}>No open bookings</Text>
              <Text style={s.stateBody}>Bookings appear here as customers reserve your equipment.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {bookings.map((b) => {
                const due = formatDue(b);
                return (
                  <View key={b.id} style={s.bookingCard}>
                    <View style={s.bookingHeader}>
                      <Text style={s.bookingTitle}>
                        {b.asset_name || 'Asset'}
                        {b.model ? ` ${b.model}` : ''}
                      </Text>
                      <View style={s.statusBadge}>
                        <Text style={s.statusText}>{String(b.status || '').replace(/_/g, ' ') || 'pending'}</Text>
                      </View>
                    </View>

                    {b.customer_name || b.customer_phone ? (
                      <Text style={s.bookingDetail}>
                        Rented by: {b.customer_name || 'Customer'}
                        {b.customer_phone ? ` (${b.customer_phone})` : ''}
                      </Text>
                    ) : null}

                    {due ? <Text style={s.bookingDue}>Due: {due}</Text> : null}

                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={[s.callBtn, !b.customer_phone && s.btnDisabled]}
                        disabled={!b.customer_phone}
                        onPress={() => callClient(b)}
                      >
                        <Phone size={14} color="#94a3b8" style={{ marginRight: 6 }} />
                        <Text style={s.callBtnText}>Call Client</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.returnBtn, returning === b.id && s.btnDisabled]}
                        disabled={returning === b.id}
                        onPress={() => markReturned(b)}
                      >
                        {returning === b.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <CheckCircle2 size={14} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={s.returnBtnText}>Mark Returned</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCardActive: { flex: 1, borderWidth: 1, borderColor: 'rgba(20,184,166,0.3)', backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: 16, padding: 16, alignItems: 'center' },
  summaryCardDefault: { flex: 1, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a', borderRadius: 16, padding: 16, alignItems: 'center' },
  summaryBig: { fontSize: 32, fontWeight: '900', color: '#2dd4bf' },
  summaryBigWhite: { fontSize: 32, fontWeight: '900', color: '#ffffff' },
  summaryLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 4 },
  sectionLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  bookingCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  bookingTitle: { fontWeight: '700', fontSize: 16, color: '#ffffff', flex: 1, marginRight: 8 },
  statusBadge: { backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fbbf24', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  bookingDetail: { fontSize: 12, color: '#cbd5e1', fontWeight: '500', marginBottom: 4 },
  bookingDue: { fontSize: 12, color: '#f87171', fontWeight: '700', marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  callBtn: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', backgroundColor: '#020617', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  callBtnText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  returnBtn: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: '#0d9488', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  returnBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  btnDisabled: { opacity: 0.45 },
  stateBox: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center' },
  stateTitle: { color: '#ffffff', fontWeight: '800', fontSize: 14, marginBottom: 6, textAlign: 'center' },
  stateBody: { color: '#94a3b8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#0d9488', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});

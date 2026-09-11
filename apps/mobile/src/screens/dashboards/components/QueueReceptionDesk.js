import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { PhoneCall, Clock } from 'lucide-react-native';
import { apiGet, apiPut } from '../../../lib/api';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) {}

/**
 * Front-desk queue for appointment-based shops.
 *
 * This was entirely invented: "Currently Serving Token #18", a "CALL NEXT (19)"
 * button, and three waiting entries all reading "Rahul Sharma, Est. 11:30 AM".
 * The button only fired a haptic — no one was called, and the token number never
 * moved. A receptionist working from this screen would have been calling numbers
 * that corresponded to nothing.
 *
 * It now reads the shop's real appointment book from /shops/my-shop/appointments
 * and moves each one through /shops/my-shop/appointments/:id/status, so calling
 * the next person actually marks them as being seen.
 */
export default function QueueReceptionDesk({ themeColor = '#0ea5e9' }) {
  const [appointments, setAppointments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/shops/my-shop/appointments');
      const rows = res?.appointments ?? [];
      const today = new Date().toISOString().slice(0, 10);

      setAppointments(
        rows
          .filter((a) => String(a.appointment_date || '').slice(0, 10) === today)
          .map((a) => ({
            id: String(a.id),
            // A walk-in booked at the counter may have no account.
            name: a.customer_name || 'Customer',
            slot: a.time_slot || null,
            status: String(a.status || 'pending').toLowerCase(),
          }))
      );
    } catch (err) {
      setAppointments([]);
      setError(err?.message || 'Could not load today\'s queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const serving = appointments.find((a) => a.status === 'in_progress') || null;
  const waiting = appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  const next = waiting[0] || null;

  const callNext = async () => {
    if (!next || busy) return;
    if (Haptics) {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}
    }

    setBusy(true);
    try {
      // Close out whoever is currently being seen before starting the next.
      if (serving) {
        await apiPut(`/shops/my-shop/appointments/${serving.id}/status`, { status: 'completed' });
      }
      await apiPut(`/shops/my-shop/appointments/${next.id}/status`, { status: 'in_progress' });
      await load();
    } catch (err) {
      Alert.alert('Queue not advanced', err?.message || 'The change was not saved. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <Text style={s.title}>Live Reception Desk</Text>
        <View style={s.stateBox}><ActivityIndicator color={themeColor} /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Text style={s.title}>Live Reception Desk</Text>

      <View style={s.tokenCard}>
        <Text style={s.tokenLabel}>Currently Serving</Text>
        {/* No invented token number: the card shows who is actually in the
            chair, or says nobody is. */}
        <Text style={s.tokenNumber}>{serving ? serving.name : 'Nobody yet'}</Text>
        {serving?.slot ? <Text style={s.tokenSlot}>{serving.slot}</Text> : null}

        <TouchableOpacity
          style={[s.callBtn, (!next || busy) && s.callBtnDisabled]}
          disabled={!next || busy}
          onPress={callNext}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <PhoneCall size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.callBtnText}>
                {next ? `CALL NEXT — ${next.name}` : 'NOBODY WAITING'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={s.sectionLabel}>Today&apos;s Appointments</Text>

      {waiting.length === 0 ? (
        <View style={s.stateBox}>
          <Text style={s.stateTitle}>
            {error ? 'Could not load the queue' : 'Nobody waiting'}
          </Text>
          <Text style={s.stateBody}>
            {error || 'Appointments booked for today will appear here.'}
          </Text>
          {error ? (
            <TouchableOpacity style={s.retryBtn} onPress={load}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={s.listContainer}>
          {waiting.map((a, idx) => (
            <View key={a.id} style={[s.listItem, idx !== waiting.length - 1 && s.listBorder]}>
              <View style={s.tokenBadge}><Text style={s.tokenBadgeText}>{idx + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.personName}>{a.name}</Text>
                {a.slot ? (
                  <View style={s.timeRow}>
                    <Clock size={12} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={s.timeText}>{a.slot}</Text>
                  </View>
                ) : null}
              </View>
              <View style={s.statusBadge}>
                <Text style={s.statusText}>{a.status === 'confirmed' ? 'Confirmed' : 'Waiting'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#ffffff', marginBottom: 16 },
  tokenCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 },
  tokenLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  tokenNumber: { color: '#ffffff', fontSize: 28, fontWeight: '900', marginTop: 6, textAlign: 'center' },
  tokenSlot: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 2 },
  callBtn: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0284c7', paddingHorizontal: 20, borderRadius: 12, minHeight: 44, alignSelf: 'stretch' },
  callBtnDisabled: { opacity: 0.45 },
  callBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  sectionLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  listContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  tokenBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tokenBadgeText: { color: '#e2e8f0', fontWeight: '900', fontSize: 13 },
  personName: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  timeText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  statusBadge: { backgroundColor: 'rgba(234,179,8,0.1)', borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fbbf24', fontWeight: '700', fontSize: 12 },
  stateBox: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center' },
  stateTitle: { color: '#ffffff', fontWeight: '800', fontSize: 14, marginBottom: 6, textAlign: 'center' },
  stateBody: { color: '#94a3b8', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#0284c7', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});

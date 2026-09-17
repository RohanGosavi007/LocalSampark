import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, RefreshControl, Switch, Alert, Share,
} from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../src/lib/api';

/**
 * The resident's flat portal.
 *
 * The screen a resident opens when their phone buzzes with "someone is at the
 * gate". Everything above the fold is that decision, because it is the only
 * thing that is urgent and the guard is standing there waiting for it.
 *
 * ── Why approval is two large buttons and nothing else ─────────────────────
 *
 * A visitor alert is answered one-handed, often without looking properly —
 * walking, cooking, half asleep. Anything that needs aim, or a confirmation
 * step, or a scroll, is answered by not answering, and a gate that never gets
 * an answer trains guards to wave people through on their own judgement, which
 * is the whole system defeated.
 *
 * The buttons are far apart on purpose: Approve and Deny sitting side by side
 * at thumb width is how a tired person lets in someone they meant to turn away.
 *
 * ── Leave at gate ──────────────────────────────────────────────────────────
 *
 * A standing instruction for deliveries, not a per-visitor choice. Nobody wants
 * to be asked about a parcel at 11pm; they want to have said "leave parcels at
 * the gate" once, in daylight.
 */

export default function FlatPortal() {
  const [waiting, setWaiting] = useState([]);
  const [passes, setPasses] = useState([]);
  const [leaveAtGate, setLeaveAtGate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);

  const [guestName, setGuestName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);

    const [visitorsResult, passesResult] = await Promise.allSettled([
      apiGet('/society-management/visitors/today'),
      apiGet('/society-preapproval/pre-approve/my'),
    ]);

    if (visitorsResult.status === 'fulfilled') {
      const all = visitorsResult.value?.visitors || visitorsResult.value?.data || [];
      // Only the ones actually asking for a decision. A list that also shows
      // this morning's plumber buries the person at the gate now.
      setWaiting(all.filter((v) => String(v.status || '').toLowerCase() === 'pending'));
    } else {
      setError('Could not load visitors. Pull to retry.');
    }

    if (passesResult.status === 'fulfilled') {
      setPasses(passesResult.value?.preApprovals || passesResult.value?.data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (visitor, status) => {
    setActing(visitor.id);

    // Removed from the list straight away. The guard is waiting, and a button
    // that stays live for another second gets pressed twice.
    const previous = waiting;
    setWaiting((list) => list.filter((v) => v.id !== visitor.id));

    try {
      await apiPut('/society-management/visitors/status', { visitorId: visitor.id, status });
    } catch (err) {
      // Put it back rather than leaving the resident believing they answered.
      setWaiting(previous);
      Alert.alert(
        'That did not go through',
        err?.message || 'The gate was not told. Try again, or call the guard.'
      );
    } finally {
      setActing(null);
    }
  };

  const toggleLeaveAtGate = async (next) => {
    setLeaveAtGate(next);
    try {
      await apiPut('/society-preapproval/pre-approve/leave-at-gate', { enabled: next });
    } catch {
      setLeaveAtGate(!next);
      Alert.alert('Could not save that', 'The setting has not changed. Check your connection.');
    }
  };

  const createPass = async () => {
    const name = guestName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const result = await apiPost('/society-preapproval/pre-approve', { visitorName: name });
      const created = result?.preApproval || result?.data || null;
      if (created) setPasses((list) => [created, ...list]);
      setGuestName('');
    } catch (err) {
      Alert.alert('Could not create the pass', err?.message || 'Try again in a moment.');
    } finally {
      setCreating(false);
    }
  };

  const sharePass = async (pass) => {
    const code = pass.passcode || pass.code;
    if (!code) return;
    try {
      await Share.share({
        message: `Your gate pass for ${pass.visitor_name || 'your visit'}: ${code}. Show this at the gate.`,
      });
    } catch {
      // The user dismissed the share sheet; nothing to report.
    }
  };

  const revokePass = async (pass) => {
    const previous = passes;
    setPasses((list) => list.filter((p) => p.id !== pass.id));
    try {
      await apiDelete(`/society-preapproval/pre-approve/${pass.id}`);
    } catch {
      setPasses(previous);
      Alert.alert('Could not revoke that pass', 'It is still active. Try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.centre]}>
        <ActivityIndicator color="#38bdf8" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Flat</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#38bdf8" />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* The decision, first and largest. */}
        {waiting.length > 0 ? (
          waiting.map((visitor) => (
            <View key={visitor.id} style={styles.visitorCard}>
              <Text style={styles.visitorEyebrow}>AT THE GATE</Text>
              <Text style={styles.visitorName}>{visitor.visitor_name || 'Someone'}</Text>
              <Text style={styles.visitorMeta}>
                {visitor.purpose || 'guest'}
                {visitor.visitor_phone ? ` · ${visitor.visitor_phone}` : ''}
              </Text>

              <View style={styles.decideRow}>
                <TouchableOpacity
                  style={[styles.denyBtn, acting === visitor.id ? styles.btnBusy : null]}
                  onPress={() => decide(visitor, 'denied')}
                  disabled={acting === visitor.id}
                >
                  <Text style={styles.denyText}>Not now</Text>
                </TouchableOpacity>

                {/* Deliberately separated from Deny — side by side at thumb
                    width is how a tired person lets in the wrong person. */}
                <View style={styles.decideGap} />

                <TouchableOpacity
                  style={[styles.approveBtn, acting === visitor.id ? styles.btnBusy : null]}
                  onPress={() => decide(visitor, 'approved')}
                  disabled={acting === visitor.id}
                >
                  <Text style={styles.approveText}>Send up</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.quietCard}>
            <Text style={styles.quietText}>Nobody is waiting at the gate.</Text>
          </View>
        )}

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Leave parcels at the gate</Text>
            <Text style={styles.settingSub}>
              Deliveries are accepted by the guard without calling you.
            </Text>
          </View>
          <Switch
            value={leaveAtGate}
            onValueChange={toggleLeaveAtGate}
            trackColor={{ true: '#22c55e', false: '#475569' }}
            thumbColor="#f8fafc"
          />
        </View>

        <Text style={styles.sectionTitle}>Expected guests</Text>
        <Text style={styles.sectionSub}>
          A pass lets someone in without the guard calling you.
        </Text>

        <View style={styles.passInputRow}>
          <TextInput
            style={styles.input}
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Who are you expecting?"
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.createBtn, (!guestName.trim() || creating) ? styles.btnBusy : null]}
            onPress={createPass}
            disabled={!guestName.trim() || creating}
          >
            {creating ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.createText}>Create</Text>}
          </TouchableOpacity>
        </View>

        {passes.length === 0 ? (
          <Text style={styles.emptyNote}>No passes yet.</Text>
        ) : (
          passes.map((pass) => (
            <View key={pass.id} style={styles.passCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.passName}>{pass.visitor_name || 'Guest'}</Text>
                <Text style={styles.passCode}>{pass.passcode || pass.code || '—'}</Text>
              </View>
              <TouchableOpacity style={styles.passAction} onPress={() => sharePass(pass)}>
                <Text style={styles.passActionText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.passAction} onPress={() => revokePass(pass)}>
                <Text style={styles.passRevokeText}>Revoke</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#e2e8f0', fontSize: 30, lineHeight: 32 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  body: { padding: 16, paddingBottom: 48 },
  error: { color: '#fca5a5', marginBottom: 12, fontWeight: '600' },

  visitorCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#38bdf8', marginBottom: 12 },
  visitorEyebrow: { color: '#38bdf8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  visitorName: { color: '#f8fafc', fontSize: 26, fontWeight: '800', marginTop: 6 },
  visitorMeta: { color: '#94a3b8', fontSize: 14, marginTop: 4, textTransform: 'capitalize' },
  decideRow: { flexDirection: 'row', marginTop: 20 },
  decideGap: { width: 16 },
  denyBtn: { flex: 1, backgroundColor: '#334155', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  denyText: { color: '#e2e8f0', fontSize: 16, fontWeight: '800' },
  approveBtn: { flex: 1.4, backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  approveText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  btnBusy: { opacity: 0.5 },

  quietCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  quietText: { color: '#94a3b8', fontSize: 14 },

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#334155' },
  settingTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  settingSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800', marginTop: 28 },
  sectionSub: { color: '#94a3b8', fontSize: 13, marginTop: 4, marginBottom: 12 },

  passInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#f8fafc', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  createBtn: { backgroundColor: '#38bdf8', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 15 },
  createText: { color: '#0f172a', fontWeight: '800' },
  emptyNote: { color: '#64748b', fontSize: 13, marginTop: 12 },

  passCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#334155' },
  passName: { color: '#f8fafc', fontWeight: '700' },
  passCode: { color: '#38bdf8', fontFamily: 'monospace', fontSize: 16, marginTop: 2, letterSpacing: 2 },
  passAction: { paddingHorizontal: 10, paddingVertical: 8 },
  passActionText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  passRevokeText: { color: '#fca5a5', fontWeight: '700', fontSize: 13 },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, Alert, Modal, Vibration, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../../src/lib/api';
import gateQueue from '../../../src/services/gateQueue';

/**
 * The gate console.
 *
 * What a guard actually does, in the order they do it: someone arrives, they
 * take a name and a flat, the resident is asked, the visitor goes up. The whole
 * interaction happens standing, one-handed, often at night, with a person
 * waiting — so the screen is built around a numeric keypad and large targets
 * rather than a form.
 *
 * ── Offline is the normal case, not the exception ──────────────────────────
 *
 * A gate is a concrete box at the edge of a compound, frequently in a basement.
 * Every entry goes through the local queue first and is acknowledged
 * immediately; the upload happens when it happens. The pending count is shown
 * permanently rather than as an error, because "3 waiting to sync" is a normal
 * state at a gate and a red banner that is always on is a banner nobody reads.
 *
 * ── The panic button ───────────────────────────────────────────────────────
 *
 * Held, not tapped, and it says so. A trigger that fires on a single touch in a
 * pocket is a trigger that gets disabled by the second false alarm; one that
 * needs a deliberate hold still takes under a second when it is real.
 */

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

const PURPOSES = [
  { id: 'guest', label: 'Guest', icon: '👋' },
  { id: 'delivery', label: 'Delivery', icon: '📦' },
  { id: 'cab', label: 'Cab', icon: '🚕' },
  { id: 'service', label: 'Service', icon: '🔧' },
  { id: 'staff', label: 'Staff', icon: '🧹' },
];

/** How long the panic button must be held. */
const PANIC_HOLD_MS = 800;

export default function GateConsole() {
  const [flat, setFlat] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('guest');
  const [vehicle, setVehicle] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [lastEntry, setLastEntry] = useState(null);
  const [notice, setNotice] = useState(null);

  const [vehicleLookup, setVehicleLookup] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [panicOpen, setPanicOpen] = useState(false);
  const panicTimer = useRef(null);

  const refreshPending = useCallback(async () => {
    setPendingSync(await gateQueue.pendingCount());
  }, []);

  useEffect(() => {
    refreshPending();
    // Drain whatever a previous shift left behind, and keep draining as the
    // guard walks in and out of signal.
    gateQueue.sync().then(refreshPending).catch(() => {});
    const unsubscribe = gateQueue.syncOnReconnect();
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [refreshPending]);

  useEffect(() => () => { if (panicTimer.current) clearTimeout(panicTimer.current); }, []);

  const press = (key) => {
    if (key === 'clear') return setFlat('');
    if (key === 'back') return setFlat((f) => f.slice(0, -1));
    setFlat((f) => (f.length >= 8 ? f : f + key));
  };

  const reset = () => {
    setFlat(''); setName(''); setPhone(''); setVehicle('');
    setPurpose('guest'); setVehicleLookup(null);
  };

  /**
   * Looks a vehicle up against the society's register.
   *
   * A guard reading a number plate through a windscreen at night wants to know
   * one thing: is this car expected here. A miss is not an error — most cars at
   * a gate are not registered — so it reports "not on the register" plainly
   * rather than as a failure.
   */
  const lookUpVehicle = async () => {
    const plate = vehicle.trim().toUpperCase();
    if (plate.length < 4) return;

    setLookingUp(true);
    setVehicleLookup(null);
    try {
      const result = await apiGet(`/society-guard/gate/lookup-vehicle?plate=${encodeURIComponent(plate)}`);
      const found = result?.vehicle || result?.data || null;
      setVehicleLookup(found ? { found: true, ...found } : { found: false, plate });
      if (found?.flat_number) setFlat(String(found.flat_number));
    } catch {
      setVehicleLookup({ found: false, plate, offline: true });
    } finally {
      setLookingUp(false);
    }
  };

  const logEntry = async () => {
    if (!name.trim() || !flat.trim()) {
      setNotice('A name and a flat number are needed.');
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const result = await gateQueue.recordEntry({
        name: name.trim(),
        flat: flat.trim(),
        phone: phone.trim() || null,
        purpose,
        vehicleNumber: vehicle.trim().toUpperCase() || null,
      });

      if (!result.queued) {
        setNotice('A name and a flat number are needed.');
        return;
      }

      // Acknowledged from the local queue, so the guard can wave the visitor on
      // without waiting for the network.
      setLastEntry({ name: name.trim(), flat: flat.trim(), at: new Date() });
      if (Platform.OS !== 'web') Vibration.vibrate(40);
      reset();
      await refreshPending();
    } finally {
      setSubmitting(false);
    }
  };

  const beginPanic = () => {
    panicTimer.current = setTimeout(() => setPanicOpen(true), PANIC_HOLD_MS);
  };
  const cancelPanic = () => {
    if (panicTimer.current) { clearTimeout(panicTimer.current); panicTimer.current = null; }
  };

  const raiseEmergency = async (kind) => {
    setPanicOpen(false);
    try {
      await apiPost('/society-management/emergency', { type: kind, source: 'gate_console' });
      Alert.alert('Alert raised', 'The society committee and residents have been notified.');
    } catch {
      // An emergency that cannot reach the server still needs the guard to know
      // it did not go, so they use the phone instead of assuming it was sent.
      Alert.alert(
        'Could not raise the alert',
        'There is no connection to the server. Call the society office directly.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Gate Console</Text>
          <Text style={styles.subtitle}>
            {pendingSync > 0 ? `${pendingSync} waiting to sync` : 'All entries synced'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.panicBtn}
          onPressIn={beginPanic}
          onPressOut={cancelPanic}
          accessibilityLabel="Hold to raise an emergency alert"
        >
          <Text style={styles.panicIcon}>🚨</Text>
          <Text style={styles.panicLabel}>HOLD</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {lastEntry ? (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>✓ {lastEntry.name} logged for {lastEntry.flat}</Text>
            <Text style={styles.confirmSub}>The flat has been alerted.</Text>
          </View>
        ) : null}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Text style={styles.label}>Flat number</Text>
        <View style={styles.flatDisplay}>
          <Text style={styles.flatText}>{flat || '—'}</Text>
        </View>

        <View style={styles.keypad}>
          {KEYPAD.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.key, key === 'clear' || key === 'back' ? styles.keyMuted : null]}
              onPress={() => press(key)}
              accessibilityLabel={key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear flat number' : `Digit ${key}`}
            >
              <Text style={styles.keyText}>
                {key === 'clear' ? 'CLR' : key === 'back' ? '⌫' : key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Letters happen — A-101, B-4 — so the keypad is a shortcut, not the
            only way in. */}
        <Text style={styles.label}>Or type it</Text>
        <TextInput
          style={styles.input}
          value={flat}
          onChangeText={setFlat}
          placeholder="A-101"
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Visitor name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Who is at the gate"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit number"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Purpose</Text>
        <View style={styles.purposeRow}>
          {PURPOSES.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.purposeChip, purpose === p.id ? styles.purposeChipOn : null]}
              onPress={() => setPurpose(p.id)}
            >
              <Text style={styles.purposeIcon}>{p.icon}</Text>
              <Text style={[styles.purposeText, purpose === p.id ? styles.purposeTextOn : null]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Vehicle (optional)</Text>
        <View style={styles.vehicleRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={vehicle}
            onChangeText={setVehicle}
            placeholder="MH 12 AB 1234"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.lookupBtn} onPress={lookUpVehicle} disabled={lookingUp}>
            {lookingUp ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.lookupText}>Check</Text>}
          </TouchableOpacity>
        </View>

        {vehicleLookup ? (
          <View style={[styles.lookupResult, vehicleLookup.found ? styles.lookupFound : styles.lookupMiss]}>
            <Text style={styles.lookupResultText}>
              {vehicleLookup.found
                ? `Registered to flat ${vehicleLookup.flat_number || '—'}${vehicleLookup.owner_name ? ` · ${vehicleLookup.owner_name}` : ''}`
                : vehicleLookup.offline
                  ? 'Cannot check the register right now — no connection.'
                  : 'Not on the society register.'}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, submitting ? styles.primaryBtnOff : null]}
          onPress={logEntry}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#0f172a" />
            : <Text style={styles.primaryText}>Log entry &amp; alert flat</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/modules/society/GuardDashboard')}>
          <Text style={styles.secondaryText}>Today&apos;s gate log</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={panicOpen} transparent animationType="fade" onRequestClose={() => setPanicOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Raise an alert</Text>
            <Text style={styles.modalSub}>This notifies the committee and every resident.</Text>

            {[
              { id: 'security', label: 'Security threat' },
              { id: 'medical', label: 'Medical emergency' },
              { id: 'fire', label: 'Fire' },
            ].map((option) => (
              <TouchableOpacity key={option.id} style={styles.modalBtn} onPress={() => raiseEmergency(option.id)}>
                <Text style={styles.modalBtnText}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.modalCancel} onPress={() => setPanicOpen(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#e2e8f0', fontSize: 30, lineHeight: 32 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  panicBtn: { backgroundColor: '#7f1d1d', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  panicIcon: { fontSize: 20 },
  panicLabel: { color: '#fecaca', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  body: { padding: 16, paddingBottom: 48 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },

  flatDisplay: { backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  flatText: { color: '#f8fafc', fontSize: 34, fontWeight: '800', letterSpacing: 3 },

  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  key: { width: '31.5%', backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  keyMuted: { backgroundColor: '#172033' },
  keyText: { color: '#f8fafc', fontSize: 24, fontWeight: '700' },

  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, color: '#f8fafc', fontSize: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 4 },

  purposeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  purposeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1e293b', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#334155' },
  purposeChipOn: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  purposeIcon: { fontSize: 15 },
  purposeText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  purposeTextOn: { color: '#f8fafc' },

  vehicleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  lookupBtn: { backgroundColor: '#38bdf8', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 15 },
  lookupText: { color: '#0f172a', fontWeight: '800' },
  lookupResult: { borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1 },
  lookupFound: { backgroundColor: '#052e16', borderColor: '#16a34a' },
  lookupMiss: { backgroundColor: '#1e293b', borderColor: '#475569' },
  lookupResultText: { color: '#e2e8f0', fontSize: 13 },

  primaryBtn: { backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  primaryBtnOff: { opacity: 0.6 },
  primaryText: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 16, alignItems: 'center' },
  secondaryText: { color: '#94a3b8', fontWeight: '700' },

  confirmCard: { backgroundColor: '#052e16', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#16a34a', marginBottom: 8 },
  confirmTitle: { color: '#bbf7d0', fontWeight: '800' },
  confirmSub: { color: '#86efac', fontSize: 12, marginTop: 2 },
  notice: { color: '#fca5a5', marginBottom: 8, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 18, padding: 20 },
  modalTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  modalSub: { color: '#94a3b8', fontSize: 13, marginTop: 4, marginBottom: 16 },
  modalBtn: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalCancel: { paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { color: '#94a3b8', fontWeight: '700' },
});

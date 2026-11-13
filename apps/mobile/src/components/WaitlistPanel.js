import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { outOfZoneMessage, waitlistContact } from '../services/serviceability';

/**
 * C2 on Android: shown when "Use Current Location" finds the user outside
 * every zone. Says so, names the nearest zone, and takes a phone number or
 * email for the waitlist (POST /zones/waitlist via ZoneContext.joinWaitlist).
 */
export default function WaitlistPanel({ result, onJoin }) {
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  if (!result || result.inZone) return null;

  const submit = async () => {
    const fields = waitlistContact(contact);
    if (fields.error) { setError(fields.error); return; }
    setError('');
    setBusy(true);
    try {
      await onJoin(contact);
      setJoined(true);
    } catch (e) {
      setError((e && e.message) || 'That did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.panel} testID="waitlist-panel" accessibilityRole="summary">
      <Text style={styles.title}>{outOfZoneMessage(result)}</Text>
      {joined ? (
        <Text style={styles.done} accessibilityLiveRegion="polite">
          You&apos;re on the list. We&apos;ll tell you when we reach your area.
        </Text>
      ) : (
        <>
          <Text style={styles.label}>Tell me when you reach my area</Text>
          <TextInput
            style={styles.input}
            placeholder="Mobile number or email"
            value={contact}
            onChangeText={setContact}
            autoCapitalize="none"
            accessibilityLabel="Mobile number or email"
          />
          {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
          <TouchableOpacity style={styles.button} onPress={submit} disabled={busy} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Join the waitlist</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  error: { color: '#b91c1c', fontSize: 13, marginBottom: 8 },
  button: { backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  done: { fontSize: 14, color: '#065f46', fontWeight: '600' },
});

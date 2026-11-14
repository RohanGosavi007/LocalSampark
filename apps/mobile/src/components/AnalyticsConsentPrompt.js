import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { loadConsent, getConsent, setConsent, subscribe } from '../services/analyticsConsent';

/**
 * The first-run privacy question (P11, DPDP Act 2023).
 *
 * Shown once, until it is answered. "No thanks" and "Allow analytics" are the
 * same size and one tap each; neither is pre-selected, and closing the app
 * without answering leaves analytics off. The answer can be changed any time in
 * Settings (More > Settings), where the switch does the same thing.
 */
export const CONSENT_COPY = {
  title: 'Your privacy',
  body:
    'LocalSampark keeps what it needs to work: your sign-in and your cart. With your permission it also ' +
    'measures which shops and items people view and tap, to improve search and the order of results. ' +
    'No name, phone number or address is part of that. You can change this any time in Settings.',
  allow: 'Allow analytics',
  decline: 'No thanks',
};

export default function AnalyticsConsentPrompt() {
  const [choice, setChoice] = useState(null); // null until the saved answer has been read

  useEffect(() => {
    let live = true;
    loadConsent().then((c) => { if (live) setChoice(c); });
    const off = subscribe((c) => { if (live) setChoice(c); });
    return () => { live = false; off(); };
  }, []);

  const visible = choice === 'unset' && getConsent() === 'unset';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setConsent(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">{CONSENT_COPY.title}</Text>
          <Text style={styles.body}>{CONSENT_COPY.body}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, styles.decline]}
              onPress={() => setConsent(false)}
              accessibilityRole="button"
              accessibilityLabel={CONSENT_COPY.decline}
            >
              <Text style={styles.declineText}>{CONSENT_COPY.decline}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.allow]}
              onPress={() => setConsent(true)}
              accessibilityRole="button"
              accessibilityLabel={CONSENT_COPY.allow}
            >
              <Text style={styles.allowText}>{CONSENT_COPY.allow}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21, color: '#374151', marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  decline: { borderWidth: 1, borderColor: '#9CA3AF', backgroundColor: '#FFFFFF' },
  declineText: { color: '#111827', fontWeight: '700', fontSize: 15 },
  allow: { backgroundColor: '#007F4F' },
  allowText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

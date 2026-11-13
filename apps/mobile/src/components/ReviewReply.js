import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { replyFromInput, replyToReview } from '../services/sellerTools';

/**
 * S6 on Android: the merchant's reply under one review. The reviews tab was
 * read-only, so a seller could not answer a customer from the phone. Shows the
 * reply once there is one; otherwise a box to write it.
 */
export default function ReviewReply({ reviewId, existing, onSaved }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (existing) {
    return (
      <View style={styles.replyBox}>
        <Text style={styles.replyLabel}>Your reply</Text>
        <Text style={styles.replyText}>{existing}</Text>
      </View>
    );
  }

  const save = async () => {
    const checked = replyFromInput(text);
    if (checked.error) { setError(checked.error); return; }
    setError('');
    setBusy(true);
    try {
      await replyToReview(reviewId, text);
      onSaved && onSaved(checked.reply);
      setText('');
    } catch (e) {
      setError((e && e.message) || 'Your reply could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Reply to this customer"
        accessibilityLabel="Your reply"
        multiline
        maxLength={1000}
      />
      {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={save} disabled={busy} accessibilityRole="button">
        {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Post reply</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  replyBox: { marginTop: 10, padding: 10, backgroundColor: '#fffbeb', borderRadius: 10 },
  replyLabel: { fontSize: 12, fontWeight: '800', color: '#b45309', marginBottom: 4 },
  replyText: { fontSize: 13, color: '#475569', lineHeight: 19 },
  form: { marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, minHeight: 44, fontSize: 14, color: '#0f172a' },
  error: { color: '#b91c1c', fontSize: 12, marginTop: 6 },
  button: { marginTop: 8, backgroundColor: '#f59e0b', borderRadius: 10, paddingVertical: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});

import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { googleClientIds } from '../services/authSession';

// Closes the browser pop-up when Google redirects back into the app.
WebBrowser.maybeCompleteAuthSession();

/**
 * "Continue with Google" (C1, Decision D3). Rendered only when the app has a
 * Google OAuth client id (googleConfigured()): the hook below refuses to run
 * without one. Google's ID token goes to the server, which checks it
 * (POST /auth/google).
 */
export default function GoogleSignInButton({ onIdToken, onError, disabled = false }) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleClientIds());

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.params && response.params.id_token) {
      onIdToken(response.params.id_token);
    } else if (response.type === 'error') {
      onError && onError(new Error((response.error && response.error.message) || 'Google sign-in failed.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      testID="google-sign-in"
      style={[styles.button, (!request || disabled) && styles.disabled]}
      disabled={!request || disabled}
      onPress={() => promptAsync()}
    >
      <Text style={styles.text}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%', height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1',
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  disabled: { opacity: 0.5 },
  text: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
});

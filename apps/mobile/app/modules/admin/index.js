import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';

/**
 * Admin portal sign-in.
 *
 * This screen used to collect an email and a password, discard both, and call
 * loginWithDevPreset('admin') — a role absent from that helper's phone map, so
 * it fell through to the default resident number. It authenticated nothing; it
 * just navigated. (It failed closed in release builds only because the preset
 * helper was changed to reject there.)
 *
 * It now speaks the contract the backend actually exposes and apps/web already
 * uses: POST /admin-auth/login with phone + PIN + OTP. The server verifies an
 * active admin_roles row, an IP allowlist and a PIN lockout, and records the
 * attempt in admin_audit_log.
 */
export default function AdminLoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { adminLogin, sendOtp } = useAuth();

  const handleSendOtp = async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed || trimmed.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid Number', 'Enter the mobile number registered to your admin account.');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(trimmed);
      setOtpSent(true);
      Alert.alert('OTP Sent', 'Enter the code along with your admin PIN.');
    } catch (err) {
      Alert.alert('Could not send OTP', err?.message || 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!pin || !otp) {
      Alert.alert('Missing Details', 'Both your admin PIN and the OTP are required.');
      return;
    }
    setLoading(true);
    try {
      await adminLogin(phoneNumber.trim(), pin, otp);
      router.replace('/modules/admin-dashboard');
    } catch (err) {
      // Surface the server's reason. It distinguishes an unassigned admin role,
      // a blocked IP, a locked account and a wrong PIN — collapsing those into
      // "Invalid admin credentials" made a lockout indistinguishable from a typo.
      Alert.alert('Login Failed', err?.message || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={{ fontSize: 24, color: '#0f172a' }}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={{ fontSize: 40 }}>🛡️</Text>
          </View>
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.subtitle}>
            {otpSent
              ? `Enter your PIN and the code sent to ${phoneNumber.trim()}`
              : 'Sign in to access platform management'}
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Registered Mobile Number</Text>
              <TextInput
                style={[styles.input, otpSent && styles.inputLocked]}
                placeholder="+91 9999999999"
                placeholderTextColor="#94a3b8"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!otpSent}
              />
            </View>

            {!otpSent ? (
              <TouchableOpacity style={styles.loginBtn} onPress={handleSendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Send OTP</Text>}
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Admin PIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••"
                    placeholderTextColor="#94a3b8"
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="number-pad"
                    maxLength={6}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>One Time Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor="#94a3b8"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Secure Login</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 16 }} onPress={() => { setOtpSent(false); setPin(''); setOtp(''); }}>
                  <Text style={styles.changeNumber}>Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.disclaimer}>
            This portal is restricted to authorized LocalSampark administrators only. Unauthorized access is strictly prohibited.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  keyboardView: { flex: 1 },
  header: { padding: 20 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  content: { flex: 1, padding: 24, justifyContent: 'center', marginTop: -40 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 24, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 40 },
  form: { backgroundColor: '#fff', padding: 24, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 16, fontSize: 16, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  inputLocked: { color: '#64748b', backgroundColor: '#e2e8f0' },
  loginBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  changeNumber: { color: '#2563eb', textAlign: 'center', fontWeight: '600', fontSize: 14 },
  disclaimer: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 32, lineHeight: 18, paddingHorizontal: 20 },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { apiPost } from '../src/lib/api';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { loginTabs, cleanCode, offerGoogle } from '../src/services/authSession';
import GoogleSignInButton from '../src/components/GoogleSignInButton';

export default function LoginScreen() {
  // C1 / Decision D3: an emailed code first, then a password; phone only when
  // the server has it switched on.
  const [chosen, setMethod] = useState('emailOtp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithDevPreset, API_URL, sendOtp, verifyOtp, loginEmail, loginMethods, sendEmailOtp, verifyEmailOtp, googleLogin } = useAuth();
  const tabs = loginTabs(loginMethods);
  const method = tabs.some((t) => t.id === chosen) ? chosen : tabs[0].id;
  const [emailStep, setEmailStep] = useState('address'); // 'address' | 'code' | 'name'
  const [emailCode, setEmailCode] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSendEmailCode = async () => {
    setLoading(true);
    try {
      const data = await sendEmailOtp(email);
      setEmailStep('code');
      setEmailCode('');
      Alert.alert('Check your email', data && data.otp ? `Verification Code: ${data.otp}` : 'We have emailed you a sign-in code.');
    } catch (err) {
      Alert.alert('Could not send the code', err?.message || 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken) => {
    setLoading(true);
    try {
      await googleLogin(idToken);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Google sign-in failed', err?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (!cleanCode(emailCode)) {
      Alert.alert('Enter the code', 'Type the code from the email.');
      return;
    }
    if (emailStep === 'name' && !fullName.trim()) {
      Alert.alert('Your name', 'Tell us your name to create your account.');
      return;
    }
    setLoading(true);
    try {
      const data = await verifyEmailOtp(email, emailCode, emailStep === 'name' ? fullName : '');
      if (data && data.registered) {
        router.replace('/(tabs)');
      } else {
        setEmailStep('name');
      }
    } catch (err) {
      Alert.alert('Sign-in failed', err?.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
      return;
    }
    const fullPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;
    setLoading(true);
    try {
      const data = await sendOtp(fullPhone);
      if (data) {
        setOtpSent(true);
        Alert.alert('OTP Sent', data.otp ? `Verification Code: ${data.otp}` : 'An OTP has been sent to your mobile number.');
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[DEV ONLY] sendOtp failed, enabling OTP entry fallback');
        setOtpSent(true);
        return;
      }
      Alert.alert('Could not send OTP', err?.message || 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppOtp = async () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
      return;
    }
    const fullPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;
    setLoading(true);
    try {
      const data = await sendOtp(fullPhone, 'whatsapp');
      if (data) {
        setOtpSent(true);
        Alert.alert('WhatsApp Code Sent', data.otp ? `Verification Code: ${data.otp}` : 'A verification code has been dispatched to your WhatsApp.');
      }
    } catch (err) {
      Alert.alert('Could not send via WhatsApp', err?.message || 'Please use Email or SMS.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Enter OTP', 'Please enter the OTP to continue.');
      return;
    }
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? `+${cleanPhone}` : `+91${cleanPhone.slice(-10)}`;
    setLoading(true);
    try {
      const success = await verifyOtp(fullPhone, otp);
      if (success) {
        router.replace('/(tabs)');
      }
    } catch (err) {
      if (!__DEV__) {
        Alert.alert('Verification Failed', err.message || 'Invalid OTP code.');
        return;
      }
      console.warn('[DEV ONLY] verifyOtp error, attempting fallback preset verify', err.message);
      const devSuccess = await loginWithDevPreset('user', fullPhone, otp);
      if (devSuccess) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Verification Failed', err.message || 'Invalid OTP code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const success = await loginEmail(email.trim(), password);
      if (success) {
        router.replace('/(tabs)');
      }
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperPresetLogin = async (role) => {
    setLoading(true);
    const success = await loginWithDevPreset(role);
    setLoading(false);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const devRoles = [
    { id: 'user', icon: '👤', label: 'Resident' },
    { id: 'resident_member', icon: '🏠', label: 'Society Resident' },
    { id: 'society_admin', icon: '🔑', label: 'Society Admin' },
    { id: 'security_guard', icon: '🛡️', label: 'Security Guard' },
    { id: 'shop_owner', icon: '🏪', label: 'Shop Owner' },
    { id: 'service_provider', icon: '🛠️', label: 'Gig Worker' },
    { id: 'delivery_agent', icon: '🛵', label: 'Rider' },
    { id: 'field_agent', icon: '📋', label: 'Field Agent' },
    { id: 'area_agent', icon: '🗺️', label: 'Area Agent' },
    { id: 'territory_admin', icon: '👔', label: 'Franchise Partner' },
    { id: 'moderator', icon: '🛡️', label: 'Moderator' },
    { id: 'super_admin', icon: '👑', label: 'Super Admin' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <Text style={styles.title}>LocalSampark</Text>
        <Text style={styles.subtitle}>
          Sign in to connect with your local neighborhood
        </Text>

        {offerGoogle(loginMethods) && (
          <GoogleSignInButton
            disabled={loading}
            onIdToken={handleGoogleToken}
            onError={(err) => Alert.alert('Google sign-in failed', err.message)}
          />
        )}

        {/* Toggle Login Method */}
        <View style={styles.toggleContainer}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: method === t.id }}
              style={[styles.toggleButton, method === t.id && styles.toggleButtonActive]}
              onPress={() => { setMethod(t.id); setOtpSent(false); setEmailStep('address'); }}
            >
              <Text style={[styles.toggleButtonText, method === t.id && styles.toggleButtonTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {method === 'emailOtp' ? (
          emailStep === 'address' ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="name@email.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                testID="email-otp-address"
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleSendEmailCode} disabled={loading || !email}>
                <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Email me a code'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Code from the email</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                value={emailCode}
                onChangeText={setEmailCode}
                maxLength={8}
                testID="email-otp-code"
              />
              {emailStep === 'name' && (
                <>
                  <Text style={styles.label}>Your name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your full name"
                    placeholderTextColor="#64748b"
                    autoComplete="name"
                    value={fullName}
                    onChangeText={setFullName}
                    maxLength={100}
                    testID="email-otp-name"
                  />
                </>
              )}
              <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyEmailCode} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Checking...' : emailStep === 'name' ? 'Create account' : 'Sign in'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => { setEmailStep('address'); setEmailCode(''); }}>
                <Text style={{ color: '#3b82f6', textAlign: 'center', fontWeight: 'bold' }}>Use a different email</Text>
              </TouchableOpacity>
            </View>
          )
        ) : method === 'phone' ? (
          !otpSent ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Sending Code...' : '📱 Send OTP via SMS'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: '#10b981', marginTop: 10 }]} 
                onPress={handleSendWhatsAppOtp} 
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Sending...' : '💬 Send Code via WhatsApp'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Enter 6-Digit OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP & Login'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setOtpSent(false)}>
                <Text style={{ color: '#3b82f6', textAlign: 'center', fontWeight: 'bold' }}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@email.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleEmailLogin} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In with Email'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Auth Navigation Links */}
        <View style={styles.authNavLinks}>
          <TouchableOpacity onPress={() => router.push('/forgot-password')} style={{ marginBottom: 12 }}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
          
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={styles.noAccountText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerText}>Register here</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Presets — debug builds only.
            This panel shipped in the release APK, offering any installer a
            one-tap login as Shop Owner, Territory Admin or Super Admin. The
            __DEV__ guard is compile-time: Metro replaces it with `false` for a
            release bundle, so the whole block (and the role list) is dropped by
            dead-code elimination rather than merely hidden. */}
        {__DEV__ && (
          <View style={{ marginTop: 40, width: '100%', backgroundColor: '#ffffff', borderRadius: 12, padding: 16 }}>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
              ⚡ QUICK DEVELOPER PRESET LOGINS
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
              {devRoles.map(role => (
                <TouchableOpacity
                  key={role.id}
                  style={styles.presetButton}
                  onPress={() => handleDeveloperPresetLogin(role.id)}
                  disabled={loading}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{role.icon}</Text>
                  <Text style={{ color: '#0f172a', fontSize: 10, textAlign: 'center' }}>{role.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center'
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleButtonTextActive: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  presetButton: {
    width: '30%',
    backgroundColor: '#e2e8f0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  authNavLinks: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  noAccountText: {
    color: '#64748b',
    fontSize: 14,
  },
  registerText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  }
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { apiPost } from '../src/lib/api';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loginWithDevPreset, API_URL, sendOtp, verifyOtp } = useAuth();

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const data = await sendOtp(phoneNumber);
      if (data) {
        setOtpSent(true);
        Alert.alert('OTP Sent', data.mock ? 'Test OTP sent: 123456' : 'An OTP has been sent to your mobile number.');
      }
    } catch (err) {
      console.warn('sendOtp failed, enabling OTP entry fallback');
      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Enter OTP', 'Please enter the OTP to continue.');
      return;
    }
    setLoading(true);
    try {
      const success = await verifyOtp(phoneNumber, otp);
      if (success) {
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.warn('verifyOtp error, attempting fallback preset verify', err.message);
      const devSuccess = await loginWithDevPreset('user', phoneNumber, otp);
      if (devSuccess) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Verification Failed', err.message || 'Invalid OTP code.');
      }
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
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <Text style={styles.title}>LocalSampark</Text>
        <Text style={styles.subtitle}>
          {!otpSent ? "Enter your phone number to continue" : `Enter the OTP sent to ${phoneNumber}`}
        </Text>

        {!otpSent ? (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 9999999999"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>One Time Password (OTP)</Text>
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

        {/* Developer Presets */}
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
    color: '#0f172a',
    fontSize: 16,
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

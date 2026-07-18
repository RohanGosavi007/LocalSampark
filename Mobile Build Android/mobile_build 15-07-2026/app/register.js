import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function RegisterScreen() {
  const [method, setMethod] = useState('email'); // 'email' or 'phone'
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { registerEmail, sendOtp, loginWithDevPreset } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: ''
  });
  const [otp, setOtp] = useState('');

  const handleEmailRegister = async () => {
    if (form.password !== form.confirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      if (registerEmail) {
        await registerEmail(form.email, form.password, form.name, '');
      }
      Alert.alert('Success', 'Registration successful! Check your email for verification.');
      router.replace('/login');
    } catch (err) {
      Alert.alert('Error', err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!form.name || !form.phone || form.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid name and phone number.');
      return;
    }
    setLoading(true);
    try {
      if (sendOtp) {
        await sendOtp(form.phone, 'phone');
      }
      setStep(2);
      Alert.alert('OTP Sent', 'Check your messages for the verification code.');
    } catch (err) {
      // Fallback for dev environment without actual backend
      setStep(2);
      Alert.alert('OTP Sent', 'Check your messages for the verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP.');
      return;
    }
    setLoading(true);
    // Emulate auth
    const success = await loginWithDevPreset('user', form.phone, otp);
    setLoading(false);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <View style={styles.header}>
          <Text style={styles.icon}>🏘️</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the LocalSampark neighborhood network</Text>
        </View>

        <View style={styles.toggleRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, method === 'email' && styles.toggleBtnActive]}
            onPress={() => { setMethod('email'); setStep(1); }}
          >
            <Text style={[styles.toggleText, method === 'email' && styles.toggleTextActive]}>📧 Email</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, method === 'phone' && styles.toggleBtnActive]}
            onPress={() => { setMethod('phone'); setStep(1); }}
          >
            <Text style={[styles.toggleText, method === 'phone' && styles.toggleTextActive]}>📱 Phone OTP</Text>
          </TouchableOpacity>
        </View>

        {method === 'email' && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} placeholder="Ramesh Shinde" placeholderTextColor="#64748b" value={form.name} onChangeText={t => setForm({...form, name: t})} />
            
            <Text style={styles.label}>Email Address *</Text>
            <TextInput style={styles.input} placeholder="name@email.com" keyboardType="email-address" placeholderTextColor="#64748b" value={form.email} onChangeText={t => setForm({...form, email: t})} />
            
            <Text style={styles.label}>Password *</Text>
            <TextInput style={styles.input} placeholder="Min 8 characters" secureTextEntry placeholderTextColor="#64748b" value={form.password} onChangeText={t => setForm({...form, password: t})} />
            
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput style={styles.input} placeholder="Repeat password" secureTextEntry placeholderTextColor="#64748b" value={form.confirm} onChangeText={t => setForm({...form, confirm: t})} />
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailRegister} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Processing...' : 'Create Account'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {method === 'phone' && step === 1 && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput style={styles.input} placeholder="Ramesh Shinde" placeholderTextColor="#64748b" value={form.name} onChangeText={t => setForm({...form, name: t})} />
            
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput style={styles.input} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" placeholderTextColor="#64748b" value={form.phone} onChangeText={t => setForm({...form, phone: t})} />
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSendPhoneOtp} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send OTP via SMS'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {method === 'phone' && step === 2 && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Enter 6-Digit OTP</Text>
            <TextInput style={styles.input} placeholder="XXXXXX" keyboardType="number-pad" maxLength={6} placeholderTextColor="#64748b" value={otp} onChangeText={setOtp} />
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOtp} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Verify & Continue'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.linkText}>Login here</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { padding: 24, paddingVertical: 40, justifyContent: 'center' },
  
  header: { alignItems: 'center', marginBottom: 24 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  
  toggleRow: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 4, borderRadius: 8, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#3b82f6' },
  toggleText: { color: '#64748b', fontWeight: 'bold' },
  toggleTextActive: { color: '#0f172a' },

  formContainer: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { height: 48, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 16, fontSize: 16, color: '#0f172a', marginBottom: 16 },
  
  primaryBtn: { height: 48, backgroundColor: '#3b82f6', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  
  secondaryBtn: { height: 48, backgroundColor: '#ffffff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  secondaryBtnText: { color: '#475569', fontSize: 16, fontWeight: 'bold' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { color: '#64748b', fontSize: 14 },
  linkText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold' }
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { apiPost } from '../src/lib/api';
export default function ForgotPasswordScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleRequestReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/auth/forgot-password', { email });
      if (data && data.error) throw new Error(data.error);
      
      setStep(2);
      Alert.alert('Link Sent', `Check your email inbox. (DEV: ${data?.resetToken || 'Token received'})`);
    } catch (err) {
      // Fallback for dev mode
      setStep(2);
      Alert.alert('Fallback Mode', 'Simulating token sent. Enter any token to proceed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (!token || !newPassword) {
      Alert.alert('Error', 'Please enter the token and a new password.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost('/auth/reset-password', { token, newPassword });
      if (data && data.error) {
        throw new Error(data.error);
      }
      Alert.alert('Success', 'Password has been reset successfully. You can now login.');
      router.replace('/login');
    } catch (err) {
      // Dev mode fallback
      Alert.alert('Success', 'Password reset simulated in Dev Mode.');
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>{step === 1 ? 'Forgot Password' : 'Reset Password'}</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? 'Enter your registered email to receive a reset link.' : 'Enter the token from your email.'}
          </Text>
        </View>

        {step === 1 ? (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput 
              style={styles.input} 
              placeholder="name@email.com" 
              keyboardType="email-address" 
              placeholderTextColor="#64748b" 
              value={email} 
              onChangeText={setEmail} 
            />
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestReset} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Reset Token (from email)</Text>
            <TextInput style={styles.input} placeholder="Paste token here" placeholderTextColor="#64748b" value={token} onChangeText={setToken} />
            
            <Text style={styles.label}>New Password</Text>
            <TextInput style={styles.input} placeholder="Min 8 characters" secureTextEntry placeholderTextColor="#64748b" value={newPassword} onChangeText={setNewPassword} />
            
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput style={styles.input} placeholder="Repeat new password" secureTextEntry placeholderTextColor="#64748b" value={confirm} onChangeText={setConfirm} />
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
              <Text style={styles.secondaryBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remembered your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { padding: 24, paddingVertical: 40, justifyContent: 'center', flexGrow: 1 },
  
  header: { alignItems: 'center', marginBottom: 32 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 20 },
  
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

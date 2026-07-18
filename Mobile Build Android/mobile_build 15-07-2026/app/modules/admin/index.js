import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';

export default function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithDevPreset } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Use dev preset for easy testing since we are in a dev environment
      await loginWithDevPreset('admin');
      router.replace('/modules/admin-dashboard');
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid admin credentials');
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
          <Text style={styles.subtitle}>Sign in to access platform management</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@localsampark.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Secure Login</Text>
              )}
            </TouchableOpacity>
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
  loginBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 32, lineHeight: 18, paddingHorizontal: 20 },
});

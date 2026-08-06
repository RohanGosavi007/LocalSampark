import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

export default function DevLoginScreen() {
  const { loginWithDevPreset } = useAuth();
  const router = useRouter();

  if (!__DEV__) return null;

  const handleMockLogin = async (role) => {
    // loginWithDevPreset injects the fake token and user info inside AuthContext
    await loginWithDevPreset(role.toLowerCase());
    
    if (role.startsWith('VENDOR')) router.replace('/shop-dashboard');
    else if (role === 'DELIVERY') router.replace('/delivery-dashboard');
    else if (role === 'ADMIN') router.replace('/admin-dashboard');
    else router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dev Quick Login</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={[styles.button, styles.btnCustomer]} onPress={() => handleMockLogin('CUSTOMER')}>
          <Text style={styles.btnText}>Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.btnVendor]} onPress={() => handleMockLogin('VENDOR_OWNER')}>
          <Text style={styles.btnText}>V: Owner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.btnVendorStaff]} onPress={() => handleMockLogin('VENDOR_STAFF')}>
          <Text style={styles.btnText}>V: Staff</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.btnDelivery]} onPress={() => handleMockLogin('DELIVERY')}>
          <Text style={styles.btnText}>Delivery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.btnAdmin, { width: 200 }]} onPress={() => handleMockLogin('ADMIN')}>
          <Text style={styles.btnText}>Admin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 10,
    zIndex: 9999,
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: 200,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: 96,
    alignItems: 'center',
  },
  btnCustomer: { backgroundColor: '#2563eb' },
  btnVendor: { backgroundColor: '#059669' },
  btnVendorStaff: { backgroundColor: '#065f46' },
  btnDelivery: { backgroundColor: '#9333ea' },
  btnAdmin: { backgroundColor: '#e11d48' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' }
});

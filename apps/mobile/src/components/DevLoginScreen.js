import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

/**
 * Demo persona switcher (development builds only).
 *
 * The buttons used to pass 'customer', 'vendor_owner', 'vendor_staff',
 * 'delivery' and 'admin' — none of them a key in loginWithDevPreset's phone
 * map, so every button fell through to the default number and signed in as the
 * consumer. "V: Owner" opened the shop dashboard as a shopper. Each persona now
 * names a seeded role (seed-investor-demo.js) and lands on that role's screen.
 *
 * Collapsed by default: a permanent overlay sat on top of whatever the
 * presenter was trying to show.
 */
const PERSONAS = [
  { role: 'user', label: 'Consumer', route: '/(tabs)', color: '#2563eb' },
  { role: 'resident_member', label: 'Resident', route: '/modules/society', color: '#0891b2' },
  { role: 'society_admin', label: 'Committee', route: '/modules/society', color: '#4f46e5' },
  { role: 'security_guard', label: 'Gate guard', route: '/modules/society', color: '#b45309' },
  { role: 'shop_owner', label: 'Merchant', route: '/shop-dashboard', color: '#059669' },
  { role: 'delivery_agent', label: 'Rider', route: '/delivery-dashboard', color: '#9333ea' },
  { role: 'user', label: 'Commuter', route: '/carpool', color: '#0f766e' },
  { role: 'user', label: 'Job seeker', route: '/jobs', color: '#be123c' },
];

export default function DevLoginScreen() {
  const { loginWithDevPreset } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  if (!__DEV__) return null;

  const switchTo = async (p) => {
    setBusy(p.label);
    const ok = await loginWithDevPreset(p.role);
    setBusy(null);
    if (!ok) {
      Alert.alert('Sign-in failed', 'Is the backend running and seeded? npm run seed:demo --workspace=backend');
      return;
    }
    setOpen(false);
    router.replace(p.route);
  };

  if (!open) {
    return (
      <TouchableOpacity style={styles.fab} onPress={() => setOpen(true)}
        accessibilityRole="button" accessibilityLabel="Open demo persona switcher">
        <Text style={styles.fabText}>👤</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Switch persona</Text>
        <TouchableOpacity onPress={() => setOpen(false)} style={styles.close}
          accessibilityRole="button" accessibilityLabel="Close persona switcher">
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {PERSONAS.map((p) => (
          <TouchableOpacity key={p.label} style={[styles.button, { backgroundColor: p.color }]}
            onPress={() => switchTo(p)} disabled={Boolean(busy)}
            accessibilityRole="button" accessibilityLabel={`Sign in as ${p.label}`}>
            {busy === p.label ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{p.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 96, right: 16, width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.9)', alignItems: 'center', justifyContent: 'center',
    elevation: 10, zIndex: 9999, borderWidth: 1, borderColor: '#334155',
  },
  fabText: { fontSize: 20 },
  container: {
    position: 'absolute', bottom: 40, right: 16, backgroundColor: 'rgba(15, 23, 42, 0.96)',
    padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', elevation: 10, zIndex: 9999,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  closeText: { color: '#cbd5e1', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: 216 },
  button: { minHeight: 44, borderRadius: 10, width: 104, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

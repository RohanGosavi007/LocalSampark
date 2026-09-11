import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { apiGet } from '../../../../src/lib/api';

/**
 * Two parcels were hardcoded — an Amazon delivery "At Gate" since 2:30 PM and a
 * collected BlueDart. A resident could have walked down to the gate for a parcel
 * that was not there.
 */
export default function PackagesTab({ role }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet('/society-management/packages/pending');
        const rows = res?.packages ?? res?.data ?? (Array.isArray(res) ? res : []);
        setPackages(
          rows.map((p) => ({
            id: String(p.id),
            courier: p.courier_name || p.courier || 'Parcel',
            status: String(p.status || 'pending').toLowerCase() === 'collected' ? 'Collected' : 'At Gate',
            code: p.tracking_code || p.code || '',
            date: p.created_at ? new Date(p.created_at).toLocaleString() : '',
          }))
        );
      } catch (err) {
        setPackages([]);
        setError(err?.message || 'Could not load packages.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {role === 'guard' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Receive Delivery Package</Text>
          <Text style={styles.subtitle}>Log incoming courier packages for residents.</Text>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>+ Log New Package</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{role === 'guard' ? 'Recent Deliveries' : 'My Packages'}</Text>
        {loading ? (
          <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
        ) : packages.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>
              {error ? 'Could not load packages' : 'Nothing at the gate'}
            </Text>
            <Text style={styles.stateBody}>
              {error || 'Parcels logged by the guard will appear here.'}
            </Text>
          </View>
        ) : packages.map(pkg => (
          <View key={pkg.id} style={styles.pkgRow}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📦</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.pkgTitle}>{pkg.courier}</Text>
              <Text style={styles.pkgMeta}>{pkg.code} • {pkg.date}</Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <View style={[styles.badge, pkg.status === 'Collected' ? styles.badgeSuccess : styles.badgeWarning]}>
                <Text style={[styles.badgeText, pkg.status === 'Collected' ? styles.badgeSuccessText : styles.badgeWarningText]}>
                  {pkg.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stateBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 16 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  
  pkgRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  icon: { fontSize: 20 },
  pkgTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  pkgMeta: { color: '#64748b', fontSize: 11 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  badgeSuccessText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  badgeWarning: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' },
  badgeWarningText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' }
});

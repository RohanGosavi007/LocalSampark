import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function PackagesTab({ role }) {
  const [packages] = useState([
    { id: 1, courier: 'Amazon', status: 'At Gate', code: 'AMZ-8891', date: 'Today, 2:30 PM' },
    { id: 2, courier: 'BlueDart', status: 'Collected', code: 'BLD-1120', date: 'Yesterday' }
  ]);

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
        {packages.map(pkg => (
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

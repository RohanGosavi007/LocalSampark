import React from 'react';
import { Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  ROLES,
  ROLE_LABELS,
  ROLE_ICONS,
  ROLE_COLORS,
  CITIZEN_MODULES,
  MODULE_ACCESS,
  ROLE_TABS,
  getTabsForRole,
  isBusinessRole,
  isAdminRole,
  hasAccess,
} from './rolePolicy';

/**
 * The policy lives in ./rolePolicy, which holds no JSX and can therefore be
 * tested without a React runtime. Re-exported here so every existing import of
 * this module keeps working.
 */
export {
  ROLES,
  ROLE_LABELS,
  ROLE_ICONS,
  ROLE_COLORS,
  CITIZEN_MODULES,
  MODULE_ACCESS,
  ROLE_TABS,
  getTabsForRole,
  isBusinessRole,
  isAdminRole,
  hasAccess,
};

// ─── ROLE GUARD HOC ───────────────────────────────────────────
export function withRoleGuard(WrappedComponent, moduleName) {
  return function RoleGuard(props) {
    const { user, activeRole } = useAuth();
    const currentRole = activeRole || user?.role;

    if (!user) {
      return (
        <SafeAreaView style={styles.container}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Authentication Required</Text>
          <Text style={styles.subtitle}>Please log in to access this feature.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/login')}>
            <Text style={styles.btnText}>Go to Login</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    if (!hasAccess(currentRole, moduleName)) {
      return (
        <SafeAreaView style={styles.container}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Access Restricted</Text>
          <Text style={styles.subtitle}>
            Your current role ({ROLE_LABELS[currentRole] || currentRole}) does not have permission to view this section.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 24 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  btn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});

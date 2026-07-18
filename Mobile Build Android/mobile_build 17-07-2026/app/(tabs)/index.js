import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { ROLES, isBusinessRole, isAdminRole } from '../../src/utils/permissions';

// Import Dashboards
import ResidentDashboard from '../../src/screens/dashboards/ResidentDashboard';
import ShopDashboard from '../../src/screens/dashboards/ShopDashboard';
import AdminDashboard from '../../src/screens/dashboards/AdminDashboard';
import DeliveryDashboard from '../../src/screens/dashboards/DeliveryDashboard';
import ServiceDashboard from '../../src/screens/dashboards/ServiceDashboard';
import FieldDashboard from '../../src/screens/dashboards/FieldDashboard';
import FranchiseDashboard from '../../src/screens/dashboards/FranchiseDashboard';
import SecurityDashboard from '../../src/screens/dashboards/SecurityDashboard';

export default function HomeScreen() {
  const { user, activeRole } = useAuth();

  if (!user || !activeRole) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  // Render Admin Dashboard
  if (isAdminRole(activeRole) && activeRole !== ROLES.SOCIETY_ADMIN && activeRole !== ROLES.TERRITORY_ADMIN) {
    return (
      <SafeAreaView style={styles.container}>
        <AdminDashboard user={user} />
      </SafeAreaView>
    );
  }

  // Render Role-Specific Dashboards (Removing all mock fallbacks!)
  if (activeRole === ROLES.SHOP_OWNER) {
    return <SafeAreaView style={styles.container}><ShopDashboard user={user} /></SafeAreaView>;
  }
  
  if (activeRole === ROLES.DELIVERY_AGENT) {
    return <SafeAreaView style={styles.container}><DeliveryDashboard user={user} /></SafeAreaView>;
  }

  if (activeRole === ROLES.SERVICE_PROVIDER) {
    return <SafeAreaView style={styles.container}><ServiceDashboard user={user} /></SafeAreaView>;
  }

  if (activeRole === ROLES.FIELD_AGENT || activeRole === ROLES.AREA_AGENT) {
    return <SafeAreaView style={styles.container}><FieldDashboard user={user} /></SafeAreaView>;
  }

  if (activeRole === ROLES.TERRITORY_ADMIN) {
    return <SafeAreaView style={styles.container}><FranchiseDashboard user={user} /></SafeAreaView>;
  }

  if (activeRole === ROLES.SECURITY_GUARD) {
    return <SafeAreaView style={styles.container}><SecurityDashboard user={user} /></SafeAreaView>;
  }

  // Default Consumer/Resident Dashboard (Catch-all for Users, Residents, Society Admins)
  return (
    <SafeAreaView style={styles.container}>
      <ResidentDashboard user={user} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  genericContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24 }
});

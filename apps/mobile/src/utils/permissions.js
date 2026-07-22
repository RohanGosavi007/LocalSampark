import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';

// ─── ROLE DEFINITIONS ─────────────────────────────────────────
export const ROLES = {
  VISITOR: 'visitor',
  USER: 'user',
  RESIDENT_MEMBER: 'resident_member',
  SOCIETY_ADMIN: 'society_admin',
  SECURITY_GUARD: 'security_guard',
  SHOP_OWNER: 'shop_owner',
  SERVICE_PROVIDER: 'service_provider',
  DELIVERY_AGENT: 'delivery_agent',
  FIELD_AGENT: 'field_agent',
  AREA_AGENT: 'area_agent',
  TERRITORY_ADMIN: 'territory_admin',
  MODERATOR: 'moderator',
  SUPER_ADMIN: 'super_admin'
};

// ─── ROLE DISPLAY NAMES ───────────────────────────────────────
export const ROLE_LABELS = {
  [ROLES.VISITOR]: 'Visitor',
  [ROLES.USER]: 'Resident',
  [ROLES.RESIDENT_MEMBER]: 'Resident Member',
  [ROLES.SOCIETY_ADMIN]: 'Society Admin',
  [ROLES.SECURITY_GUARD]: 'Security Guard',
  [ROLES.SHOP_OWNER]: 'Shop Owner',
  [ROLES.SERVICE_PROVIDER]: 'Service Provider',
  [ROLES.DELIVERY_AGENT]: 'Delivery Agent',
  [ROLES.FIELD_AGENT]: 'Field Agent',
  [ROLES.AREA_AGENT]: 'Area Agent',
  [ROLES.TERRITORY_ADMIN]: 'Franchise Partner',
  [ROLES.MODERATOR]: 'Moderator',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
};

// ─── ROLE ICONS ───────────────────────────────────────────────
export const ROLE_ICONS = {
  [ROLES.USER]: '👤',
  [ROLES.RESIDENT_MEMBER]: '🏠',
  [ROLES.SOCIETY_ADMIN]: '🏢',
  [ROLES.SECURITY_GUARD]: '🛡️',
  [ROLES.SHOP_OWNER]: '🏪',
  [ROLES.SERVICE_PROVIDER]: '🔧',
  [ROLES.DELIVERY_AGENT]: '🏍️',
  [ROLES.FIELD_AGENT]: '📋',
  [ROLES.AREA_AGENT]: '📊',
  [ROLES.TERRITORY_ADMIN]: '🤝',
  [ROLES.MODERATOR]: '🛡️',
  [ROLES.SUPER_ADMIN]: '⚡',
};

// ─── ROLE COLORS ──────────────────────────────────────────────
export const ROLE_COLORS = {
  [ROLES.USER]: '#3b82f6',
  [ROLES.RESIDENT_MEMBER]: '#10b981',
  [ROLES.SOCIETY_ADMIN]: '#8b5cf6',
  [ROLES.SECURITY_GUARD]: '#f97316',
  [ROLES.SHOP_OWNER]: '#06b6d4',
  [ROLES.SERVICE_PROVIDER]: '#eab308',
  [ROLES.DELIVERY_AGENT]: '#ef4444',
  [ROLES.FIELD_AGENT]: '#14b8a6',
  [ROLES.AREA_AGENT]: '#a855f7',
  [ROLES.TERRITORY_ADMIN]: '#f59e0b',
  [ROLES.MODERATOR]: '#6366f1',
  [ROLES.SUPER_ADMIN]: '#ec4899',
};

// ─── MODULE ACCESS MATRIX ─────────────────────────────────────
// Defines which roles can access which modules
export const MODULE_ACCESS = {
  // Consumer modules
  directory: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],
  services: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],
  subscriptions: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],
  society: [ROLES.RESIDENT_MEMBER, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],
  carpool: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  marketplace: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  properties: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  pets: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  jobs: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  health: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  events: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],
  bills: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  earn: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.FIELD_AGENT, ROLES.SUPER_ADMIN],
  referral: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  premium: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-detail': [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  'register-shop': [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  about: Object.values(ROLES),
  chat: Object.values(ROLES),
  dashboard: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  care: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  delivery: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  chef: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  scrap: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN, ROLES.SHOP_OWNER, ROLES.FIELD_AGENT],
  community_hub: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  volunteer: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  donations: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],

  // Shop Owner modules
  'shop-dashboard': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-products': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-orders': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-appointments': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],
  'shop-analytics': [ROLES.SHOP_OWNER, ROLES.SUPER_ADMIN],

  // Delivery modules
  'delivery-available': [ROLES.DELIVERY_AGENT, ROLES.SUPER_ADMIN],
  'delivery-active': [ROLES.DELIVERY_AGENT, ROLES.SUPER_ADMIN],
  'delivery-earnings': [ROLES.DELIVERY_AGENT, ROLES.SUPER_ADMIN],

  // Service Provider modules
  'service-bookings': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  'service-calendar': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  'service-portfolio': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  'service-earnings': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],

  // Field Agent modules
  'field-onboard': [ROLES.FIELD_AGENT, ROLES.AREA_AGENT, ROLES.SUPER_ADMIN],
  'field-leads': [ROLES.FIELD_AGENT, ROLES.AREA_AGENT, ROLES.SUPER_ADMIN],
  'field-earnings': [ROLES.FIELD_AGENT, ROLES.SUPER_ADMIN],

  // Franchise modules
  crm: [ROLES.SHOP_OWNER, ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  franchise: [ROLES.TERRITORY_ADMIN, ROLES.AREA_AGENT, ROLES.SUPER_ADMIN],
  'franchise-shops': [ROLES.TERRITORY_ADMIN, ROLES.SUPER_ADMIN],
  'franchise-agents': [ROLES.TERRITORY_ADMIN, ROLES.SUPER_ADMIN],
  'franchise-revenue': [ROLES.TERRITORY_ADMIN, ROLES.SUPER_ADMIN],

  // Security modules
  'security-gate': [ROLES.SECURITY_GUARD, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],
  'sos-dashboard': [ROLES.SECURITY_GUARD, ROLES.SOCIETY_ADMIN, ROLES.SUPER_ADMIN],

  // Moderator modules
  'mod-content': [ROLES.MODERATOR, ROLES.SUPER_ADMIN],
  'mod-reports': [ROLES.MODERATOR, ROLES.SUPER_ADMIN],

  // Global / App modules
  features: Object.values(ROLES),
  download: Object.values(ROLES),
  'order-tracking': [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  checkout: [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  'service-detail': [ROLES.USER, ROLES.RESIDENT_MEMBER, ROLES.SUPER_ADMIN],
  'admin': [ROLES.SUPER_ADMIN],
  'admin-dashboard': [ROLES.SUPER_ADMIN],
  'delivery-dashboard': [ROLES.DELIVERY_AGENT, ROLES.SUPER_ADMIN],
  'service-dashboard': [ROLES.SERVICE_PROVIDER, ROLES.SUPER_ADMIN],
  'field-dashboard': [ROLES.FIELD_AGENT, ROLES.SUPER_ADMIN],
  'franchise-dashboard': [ROLES.TERRITORY_ADMIN, ROLES.SUPER_ADMIN],
};

// ─── ROLE-SPECIFIC TAB CONFIGURATIONS ─────────────────────────
// Defines the bottom tab bar for each role
export const ROLE_TABS = {
  [ROLES.USER]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'directory', title: 'Nearby', icon: '🏪' },
      { name: 'community', title: 'Community', icon: '💬' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.RESIDENT_MEMBER]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'directory', title: 'Nearby', icon: '🏪' },
      { name: 'community', title: 'Community', icon: '💬' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.SOCIETY_ADMIN]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'directory', title: 'Nearby', icon: '🏪' },
      { name: 'community', title: 'Society', icon: '🏢' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.SHOP_OWNER]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Dashboard', icon: '📊' },
      { name: 'orders', title: 'Orders', icon: '📦' },
      { name: 'products', title: 'Products', icon: '📋' },
      { name: 'appointments', title: 'Bookings', icon: '📅' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.DELIVERY_AGENT]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'available', title: 'Available', icon: '📦' },
      { name: 'active', title: 'Active', icon: '🗺️' },
      { name: 'earnings', title: 'Earnings', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.SERVICE_PROVIDER]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'bookings', title: 'Bookings', icon: '📅' },
      { name: 'reviews', title: 'Reviews', icon: '⭐' },
      { name: 'earnings', title: 'Earnings', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.FIELD_AGENT]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'onboard', title: 'Onboard', icon: '🏪' },
      { name: 'leads', title: 'Leads', icon: '📊' },
      { name: 'earnings', title: 'Earnings', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.SECURITY_GUARD]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Gate', icon: '🛡️' },
    ]
  },
  [ROLES.AREA_AGENT]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Dashboard', icon: '📊' },
      { name: 'onboard', title: 'Onboard', icon: '🏪' },
      { name: 'leads', title: 'Agents', icon: '👥' },
      { name: 'earnings', title: 'Earnings', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.TERRITORY_ADMIN]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Dashboard', icon: '📊' },
      { name: 'shops', title: 'Shops', icon: '🏪' },
      { name: 'agents', title: 'Agents', icon: '👥' },
      { name: 'revenue', title: 'Revenue', icon: '💰' },
      { name: 'profile', title: 'Profile', icon: '👤' },
    ]
  },
  [ROLES.MODERATOR]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'community', title: 'Moderate', icon: '🛡️' },
      { name: 'directory', title: 'Shops', icon: '🏪' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
  [ROLES.SUPER_ADMIN]: {
    group: '(tabs)',
    tabs: [
      { name: 'index', title: 'Home', icon: '🏠' },
      { name: 'directory', title: 'Shops', icon: '🏪' },
      { name: 'community', title: 'Community', icon: '💬' },
      { name: 'more', title: 'More', icon: '🎛️' },
    ]
  },
};

// ─── HELPER: Get tab config for a role ────────────────────────
export function getTabsForRole(role) {
  return ROLE_TABS[role] || ROLE_TABS[ROLES.USER];
}

// ─── HELPER: Check if role is a "business" role ───────────────
export function isBusinessRole(role) {
  return [
    ROLES.SHOP_OWNER,
    ROLES.DELIVERY_AGENT,
    ROLES.SERVICE_PROVIDER,
    ROLES.FIELD_AGENT,
    ROLES.AREA_AGENT,
    ROLES.TERRITORY_ADMIN,
    ROLES.SECURITY_GUARD,
  ].includes(role);
}

// ─── HELPER: Check if role has admin capabilities ─────────────
export function isAdminRole(role) {
  return [
    ROLES.SUPER_ADMIN,
    ROLES.TERRITORY_ADMIN,
    ROLES.AREA_AGENT,
    ROLES.MODERATOR,
    ROLES.SOCIETY_ADMIN,
  ].includes(role);
}

// ─── PERMISSION CHECK ─────────────────────────────────────────
export const hasAccess = (role, moduleName, permissionOverrides = {}) => {
  if (!role) return false;

  // Check per-user override first
  if (permissionOverrides[moduleName] !== undefined) {
    return permissionOverrides[moduleName];
  }

  // Super admin has access to everything
  if (role === ROLES.SUPER_ADMIN) return true;

  // Check access matrix
  const allowedRoles = MODULE_ACCESS[moduleName] || [];
  return allowedRoles.includes(role);
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

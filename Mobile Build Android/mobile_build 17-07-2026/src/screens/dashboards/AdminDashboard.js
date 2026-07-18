import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function AdminDashboard({ user }) {
  // Mock data for Admin dashboard
  const stats = [
    { label: 'Total Revenue (MTD)', value: '₹1.2L', change: '+22%', positive: true },
    { label: 'Active Shops', value: '45', change: '+3 this week', positive: true },
    { label: 'Active Agents', value: '12', change: 'All online', positive: true },
    { label: 'Pending Approvals', value: '8', change: 'Action Needed', positive: false },
  ];

  const quickActions = [
    { icon: '🏪', label: 'Manage Shops', route: '/(tabs)/shops' },
    { icon: '👥', label: 'Manage Agents', route: '/(tabs)/agents' },
    { icon: '💰', label: 'Revenue Portal', route: '/(tabs)/revenue' },
    { icon: '🗺️', label: 'Franchises', route: '/(admin)/franchises' },
    { icon: '💸', label: 'Payouts', route: '/(admin)/payouts' },
    { icon: '🛒', label: 'Marketplace Audit', route: '/(admin)/marketplace' },
    { icon: '🚴', label: 'Delivery Telemetry', route: '/(admin)/delivery' },
    { icon: '🏘️', label: 'Society Audit', route: '/(admin)/society' },
    { icon: '💳', label: 'Wallet Transactions', route: '/(admin)/wallet' },
    { icon: '🎉', label: 'Events Audit', route: '/(admin)/events' },
    { icon: '🏥', label: 'Medical Records', route: '/(admin)/medical' },
    { icon: '📦', label: 'Subscriptions', route: '/(admin)/subscriptions' },
    { icon: '👑', label: 'Premium (Free Trial)', route: '/(admin)/premium' },
    { icon: '🚨', label: 'SOS Active', route: '/(admin)/sos' },
    { icon: '📈', label: 'CRM Leads', route: '/(admin)/crm' },
    { icon: '📢', label: 'Community Posts', route: '/(admin)/community' },
  ];

  const pendingQueue = [
    { id: 1, name: 'Sharma Electronics', type: 'Shop Registration', time: '2 hours ago' },
    { id: 2, name: 'Rahul Delivery', type: 'Agent Onboarding', time: '5 hours ago' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Portal</Text>
          <Text style={styles.subtitle}>{user?.role?.replace('_', ' ').toUpperCase()} • {user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Text style={styles.iconText}>🔔</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>8</Text></View>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <View key={idx} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={[styles.statChange, { color: stat.positive ? '#10b981' : '#f59e0b' }]}>
              {stat.change}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Admin Tools</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={styles.actionCard}
            onPress={() => router.push(action.route)}
          >
            <View style={styles.actionIconBg}>
              <Text style={styles.actionIcon}>{action.icon}</Text>
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pending Queue */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Action Required</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>View All Queue</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activityList}>
        {pendingQueue.map((item) => (
          <View key={item.id} style={styles.activityItem}>
            <View style={styles.activityIconBg}>
              <Text style={styles.activityIcon}>⚠️</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{item.name}</Text>
              <Text style={styles.activitySub}>{item.type} • {item.time}</Text>
            </View>
            <TouchableOpacity style={styles.activityActionBtn}>
              <Text style={styles.activityActionText}>Review</Text>
            </TouchableOpacity>
          </View>
        ))}
        {pendingQueue.length === 0 && (
          <Text style={{ color: '#64748b', textAlign: 'center', padding: 16 }}>No pending items.</Text>
        )}
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  notificationBtn: { backgroundColor: '#ffffff', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  iconText: { fontSize: 20 },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#0f172a', fontSize: 10, fontWeight: 'bold' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { color: '#64748b', fontSize: 13, fontWeight: '500', marginBottom: 8 },
  statValue: { color: '#0f172a', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  statChange: { fontSize: 12, fontWeight: '600' },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  seeAllText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  actionCard: { width: '23%', backgroundColor: '#ffffff', padding: 12, borderRadius: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  actionIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionIcon: { fontSize: 24 },
  actionLabel: { color: '#e2e8f0', fontSize: 11, fontWeight: '500', textAlign: 'center' },
  
  activityList: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  activityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activityIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  activityIcon: { fontSize: 20 },
  activityContent: { flex: 1 },
  activityTitle: { color: '#0f172a', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  activitySub: { color: '#64748b', fontSize: 13 },
  activityActionBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  activityActionText: { color: '#0f172a', fontSize: 13, fontWeight: 'bold' }
});

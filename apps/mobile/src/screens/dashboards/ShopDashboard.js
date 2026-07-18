import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useOrderRinger } from '../../context/OrderRingerContext';
import { useNotifications } from '../../context/NotificationContext';
import { useZone } from '../../context/ZoneContext';
import { getManagerRoute } from '../../config/category-config';
import { Ionicons } from '@expo/vector-icons';

export default function ShopDashboard({ user }) {
  const { triggerNewOrder } = useOrderRinger();
  const { unreadCount } = useNotifications();
  const { activeZone } = useZone();

  // Category detection for Pro Manager
  const categorySlug = user?.category_slug || 'retail'; // fallback for demo
  const managerRoute = getManagerRoute(categorySlug);

  // Mock data for shop dashboard
  const stats = [
    { label: 'Today\'s Sales', value: '₹12,450', change: '+15%', positive: true },
    { label: 'Pending Orders', value: '12', change: 'Action Needed', positive: false },
    { label: 'Appointments', value: '5', change: 'For Today', positive: true },
    { label: 'Total Views', value: '342', change: '+5%', positive: true },
  ];

  const quickActions = [
    { icon: '📦', label: 'Manage Orders', route: '/(tabs)/orders' },
    { icon: '📋', label: 'Inventory', route: '/(tabs)/products' },
    { icon: '📅', label: 'Bookings', route: '/(tabs)/appointments' },
    { icon: '💬', label: 'CRM / Chat', route: '/modules/crm' },
    { icon: '📣', label: 'Offers', route: '/modules/promotions' },
    { icon: '📸', label: 'Post Story', route: '/modules/story-create' },
  ];

  const recentActivity = [
    { id: 1, type: 'order', title: 'New Order #4092', amount: '₹450', time: '10 mins ago' },
    { id: 2, type: 'booking', title: 'Service Appointment', person: 'Rahul Verma', time: 'In 2 hours' },
    { id: 3, type: 'payment', title: 'Settlement Received', amount: '₹4,200', time: 'Yesterday' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Shop Dashboard</Text>
          <Text style={styles.subtitle}>{user?.name}'s Store</Text>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingVertical: 2 }}
            onPress={() => router.push('/modules/zone-selector')}
          >
            <Text style={{fontSize: 12}}>📍</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '500', marginLeft: 4 }}>
              {activeZone?.name || 'Select Zone'} <Text style={{ color: '#10b981', fontSize: 10 }}>▼</Text>
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Open</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/modules/notifications')}>
            <Text style={{fontSize: 20}}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Pro Manager Banner */}
      {managerRoute && (
        <TouchableOpacity 
          style={styles.proBanner}
          onPress={() => router.push(`${managerRoute}?category=${categorySlug}`)}
        >
          <View style={styles.proBannerContent}>
            <View style={styles.proIconBg}>
              <Ionicons name="star" size={24} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.proTitle}>Open Pro Manager</Text>
              <Text style={styles.proSub}>Access specialized tools for your category.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#1e3a8a" />
          </View>
        </TouchableOpacity>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <View key={idx} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={[styles.statChange, { color: stat.positive ? '#10b981' : '#ef4444' }]}>
              {stat.change}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
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

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activityList}>
        {recentActivity.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={[styles.activityIconBg, { backgroundColor: activity.type === 'order' ? 'rgba(59, 130, 246, 0.2)' : activity.type === 'payment' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)' }]}>
              <Text style={styles.activityIcon}>
                {activity.type === 'order' ? '📦' : activity.type === 'payment' ? '💰' : '📅'}
              </Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activitySub}>
                {activity.amount ? activity.amount : activity.person} • {activity.time}
              </Text>
            </View>
            <TouchableOpacity style={styles.activityActionBtn}>
              <Text style={styles.activityActionText}>View</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={{ height: 120 }} />

      {/* DEV FLOATING ACTION: Test Order Ringing */}
      <TouchableOpacity 
        style={styles.testRingBtn}
        onPress={() => triggerNewOrder()}
      >
        <Text style={styles.testRingBtnText}>🔔 Test New Order Ring</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 10 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#64748b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 6 },
  statusText: { color: '#10b981', fontWeight: 'bold', fontSize: 12 },
  
  proBanner: { backgroundColor: '#eff6ff', borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#bfdbfe', overflow: 'hidden' },
  proBannerContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  proIconBg: { backgroundColor: '#fff', padding: 8, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  proTitle: { fontSize: 16, fontWeight: '900', color: '#1e3a8a', marginBottom: 2 },
  proSub: { fontSize: 12, color: '#3b82f6' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { color: '#64748b', fontSize: 13, fontWeight: '500', marginBottom: 8 },
  statValue: { color: '#0f172a', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  statChange: { fontSize: 12, fontWeight: '600' },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  seeAllText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  actionCard: { width: '31%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  actionIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionIcon: { fontSize: 24 },
  actionLabel: { color: '#e2e8f0', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  
  activityList: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  activityItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activityIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  activityIcon: { fontSize: 20 },
  activityContent: { flex: 1 },
  activityTitle: { color: '#0f172a', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  activitySub: { color: '#64748b', fontSize: 13 },
  activityActionBtn: { backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  activityActionText: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },
  
  testRingBtn: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, elevation: 5, shadowColor: '#ef4444', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 4 },
  testRingBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});

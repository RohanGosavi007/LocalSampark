import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Shield, Bell, TrendingUp, Store, Users, AlertCircle, ShoppingCart, Bike, Home, Wallet, PartyPopper, Stethoscope, PackageOpen, Crown, Megaphone, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AdminDashboard({ user }) {
  const stats = [
    { label: 'Total Revenue', value: '₹1.2L', change: '+22%', positive: true, icon: TrendingUp, color: '#10b981' },
    { label: 'Active Shops', value: '45', change: '+3 this week', positive: true, icon: Store, color: '#3b82f6' },
    { label: 'Active Agents', value: '12', change: 'All online', positive: true, icon: Users, color: '#8b5cf6' },
    { label: 'Pending Apps', value: '8', change: 'Action Needed', positive: false, icon: AlertCircle, color: '#f59e0b' },
  ];

  const quickActions = [
    { icon: Store, label: 'Shops', route: '/(tabs)/shops', color: '#3b82f6' },
    { icon: Users, label: 'Agents', route: '/(tabs)/agents', color: '#8b5cf6' },
    { icon: TrendingUp, label: 'Revenue', route: '/(tabs)/revenue', color: '#10b981' },
    { icon: Shield, label: 'Franchise', route: '/(admin)/franchises', color: '#f59e0b' },
    { icon: Wallet, label: 'Payouts', route: '/(admin)/payouts', color: '#ef4444' },
    { icon: ShoppingCart, label: 'Market', route: '/(admin)/marketplace', color: '#ec4899' },
    { icon: Bike, label: 'Delivery', route: '/(admin)/delivery', color: '#06b6d4' },
    { icon: Home, label: 'Society', route: '/(admin)/society', color: '#6366f1' },
    { icon: Wallet, label: 'Wallet', route: '/(admin)/wallet', color: '#14b8a6' },
    { icon: PartyPopper, label: 'Events', route: '/(admin)/events', color: '#f43f5e' },
    { icon: Stethoscope, label: 'Medical', route: '/(admin)/medical', color: '#0ea5e9' },
    { icon: PackageOpen, label: 'Subscrip', route: '/(admin)/subscriptions', color: '#84cc16' },
  ];

  const pendingQueue = [
    { id: 1, name: 'Sharma Electronics', type: 'Shop Registration', time: '2 hours ago' },
    { id: 2, name: 'Rahul Delivery', type: 'Agent Onboarding', time: '5 hours ago' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <View style={s.headerLeft}>
            <Shield color="#8b5cf6" size={24} style={{ marginRight: 8 }} />
            <Text style={s.headerTitle}>Super Admin</Text>
          </View>
          <Text style={s.headerSubtitle}>{user?.role?.replace('_', ' ').toUpperCase()} • {user?.name}</Text>
        </View>
        <TouchableOpacity style={s.bellBtn}>
          <Bell size={24} color="#e2e8f0" />
          <View style={s.bellBadge}>
            <Text style={s.bellBadgeText}>8</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        {stats.map((stat, idx) => {
          const IconComp = stat.icon;
          return (
            <View key={idx} style={s.statCard}>
              <View style={s.statIconRow}>
                <View style={[s.statIconBg, { backgroundColor: `${stat.color}20` }]}>
                  <IconComp size={20} color={stat.color} />
                </View>
              </View>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
              <Text style={[s.statChange, { color: stat.positive ? '#34d399' : '#fbbf24' }]}>{stat.change}</Text>
            </View>
          );
        })}
      </View>

      {/* Quick Actions */}
      <View style={{ marginBottom: 24 }}>
        <Text style={s.sectionTitle}>Control Panel</Text>
        <View style={s.actionsGrid}>
          {quickActions.map((action, idx) => {
            const IconComp = action.icon;
            return (
              <TouchableOpacity key={idx} style={s.actionCard} onPress={() => router.push(action.route)}>
                <View style={[s.actionIconBg, { backgroundColor: `${action.color}15` }]}>
                  <IconComp size={20} color={action.color} />
                </View>
                <Text style={s.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Pending Queue */}
      <View style={{ marginBottom: 24 }}>
        <View style={s.queueHeader}>
          <Text style={s.sectionTitle}>Action Required</Text>
          <TouchableOpacity>
            <Text style={s.viewAllText}>View All Queue</Text>
          </TouchableOpacity>
        </View>
        <View style={s.queueContainer}>
          {pendingQueue.map((item, idx) => (
            <View key={item.id} style={[s.queueItem, idx !== pendingQueue.length - 1 && s.queueBorder]}>
              <View style={s.queueLeft}>
                <View style={s.queueIcon}>
                  <AlertCircle size={20} color="#f59e0b" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={s.queueName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.queueMeta}>{item.type} • {item.time}</Text>
                </View>
              </View>
              <TouchableOpacity style={s.reviewBtn}>
                <Text style={s.reviewBtnText}>Review</Text>
              </TouchableOpacity>
            </View>
          ))}
          {pendingQueue.length === 0 && (
            <View style={s.emptyQueue}>
              <CheckCircle2 color="#10b981" size={32} />
              <Text style={s.emptyText}>Queue is empty!</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerRow: { marginBottom: 24, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  bellBtn: { position: 'relative', backgroundColor: '#0f172a', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1e293b' },
  bellBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#020617' },
  bellBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '48%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 16 },
  statIconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  statIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  statChange: { fontSize: 10, fontWeight: '900' },
  sectionTitle: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { width: '23%', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 12, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  actionIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 10, textAlign: 'center' },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  viewAllText: { color: '#60a5fa', fontWeight: '700', fontSize: 12 },
  queueContainer: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 8 },
  queueItem: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  queueBorder: { borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  queueLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  queueIcon: { width: 40, height: 40, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  queueName: { color: '#ffffff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  queueMeta: { color: '#94a3b8', fontSize: 12 },
  reviewBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  reviewBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  emptyQueue: { padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
});

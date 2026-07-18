import React, { useState } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../../src/context/AuthContext';
import { router } from 'expo-router';

function DashboardModule() {
  const { user, walletBalance } = useAuth();
  const [activeTab, setActiveTab] = useState('feed'); // feed, orders, stats, loyalty

  const [orders] = useState([
    { id: '#LS-2041', shop: 'Sharma Grocery', items: 'Milk × 2, Bread × 1', amount: '₹88', status: 'Delivered', date: 'Today, 10:30 AM' },
    { id: '#LS-2039', shop: 'Golden Crumb Bakery', items: 'Chocolate Cake × 1', amount: '₹420', status: 'Out for Delivery', date: 'Today, 9:15 AM' },
    { id: '#LS-2034', shop: 'Pune Pharmacy', items: 'Crocin × 2, Vitamin C', amount: '₹210', status: 'Delivered', date: 'Yesterday' }
  ]);

  const feedItems = [
    { id: 1, type: 'alert', icon: '📢', title: 'Society Security Alert', text: 'Unknown vehicle spotted near Gate B. Report to security at ext. 201.', time: '2 min ago', priority: 'high' },
    { id: 2, type: 'deal', icon: '🛒', title: 'Sharma Grocery Flash Deal', text: 'Fresh organic Paneer arrived! ₹80 per 200g. Only 20 units left.', time: '15 min ago', priority: 'low' },
    { id: 3, type: 'event', icon: '🎉', title: 'Ganesh Festival Community Puja', text: 'Dhanori Residents Welfare Association invites everyone. Saturday, 6 PM at Society Ground.', time: '1 hr ago', priority: 'low' },
    { id: 4, type: 'carpool', icon: '🚗', title: 'Carpool to Hinjewadi', text: 'Rohan Patil offering ride to Hinjewadi Phase 1. Departure 8:45 AM. 2 seats left.', time: '2 hrs ago', priority: 'low' },
    { id: 5, type: 'lost', icon: '🐾', title: 'Lost Pet: Coco (Tabby Cat)', text: 'Last seen near Goodwill Square. Brown fur, orange collar. Please contact Priya.', time: '3 hrs ago', priority: 'medium' },
  ];

  const quickLinks = [
    { label: 'My Wallet', icon: '👛', path: '/(tabs)/wallet' },
    { label: 'Society', icon: '🏘️', path: '/modules/society' },
    { label: 'Carpool', icon: '🚗', path: '/modules/carpool' },
    { label: 'Health SOS', icon: '🏥', path: '/modules/health' },
    { label: 'Nearby Shops', icon: '🏪', path: '/(tabs)/directory' },
    { label: 'Services', icon: '🔧', path: '/modules/services' },
    { label: 'Earn Now', icon: '💸', path: '/modules/earn' },
    { label: 'Refer & Earn', icon: '🎁', path: '/modules/referral' },
    { label: 'Subscriptions', icon: '📅', path: '/modules/subscriptions' },
    { label: 'Events', icon: '🎉', path: '/modules/events' },
    { label: 'Premium Gold', icon: '⭐', path: '/modules/premium' },
    { label: 'Flat Finder', icon: '🏢', path: '/modules/properties' },
    { label: 'Pet Boarding', icon: '🐾', path: '/modules/pets' },
    { label: 'Operations CRM', icon: '📊', path: '/modules/crm' },
    { label: 'Franchise Partner', icon: '🤝', path: '/modules/franchise' },
    { label: 'Care Network', icon: '❤️', path: '/modules/care' }
  ];

  const handleSOS = () => {
    Alert.alert('🚨 Emergency SOS Triggered', 'Dispatching alert to society gate control, block coordinators, and nearby health respondents immediately.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📊 Resident Portal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Welcome Banner */}
        <View style={styles.welcomeCard}>
          <Text style={styles.regionTag}>📍 Dhanori, Pune — Pilot Zone</Text>
          <Text style={styles.welcomeTitle}>Welcome back, Neighbor! 👋</Text>
          <Text style={styles.userName}>{user?.name || 'Resident'}</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleBadge}><Text style={styles.roleText}>✓ VERIFIED RESIDENT</Text></View>
            <TouchableOpacity style={styles.sosBtn} onPress={handleSOS}>
              <Text style={styles.sosText}>🚨 Emergency SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Links Grid */}
        <Text style={styles.sectionTitle}>Quick Access Services</Text>
        <View style={styles.grid}>
          {quickLinks.map((ql, i) => (
            <TouchableOpacity key={i} style={styles.gridBtn} onPress={() => router.push(ql.path)}>
              <View style={styles.gridIconBox}>
                <Text style={{ fontSize: 22 }}>{ql.icon}</Text>
              </View>
              <Text style={styles.gridLabel} numberOfLines={1}>{ql.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Tab Selector */}
        <View style={styles.tabBar}>
          {[
            { key: 'feed', label: '📰 Feed' },
            { key: 'orders', label: '📦 Orders' },
            { key: 'stats', label: '📊 Stats' },
            { key: 'loyalty', label: '🏆 Rewards' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Contents */}
        {activeTab === 'feed' && (
          <View style={styles.tabContentContainer}>
            {feedItems.map(item => (
              <View key={item.id} style={[styles.feedCard, item.priority === 'high' && { borderLeftColor: '#ef4444' }]}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.feedTitle}>{item.title}</Text>
                    <Text style={styles.feedTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.feedDesc}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'orders' && (
          <View style={styles.tabContentContainer}>
            {orders.map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{order.status}</Text></View>
                </View>
                <Text style={styles.shopName}>{order.shop}</Text>
                <Text style={styles.orderItems}>{order.items}</Text>
                <View style={styles.orderFooter}>
                  <Text style={styles.orderDate}>{order.date}</Text>
                  <Text style={styles.orderAmount}>{order.amount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={[styles.tabContentContainer, styles.statsGrid]}>
            {[
              { label: 'Wallet Balance', value: `₹${walletBalance}`, icon: '👛', color: '#3b82f6' },
              { label: 'Orders This Month', value: '14', icon: '📦', color: '#10b981' },
              { label: 'Referrals Earned', value: '₹350', icon: '🎁', color: '#f59e0b' },
              { label: 'Savings vs Zomato', value: '₹1,840', icon: '💰', color: '#60a5fa' },
              { label: 'Society Events RSVPed', value: '3', icon: '🎉', color: '#ec4899' },
              { label: 'Community Posts', value: '8', icon: '💬', color: '#8b5cf6' }
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'loyalty' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.loyaltyHeader}>
              <Text style={styles.loyaltyTitle}>Neighborhood Leaderboard</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>Dhanori Zone</Text></View>
            </View>
            {[
              { rank: 1, name: 'Anita Deshmukh', points: 4500, avatar: '👩‍🏫', highlight: false },
              { rank: 2, name: 'Rohan Patil', points: 4200, avatar: '👨‍💼', highlight: false },
              { rank: 3, name: 'You', points: 3850, avatar: '🏘️', highlight: true },
              { rank: 4, name: 'Vikram Singh', points: 3100, avatar: '👨‍🔧', highlight: false }
            ].map(user => (
              <View key={user.rank} style={[styles.leaderboardRow, user.highlight && styles.leaderboardRowActive]}>
                <Text style={[styles.rankText, user.rank <= 3 && { color: '#f59e0b' }]}>#{user.rank}</Text>
                <Text style={{ fontSize: 24, marginHorizontal: 8 }}>{user.avatar}</Text>
                <Text style={[styles.leaderboardName, user.highlight && { fontWeight: 'bold' }]}>{user.name}</Text>
                <Text style={styles.pointsText}>{user.points} pts</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16, paddingBottom: 60 },
  
  welcomeCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  regionTag: { color: '#60a5fa', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  welcomeTitle: { color: '#64748b', fontSize: 14 },
  userName: { color: '#0f172a', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  roleBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  sosBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  sosText: { color: '#0f172a', fontSize: 10, fontWeight: 'bold' },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24, justifyContent: 'space-between' },
  gridBtn: { width: '23%', backgroundColor: '#ffffff', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', alignItems: 'center', marginBottom: 8 },
  gridIconBox: { backgroundColor: '#ffffff', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  gridLabel: { color: '#475569', fontSize: 9, textAlign: 'center', fontWeight: '500' },
  
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 8, marginBottom: 16, overflow: 'hidden' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { backgroundColor: '#ffffff', borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#0f172a' },
  
  tabContentContainer: { marginBottom: 24 },
  
  feedCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', borderLeftWidth: 4, borderLeftColor: '#3b82f6', marginBottom: 12 },
  feedTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold' },
  feedTime: { color: '#64748b', fontSize: 10 },
  feedDesc: { color: '#475569', fontSize: 12, marginTop: 4, lineHeight: 16 },

  orderCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  badge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#60a5fa', fontSize: 10, fontWeight: 'bold' },
  shopName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  orderItems: { color: '#475569', fontSize: 13, marginBottom: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#ffffff', paddingTop: 12 },
  orderDate: { color: '#64748b', fontSize: 12 },
  orderAmount: { color: '#10b981', fontSize: 14, fontWeight: 'bold' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#64748b', fontSize: 11, textAlign: 'center' },
  
  loyaltyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  loyaltyTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ffffff', marginBottom: 8 },
  leaderboardRowActive: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' },
  rankText: { color: '#64748b', fontSize: 14, fontWeight: 'bold', width: 30, textAlign: 'center' },
  leaderboardName: { color: '#0f172a', fontSize: 14, flex: 1 },
  pointsText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14 }
});

export default withRoleGuard(DashboardModule, 'dashboard');

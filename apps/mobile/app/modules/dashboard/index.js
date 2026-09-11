import React, { useState, useEffect, useCallback } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { apiGet, apiPost } from '../../../src/lib/api';
import { useAuth } from '../../../src/context/AuthContext';
import { router } from 'expo-router';

function DashboardModule() {
  const { user, walletBalance } = useAuth();
  const [activeTab, setActiveTab] = useState('feed'); // feed, orders, stats, loyalty

  /**
   * Orders were three invented purchases — "#LS-2041 from Sharma Grocery, Milk
   * x 2 and Bread x 1, ₹88, Delivered today" — and the community feed was five
   * fabricated posts: a security alert about an unknown vehicle at Gate B, a
   * flash deal, a festival invitation, a carpool offer from a named neighbour,
   * and a lost cat with a description and a contact name. Every resident opened
   * this to the same neighbourhood emergency and the same missing pet.
   */
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [feedError, setFeedError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sosBusy, setSosBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, feedRes] = await Promise.allSettled([
      apiGet('/orders/my-orders'),
      apiGet('/feed/posts?limit=10'),
    ]);

    if (ordersRes.status === 'fulfilled') {
      const rows = ordersRes.value?.data ?? [];
      setOrders(
        rows.slice(0, 5).map((o) => ({
          id: String(o.id),
          shop: o.shop_name || 'Shop',
          items: Number(o.items_count)
            ? `${o.items_count} item${Number(o.items_count) === 1 ? '' : 's'}`
            : '',
          amount: `₹${Number(o.total_amount) || 0}`,
          status: o.status || 'Pending',
          date: o.created_at
            ? new Date(o.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
            : '',
        }))
      );
      setOrdersError(null);
    } else {
      setOrders([]);
      setOrdersError(ordersRes.reason?.message || 'Could not load your orders.');
    }

    if (feedRes.status === 'fulfilled') {
      const rows = Array.isArray(feedRes.value) ? feedRes.value : (feedRes.value?.data ?? []);
      setFeedItems(
        rows.map((p) => ({
          id: String(p.id),
          icon: '📣',
          title: p.title || p.full_name || 'Post',
          text: p.content || p.body || '',
          time: p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
          priority: 'low',
        }))
      );
      setFeedError(null);
    } else {
      setFeedItems([]);
      setFeedError(feedRes.reason?.message || 'Could not load your neighbourhood feed.');
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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

  /**
   * The SOS button announced "Emergency SOS Triggered — Dispatching alert to
   * society gate control, block coordinators, and nearby health respondents
   * immediately" and called nothing. A resident in trouble would have believed
   * three groups of people were on their way.
   *
   * POST /sos/trigger records a real alert and returns the contacts it routed
   * to. On failure this says the alert was NOT raised and offers to dial 112.
   */
  const handleSOS = () => {
    Alert.alert(
      '🚨 Emergency SOS',
      'Raise an emergency alert to your emergency contacts and local responders?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'RAISE ALERT',
          style: 'destructive',
          onPress: async () => {
            if (sosBusy) return;
            setSosBusy(true);
            try {
              const res = await apiPost('/sos/trigger', { type: 'safety' });
              const notified = res?.data?.emergencyContacts?.length ?? 0;
              Alert.alert(
                'Alert raised',
                notified > 0
                  ? `Your alert has been recorded and sent to ${notified} emergency contact${notified === 1 ? '' : 's'}.`
                  : 'Your alert has been recorded. You have no emergency contacts saved yet.'
              );
            } catch (err) {
              Alert.alert(
                'Alert NOT sent',
                `The emergency alert could not be raised (${err?.message || 'network error'}).\n\nCall 112 if you need help now.`,
                [
                  { text: 'Close', style: 'cancel' },
                  { text: 'Call 112', onPress: () => Linking.openURL('tel:112') },
                ]
              );
            } finally {
              setSosBusy(false);
            }
          },
        },
      ]
    );
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
            {loading ? (
              <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
            ) : feedItems.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateTitle}>
                  {feedError ? 'Could not load your feed' : 'Nothing from your neighbourhood yet'}
                </Text>
                <Text style={styles.stateBody}>
                  {feedError || 'Posts from neighbours will appear here.'}
                </Text>
              </View>
            ) : feedItems.map(item => (
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
            {loading ? (
              <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
            ) : orders.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateTitle}>
                  {ordersError ? 'Could not load your orders' : 'No orders yet'}
                </Text>
                <Text style={styles.stateBody}>
                  {ordersError || 'Orders you place will appear here.'}
                </Text>
              </View>
            ) : orders.map(order => (
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

        {/* Five of the six stat tiles were invented: "Orders This Month 14",
            "Referrals Earned ₹350", "Savings vs Zomato ₹1,840", "Society Events
            RSVPed 3", "Community Posts 8". The last of those also named a
            competitor in a savings claim nothing computes. Only the wallet
            balance came from anywhere real; the two figures this screen can
            actually derive are what it shows. */}
        {activeTab === 'stats' && (
          <View style={[styles.tabContentContainer, styles.statsGrid]}>
            {[
              { label: 'Wallet Balance', value: `₹${Number(walletBalance) || 0}`, icon: '👛', color: '#3b82f6' },
              { label: 'Recent Orders', value: String(orders.length), icon: '📦', color: '#10b981' },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* The leaderboard ranked four named neighbours by points — "Anita
            Deshmukh 4,500", "Rohan Patil 4,200", "You 3,850", "Vikram Singh
            3,100" — inventing both the people and the standing. Nothing ranks
            residents, so this points at the rewards screen, which reads the real
            SamparkCoins ledger. */}
        {activeTab === 'loyalty' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>Neighbourhood leaderboard is not available yet</Text>
              <Text style={styles.stateBody}>
                Your own points and history are on the Rewards screen.
              </Text>
              <TouchableOpacity style={styles.stateBtn} onPress={() => router.push('/profile/loyalty')}>
                <Text style={styles.stateBtnText}>Open Rewards</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  stateBtn: { marginTop: 18, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  stateBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
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

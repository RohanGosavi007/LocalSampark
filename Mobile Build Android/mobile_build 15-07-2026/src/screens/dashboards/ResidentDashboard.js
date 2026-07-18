import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import StoriesRow from '../../components/StoriesRow';
import { useNotifications } from '../../context/NotificationContext';
import { useZone } from '../../context/ZoneContext';
import { apiGet } from '../../lib/api';

const { width } = Dimensions.get('window');

export default function ResidentDashboard({ user }) {
  const { unreadCount } = useNotifications();
  const { activeZone } = useZone();
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const data = await apiGet('/feed/posts');
        setFeedPosts(Array.isArray(data) ? data : (data.posts || []));
      } catch (err) {
        console.warn('Failed to load feed:', err);
      } finally {
        setLoadingFeed(false);
      }
    };
    loadFeed();
  }, []);

  const PILLARS = [
    { title: 'Community', icon: '💬', route: '/(tabs)/community', color: '#3b82f6' },
    { title: 'Local Shops', icon: '🛒', route: '/(tabs)/directory', color: '#10b981' },
    { title: 'Gig & Jobs', icon: '🔧', route: '/modules/jobs', color: '#f59e0b' },
    { title: 'Real Estate', icon: '🏢', route: '/modules/properties', color: '#8b5cf6' },
    { title: 'Delivery', icon: '📦', route: '/modules/delivery', color: '#ef4444' },
    { title: 'Carpool', icon: '🚗', route: '/modules/carpool', color: '#06b6d4' },
    { title: 'Society', icon: '🏘️', route: '/modules/society', color: '#6366f1' },
    { title: 'Earn Money', icon: '💸', route: '/modules/earn', color: '#14b8a6' },
  ];

  const QUICK_TILES = [
    { label: 'SOS', icon: '🚨', route: '/modules/sos', bg: '#fee2e2' },
    { label: 'Medical', icon: '🏥', route: '/modules/medical', bg: '#dcfce7' },
    { label: 'Blood Bank', icon: '🩸', route: '/modules/blood-bank', bg: '#fee2e2' },
    { label: 'Services', icon: '🛠️', route: '/(tabs)/services', bg: '#e0e7ff' },
    { label: 'Bills', icon: '🧾', route: '/modules/bills', bg: '#fef3c7' },
    { label: 'Chef', icon: '🍲', route: '/modules/chef', bg: '#ffedd5' },
    { label: 'Equipment', icon: '🚜', route: '/modules/equipment', bg: '#f3e8ff' },
    { label: 'Care', icon: '❤️', route: '/modules/care', bg: '#ffe4e6' },
    { label: 'Scrap', icon: '♻️', route: '/modules/scrap', bg: '#d1fae5' },
    { label: 'Market', icon: '🏷️', route: '/modules/marketplace', bg: '#e0f2fe' },
    { label: 'Pets', icon: '🐾', route: '/modules/pets', bg: '#fef9c3' },
    { label: 'Events', icon: '🎉', route: '/modules/events', bg: '#fae8ff' },
    { label: 'Health', icon: '⚕️', route: '/modules/health', bg: '#ccfbf1' },
    { label: 'Subscribes', icon: '📅', route: '/modules/subscriptions', bg: '#e0e7ff' },
    { label: 'Referral', icon: '🎁', route: '/modules/referral', bg: '#fee2e2' },
    { label: 'Rewards', icon: '🏆', route: '/modules/rewards', bg: '#fef3c7' },
    { label: 'Premium', icon: '✨', route: '/modules/premium', bg: '#f3e8ff' },
    { label: 'Donations', icon: '🤝', route: '/modules/donations', bg: '#dcfce7' },
    { label: 'Volunteer', icon: '🙋', route: '/modules/volunteer', bg: '#ffedd5' },
    { label: 'Comm Hub', icon: '🏫', route: '/modules/community_hub', bg: '#e0f2fe' },
    { label: 'Tracking', icon: '📍', route: '/modules/tracking', bg: '#fef9c3' },
    { label: 'Features', icon: '🚀', route: '/modules/features', bg: '#e0f2fe' },
    { label: 'Download', icon: '📱', route: '/modules/download', bg: '#fae8ff' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'Resident'}</Text>
            <TouchableOpacity 
              style={styles.locationBadge} 
              onPress={() => router.push('/modules/zone-selector')}
            >
              <Text style={{fontSize: 12}}>📍</Text>
              <Text style={styles.locationText}>{activeZone?.name || 'Select Zone'}</Text>
              <Text style={{fontSize: 12, marginLeft: 4, color: '#10b981'}}>▼</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/modules/wallet')}>
              <Text style={{fontSize: 20}}>💳</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/modules/notifications')}>
              <Text style={{fontSize: 20}}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            placeholder="Search shops, plumbers, community..." 
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        {/* Stories */}
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Neighborhood Stories</Text>
          <StoriesRow />
        </View>
        
        {/* Urgent Actions Banner */}
        <View style={styles.urgentRow}>
          <TouchableOpacity style={[styles.urgentBtn, { backgroundColor: '#ef4444' }]} onPress={() => router.push('/modules/sos')}>
            <Text style={{fontSize: 24}}>🚨</Text>
            <Text style={styles.urgentText}>SOS Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.urgentBtn, { backgroundColor: '#3b82f6' }]} onPress={() => router.push('/modules/pharmacy')}>
            <Text style={{fontSize: 24}}>💊</Text>
            <Text style={styles.urgentText}>Pharmacy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.urgentBtn, { backgroundColor: '#10b981' }]} onPress={() => router.push('/(tabs)/directory')}>
            <Text style={{fontSize: 24}}>🛒</Text>
            <Text style={styles.urgentText}>Groceries</Text>
          </TouchableOpacity>
        </View>

        {/* 8 Pillars / Primary Categories */}
        <Text style={styles.sectionTitle}>Platform Services</Text>
        <View style={styles.pillarsGrid}>
          {PILLARS.map((p, i) => (
            <TouchableOpacity key={i} style={styles.pillarCard} onPress={() => router.push(p.route)}>
              <View style={[styles.pillarIconBg, { backgroundColor: p.color + '15' }]}>
                <Text style={{ fontSize: 28 }}>{p.icon}</Text>
              </View>
              <Text style={styles.pillarTitle}>{p.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Tiles Grid */}
        <Text style={styles.sectionTitle}>Explore More</Text>
        <View style={styles.quickGrid}>
          {QUICK_TILES.map((t, i) => (
            <TouchableOpacity key={i} style={styles.quickTile} onPress={() => router.push(t.route)}>
              <View style={[styles.quickIconBg, { backgroundColor: t.bg }]}>
                <Text style={{ fontSize: 24 }}>{t.icon}</Text>
              </View>
              <Text style={styles.quickLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community Feed Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Townsquare Feed</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
            <Text style={styles.seeAll}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {loadingFeed ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : feedPosts.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 20 }}>No stories in your area yet.</Text>
        ) : feedPosts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}><Text style={styles.avatarInitial}>{post.author_name?.charAt(0) || post.full_name?.charAt(0) || 'U'}</Text></View>
              <View>
                <Text style={styles.postAuthor}>{post.author_name || post.full_name}</Text>
                <Text style={styles.postTime}>{post.time || new Date(post.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>
            <View style={styles.postFooter}>
              <TouchableOpacity><Text style={styles.postAction}>❤️ {post.likes || 0} Likes</Text></TouchableOpacity>
              <TouchableOpacity><Text style={styles.postAction}>💬 {post.comments || 0} Comments</Text></TouchableOpacity>
              <TouchableOpacity><Text style={styles.postAction}>🔗 Share</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  locationText: { color: '#475569', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  iconBtn: { backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 } },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, marginBottom: 24, elevation: 2 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 16, color: '#0f172a', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  seeAll: { color: '#3b82f6', fontSize: 14, fontWeight: '700' },
  
  urgentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 12 },
  urgentBtn: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', elevation: 3 },
  urgentText: { color: '#fff', fontWeight: '800', fontSize: 12, marginTop: 8 },
  
  pillarsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  pillarCard: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16, elevation: 2 },
  pillarIconBg: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  pillarTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  quickTile: { width: '25%', alignItems: 'center', marginBottom: 20 },
  quickIconBg: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 11, color: '#475569', fontWeight: '600', textAlign: 'center' },
  
  postCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  postAuthor: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  postTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  postContent: { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 16 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  postAction: { fontSize: 13, color: '#64748b', fontWeight: '600' },
});

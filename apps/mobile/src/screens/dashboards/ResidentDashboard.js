import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Dimensions, SafeAreaView, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, Search, ChevronDown, MessageCircle, Store, Briefcase, Building2, Truck, Car, Home, IndianRupee, AlertTriangle, ShoppingBag, Droplet, Wallet, ShieldCheck, Heart, User } from 'lucide-react-native';
import StoriesRow from '../../components/StoriesRow';
import { useNotifications } from '../../context/NotificationContext';
import { useZone } from '../../context/ZoneContext';
import { apiGet } from '../../lib/api';
import SkeletonLoader from '../../components/SkeletonLoader';
import FloatingCheckoutBar from '../../components/FloatingCheckoutBar';
import { StoreIcon, DeliveryIcon, ProduceIcon } from '../../components/RichIcons';
import { useCartStore } from '../../store/cartStore';

const { width } = Dimensions.get('window');

export default function ResidentDashboard({ user }) {
  const { unreadCount } = useNotifications();
  const { activeZone } = useZone();
  const { getItemCount, getCartTotal } = useCartStore();
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
    { title: 'Supermarket', iconComp: <StoreIcon size={52} />, route: '/(tabs)/directory', color: '#FFF7ED' },
    { title: 'Insta Drop', iconComp: <DeliveryIcon size={52} />, route: '/modules/delivery', color: '#F5F3FF' },
    { title: 'Fresh Veggies', iconComp: <ProduceIcon size={52} />, route: '/(tabs)/directory?category=fresh', color: '#ECFDF5' },
    { title: 'Community', icon: MessageCircle, route: '/(tabs)/community', color: '#3b82f6' },
  ];

  const QUICK_TILES = [
    { label: 'Services', icon: '🛠️', route: '/(tabs)/services', bg: '#e0e7ff' },
    { label: 'Bills', icon: '🧾', route: '/modules/bills', bg: '#fef3c7' },
    { label: 'Chef', icon: '🍲', route: '/modules/chef', bg: '#ffedd5' },
    { label: 'Equipment', icon: '🚜', route: '/modules/equipment', bg: '#f3e8ff' },
    { label: 'Care', icon: '❤️', route: '/modules/care', bg: '#ffe4e6' },
    { label: 'Scrap', icon: '♻️', route: '/modules/scrap', bg: '#d1fae5' },
    { label: 'Market', icon: '🏷️', route: '/modules/marketplace', bg: '#e0f2fe' },
    { label: 'Medical', icon: '🏥', route: '/modules/medical', bg: '#ffe4e6' },
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
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.greeting}>Hello, {user?.name || 'Resident'}</Text>
            <TouchableOpacity style={s.zonePill} onPress={() => router.push('/modules/zone-selector')}>
              <MapPin size={12} color="#10b981" />
              <Text style={s.zoneText}>{activeZone?.name || 'Select Zone'}</Text>
              <ChevronDown size={12} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/modules/wallet')}>
              <Wallet size={20} color="#e2e8f0" />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/modules/notifications')}>
              <Bell size={20} color="#e2e8f0" />
              {unreadCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <TouchableOpacity style={s.searchBar} onPress={() => router.push('/search')} activeOpacity={0.7}>
          <Search size={20} color="#94a3b8" />
          <Text style={[s.searchInput, { color: '#64748b' }]}>Search shops, plumbers, community...</Text>
        </TouchableOpacity>

        {/* Stories */}
        <View style={{ marginBottom: 24 }}>
          <Text style={s.sectionTitle}>Neighborhood Stories</Text>
          <StoriesRow />
        </View>

        {/* Urgent Actions Banner */}
        <View style={s.urgentRow}>
          <TouchableOpacity style={[s.urgentCard, { backgroundColor: 'rgba(127, 29, 29, 0.4)', borderColor: 'rgba(127, 29, 29, 0.5)' }]} onPress={() => router.push('/modules/sos')}>
            <View style={[s.urgentIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <AlertTriangle size={24} color="#ef4444" />
            </View>
            <Text style={[s.urgentLabel, { color: '#f87171' }]}>SOS Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.urgentCard, { backgroundColor: 'rgba(30, 58, 138, 0.4)', borderColor: 'rgba(30, 58, 138, 0.5)' }]} onPress={() => router.push('/modules/pharmacy')}>
            <View style={[s.urgentIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <ShieldCheck size={24} color="#3b82f6" />
            </View>
            <Text style={[s.urgentLabel, { color: '#60a5fa' }]}>Pharmacy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.urgentCard, { backgroundColor: 'rgba(6, 78, 59, 0.4)', borderColor: 'rgba(6, 78, 59, 0.5)' }]} onPress={() => router.push('/(tabs)/directory')}>
            <View style={[s.urgentIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <ShoppingBag size={24} color="#10b981" />
            </View>
            <Text style={[s.urgentLabel, { color: '#34d399' }]}>Groceries</Text>
          </TouchableOpacity>
        </View>

        {/* 8 Pillars / Primary Categories */}
        <Text style={s.sectionTitle}>Platform Services</Text>
        <View style={s.pillarsGrid}>
          {PILLARS.map((pillar, idx) => (
            <TouchableOpacity key={idx} style={s.pillarItem} onPress={() => router.push(pillar.route)}>
              <View style={[s.pillarIconBg, { backgroundColor: `${pillar.color}15` }]}>
                {pillar.iconComp ? (
                  pillar.iconComp
                ) : (
                  <pillar.icon stroke={pillar.color} width={32} height={32} />
                )}
              </View>
              <Text style={s.pillarLabel} numberOfLines={2}>{pillar.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Tiles Grid */}
        <Text style={s.sectionTitle}>Explore More</Text>
        <View style={s.tilesContainer}>
          {QUICK_TILES.map((t, i) => (
            <TouchableOpacity key={i} style={s.tileItem} onPress={() => router.push(t.route)}>
              <View style={[s.tileIconBg, { backgroundColor: t.bg + '20' }]}>
                <Text style={{ fontSize: 24 }}>{t.icon}</Text>
              </View>
              <Text style={s.tileLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community Feed Preview */}
        <View style={s.feedHeader}>
          <Text style={s.sectionTitle}>Townsquare Feed</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
            <Text style={s.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {loadingFeed ? (
          <SkeletonLoader type="list" count={2} />
        ) : feedPosts.length === 0 ? (
          <View style={s.emptyFeed}>
            <MessageCircle size={32} color="#64748b" />
            <Text style={s.emptyText}>No stories in your area yet.</Text>
          </View>
        ) : feedPosts.map(post => (
          <View key={post.id} style={s.feedCard}>
            <View style={s.feedAuthorRow}>
              <View style={s.feedAvatar}>
                <Text style={s.feedAvatarText}>{post.author_name?.charAt(0) || post.full_name?.charAt(0) || 'U'}</Text>
              </View>
              <View>
                <Text style={s.feedAuthorName}>{post.author_name || post.full_name}</Text>
                <Text style={s.feedTime}>{post.time || new Date(post.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <Text style={s.feedContent}>{post.content}</Text>
            <View style={s.feedActions}>
              <TouchableOpacity><Text style={s.feedAction}>❤️ {post.likes || 0} Likes</Text></TouchableOpacity>
              <TouchableOpacity><Text style={s.feedAction}>💬 {post.comments || 0} Comments</Text></TouchableOpacity>
              <TouchableOpacity><Text style={[s.feedAction, { color: '#60a5fa' }]}>🔗 Share</Text></TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Floating Express Checkout */}
      {getItemCount() > 0 && (
        <FloatingCheckoutBar
          itemCount={getItemCount()}
          totalAmount={getCartTotal()}
          onPress={() => router.push('/modules/checkout')}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  greeting: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  zonePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', gap: 6 },
  zoneText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  headerIcons: { flexDirection: 'row', gap: 12 },
  headerBtn: { width: 44, height: 44, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#020617' },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24, gap: 12 },
  searchInput: { flex: 1, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  sectionTitle: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  urgentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 12 },
  urgentCard: { flex: 1, borderWidth: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  urgentIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  urgentLabel: { fontWeight: '700', fontSize: 12, marginTop: 4 },
  pillarsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  pillarItem: { width: (width - 48) / 4, alignItems: 'center', marginBottom: 16 },
  pillarIconBg: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  pillarLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tilesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, padding: 16 },
  tileItem: { width: '25%', alignItems: 'center', marginBottom: 20 },
  tileIconBg: { width: 48, height: 48, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  tileLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 10, textAlign: 'center' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  viewAll: { color: '#60a5fa', fontWeight: '700', fontSize: 12 },
  emptyFeed: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 24, alignItems: 'center', gap: 12 },
  emptyText: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  feedCard: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  feedAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  feedAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  feedAvatarText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  feedAuthorName: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  feedTime: { color: '#94a3b8', fontSize: 10 },
  feedContent: { color: '#cbd5e1', fontWeight: '500', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  feedActions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12, marginTop: 4 },
  feedAction: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },
});

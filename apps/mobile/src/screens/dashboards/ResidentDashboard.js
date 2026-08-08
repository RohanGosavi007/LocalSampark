import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, SafeAreaView, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MapPin, ChevronDown, MessageCircle, AlertTriangle, ShieldCheck, ShoppingBag } from 'lucide-react-native';
import StoriesRow from '../../components/StoriesRow';
import { useNotifications } from '../../context/NotificationContext';
import { useZone } from '../../context/ZoneContext';
import { apiGet } from '../../lib/api';
import SkeletonLoader from '../../components/SkeletonLoader';
import FloatingCheckoutBar from '../../components/FloatingCheckoutBar';
import { useCartStore } from '../../store/cartStore';
import HomeHeader from '../../components/HomeHeader';
import PromoCarousel from '../../components/PromoCarousel';
import ShopByCategory from '../../components/ShopByCategory';
import TrendingHighlights from '../../components/TrendingHighlights';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../theme/theme';

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

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header (Phase 2 Custom Header) */}
        <HomeHeader location={activeZone?.name || 'Select Zone'} />

        {/* Phase 3 Components */}
        <View style={s.mainContent}>
          <PromoCarousel />
          
          <ShopByCategory />
          
          <TrendingHighlights />

          {/* Stories */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text style={[s.sectionTitle, theme.typography.h2, { marginBottom: theme.spacing.md }]}>Neighborhood Stories</Text>
            <StoriesRow />
          </View>

          {/* Urgent Actions Banner */}
          <View style={s.urgentRow}>
            <TouchableOpacity style={[s.urgentCard, { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.2)' }]} onPress={() => router.push('/modules/sos')}>
              <View style={[s.urgentIcon, { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                <AlertTriangle size={24} color={COLORS.error} />
              </View>
              <Text style={[s.urgentLabel, { color: COLORS.error }]}>SOS Alert</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.urgentCard, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }]} onPress={() => router.push('/modules/pharmacy')}>
              <View style={[s.urgentIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <ShieldCheck size={24} color={COLORS.info} />
              </View>
              <Text style={[s.urgentLabel, { color: COLORS.info }]}>Pharmacy</Text>
            </TouchableOpacity>
          </View>

          {/* Community Feed Preview */}
          <View style={s.feedHeader}>
            <Text style={[s.sectionTitle, theme.typography.h2]}>Townsquare Feed</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
              <Text style={s.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {loadingFeed ? (
            <SkeletonLoader type="list" count={2} />
          ) : feedPosts.length === 0 ? (
            <View style={s.emptyFeed}>
              <MessageCircle size={32} color={COLORS.textMuted} />
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
              </View>
            </View>
          ))}
        </View>

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
  container: { flex: 1, backgroundColor: COLORS.background },
  mainContent: { paddingTop: SPACING.md },
  sectionTitle: { color: COLORS.text, fontWeight: '800', fontSize: TYPOGRAPHY.sizes.h3, marginBottom: SPACING.md, paddingHorizontal: SPACING.md },
  urgentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 12, paddingHorizontal: SPACING.md },
  urgentCard: { flex: 1, borderWidth: 1, padding: 16, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
  urgentIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  urgentLabel: { fontWeight: '700', fontSize: 12, marginTop: 4 },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8, paddingHorizontal: SPACING.md },
  viewAll: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  emptyFeed: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: 24, alignItems: 'center', gap: 12, marginHorizontal: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
  feedCard: { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, padding: 16, marginBottom: 16, marginHorizontal: SPACING.md },
  feedAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  feedAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.info, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  feedAvatarText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  feedAuthorName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  feedTime: { color: COLORS.textMuted, fontSize: 10 },
  feedContent: { color: COLORS.text, fontWeight: '500', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  feedActions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 4 },
  feedAction: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
});

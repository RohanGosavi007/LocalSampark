import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../theme';

const POSTS = [
  { id: 1, author: 'Rohan Joshi', society: 'Goodwill Woodlands', time: '1 hr ago', type: 'question', content: 'Did anyone else experience a power outage in Phase 2 last night? Any updates from the power department?', likes: 14, comments: 6 },
  { id: 2, author: 'Pooja Mehta', society: 'Pride Aashiyana', time: '3 hrs ago', type: 'event', content: 'Organizing a Neighborhood Clean-Up Drive this Sunday morning at 7:30 AM from main gate. All volunteers welcome!', likes: 28, comments: 11 },
  { id: 3, author: 'Admin', society: 'Dhanori Ward', time: '1 day ago', type: 'alert', content: 'Road repair works begin on Tingre Nagar road from Monday 8 AM. Expect delays. Use Bhairav Nagar lane as alternate.', likes: 45, comments: 8, pinned: true },
  { id: 4, author: 'Sunita Bhosale', society: 'Ganga Aria', time: '2 days ago', type: 'discussion', content: 'Community health camp happening next Saturday at Goodwill Clubhouse. Free BP, sugar, and eye checkups!', likes: 62, comments: 19 },
  { id: 5, author: 'Cricket Club', society: 'Dhanori Ground', time: '3 days ago', type: 'event', content: 'Annual LocalSampark Cricket Cup registrations open! 12 slots, team of 11. Prize: ₹5,000 + trophy!', likes: 89, comments: 34 },
];

const TRENDING = ['#RoadRepair', '#CricketCup2026', '#GaneshFestival', '#CleanDrive', '#EVCharging'];

const TYPE_CONFIG = {
  alert: { icon: 'warning-outline', color: '#ef4444', bg: '#fef2f2', label: 'ALERT' },
  event: { icon: 'calendar-outline', color: '#f97316', bg: '#fff7ed', label: 'EVENT' },
  question: { icon: 'help-circle-outline', color: '#6366f1', bg: '#eef2ff', label: 'QUESTION' },
  discussion: { icon: 'chatbubbles-outline', color: '#10b981', bg: '#ecfdf5', label: 'DISCUSSION' },
};

export default function CommunityScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState(POSTS);
  const [likedIds, setLikedIds] = useState([]);
  const [newPost, setNewPost] = useState('');

  const toggleLike = (id) => {
    if (likedIds.includes(id)) {
      setLikedIds(likedIds.filter(x => x !== id));
      setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes - 1 } : p));
    } else {
      setLikedIds([...likedIds, id]);
      setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
    }
  };

  const getInitials = (name) => name ? String(name).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsBar}>
          {[{ v: '5,200+', l: 'Residents' }, { v: '1,340', l: 'Posts' }, { v: '78', l: 'Polls' }].map((s, i) => (
            <View key={s.l} style={[styles.statItem, i < 2 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Compose */}
        <View style={styles.composeCard}>
          <View style={styles.composeRow}>
            <View style={styles.composeAvatar}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>AB</Text></View>
            <TextInput style={styles.composeInput} placeholder="Share with your neighborhood..." placeholderTextColor={COLORS.textLight} value={newPost} onChangeText={setNewPost} />
          </View>
          <View style={styles.composeActions}>
            <TouchableOpacity style={styles.composeBtn}><Ionicons name="image-outline" size={18} color={COLORS.textMuted} /></TouchableOpacity>
            <TouchableOpacity style={styles.composeBtn}><Ionicons name="videocam-outline" size={18} color={COLORS.textMuted} /></TouchableOpacity>
            <TouchableOpacity style={styles.composeBtn}><Ionicons name="bar-chart-outline" size={18} color={COLORS.textMuted} /></TouchableOpacity>
            <TouchableOpacity style={[styles.composeBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
              <Ionicons name="send" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trending */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
          {TRENDING.map(tag => (
            <TouchableOpacity key={tag} style={styles.trendingChip}>
              <Ionicons name="trending-up" size={12} color={COLORS.primary} />
              <Text style={styles.trendingText}> {tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Posts Feed */}
        {posts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(post => {
          const config = TYPE_CONFIG[post.type] || TYPE_CONFIG.discussion;
          return (
            <View key={post.id} style={[styles.postCard, post.pinned && styles.pinnedCard]}>
              {post.pinned && (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="pin" size={10} color="#d97706" />
                  <Text style={styles.pinnedText}> Pinned</Text>
                </View>
              )}
              <View style={styles.postHeader}>
                <View style={[styles.postAvatar, { backgroundColor: config.color }]}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{getInitials(post.author)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.authorName}>{post.author}</Text>
                    <Ionicons name="shield-checkmark" size={12} color="#3b82f6" />
                  </View>
                  <Text style={styles.postMeta}>{post.society} • {post.time}</Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon} size={10} color={config.color} />
                  <Text style={[styles.typeText, { color: config.color }]}> {config.label}</Text>
                </View>
              </View>

              <Text style={styles.postContent}>{post.content}</Text>

              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post.id)}>
                  <Ionicons name={likedIds.includes(post.id) ? 'heart' : 'heart-outline'} size={16} color={likedIds.includes(post.id) ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.actionText, likedIds.includes(post.id) && { color: COLORS.primary }]}> {post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="chatbubble-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.actionText}> {post.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="share-social-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.actionText}> Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, backgroundColor: COLORS.backgroundAlt, borderBottomWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.text, flex: 1 },
  notifBtn: { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  content: { padding: SPACING.lg, paddingBottom: 40, gap: SPACING.lg },

  statsBar: { flexDirection: 'row', backgroundColor: '#8b5cf6', borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONT_SIZES.lg, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },

  composeCard: { backgroundColor: COLORS.cardBg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, ...SHADOWS.sm },
  composeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  composeAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  composeInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, fontSize: FONT_SIZES.sm, color: COLORS.text },
  composeActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm },
  composeBtn: { width: 34, height: 34, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  trendingScroll: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  trendingChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full },
  trendingText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.primary },

  postCard: { backgroundColor: COLORS.cardBg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, ...SHADOWS.md },
  pinnedCard: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  pinnedText: { fontSize: FONT_SIZES.xs, fontWeight: '800', color: '#d97706' },

  postHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  postAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  postMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 1 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  typeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  postContent: { fontSize: FONT_SIZES.base, color: COLORS.text, lineHeight: 22, marginBottom: SPACING.lg },

  postActions: { flexDirection: 'row', gap: SPACING.xl, borderTopWidth: 1, borderColor: COLORS.borderLight, paddingTop: SPACING.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textMuted },
});

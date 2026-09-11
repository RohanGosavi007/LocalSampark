import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { apiGet, apiPost } from '../../src/lib/api';

/**
 * The seeded POSTS and POLLS arrays that used to sit here are gone.
 *
 * POSTS invented four neighbours by name -- "Rohan Joshi", "Pooja Mehta",
 * "Sunita Bhosale" -- each attributed to a named society, with like and comment
 * counts, and one pinned as an "Admin Announcement" carrying a road-closure
 * notice ("Road repair works begin on Tingre Nagar road from Monday 8 AM") that
 * no authority had issued. A resident could plan around it.
 *
 * Posts now come from GET /feed/posts, which returns rows from `posts` joined to
 * their author with upvote/downvote counts. The screen's typeConfig keys
 * (alert, event, question, discussion, lostfound) are exactly the values the
 * API's post_type column carries, so they map straight across.
 *
 * POLLS is removed rather than wired: the backend has no multi-option poll. Its
 * only voting endpoint is POST /feed/posts/:id/vote, which records a single
 * up/down vote against a post. Rendering "Should we request a speed breaker near
 * the main gate? — Yes 78 / No 14" with tallies nothing counted was a claim
 * about what the neighbourhood wants, and there is nothing to replace it with
 * yet, so the section is gone until a poll API exists.
 */

const typeConfig = {
  alert: { color: '#ef4444', label: 'ALERT', bg: '#fee2e2' },
  event: { color: '#f97316', label: 'EVENT', bg: '#ffedd5' },
  question: { color: '#3b82f6', label: 'QUESTION', bg: '#eff6ff' },
  discussion: { color: '#10b981', label: 'DISCUSSION', bg: '#dcfce7' },
  lostfound: { color: '#8b5cf6', label: 'LOST & FOUND', bg: '#f3e8ff' },
};

/** Maps a row from GET /feed/posts onto the shape this screen renders. */
function normalizePost(row) {
  const created = row.created_at ? new Date(row.created_at) : null;
  const validDate = created && !Number.isNaN(created.getTime());
  return {
    id: row.id,
    author: row.full_name || 'Neighbour',
    avatar: row.avatar_url || 'person',
    society: row.society_name || '',
    time: validDate ? created.toLocaleDateString() : '',
    type: row.post_type || 'discussion',
    content: row.content || '',
    likes: Number(row.upvotes || 0),
    comments: Number(row.comment_count || 0),
    pinned: Boolean(row.is_pinned),
  };
}

/**
 * post_type comes from the database and is not constrained to the five keys
 * below, so indexing typeConfig directly would throw on any other value and
 * take the whole feed down with it.
 */
const typeStyle = (type) => typeConfig[type] || typeConfig.discussion;


export default function CommunityScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedType, setSelectedType] = useState('discussion');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/feed/posts');
      const rows = Array.isArray(data) ? data : (data?.rows ?? data?.posts ?? []);
      setPosts(rows.map(normalizePost));
    } catch (e) {
      setError(e?.message || 'Could not load the community feed.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handlePost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert('Empty Post', 'Please write something before posting.');
      return;
    }
    if (posting) return;
    setPosting(true);
    try {
      // This used to build a local object and prepend it to state. The post
      // appeared in the feed, the modal closed, and nothing was ever sent: the
      // user believed they had posted to their neighbourhood and had not.
      await apiPost('/feed/posts', {
        content: newPostContent,
        postType: selectedType,
      });
      setNewPostContent('');
      await loadPosts();
    } catch (e) {
      Alert.alert('Post not published', `${e?.message || 'The post could not be sent.'} Please try again.`);
      setPosting(false);
      return;
    }
    setPosting(false);
    setSelectedType('discussion');
    setShowCreateModal(false);
    Alert.alert('Success', 'Your post is live in the community!');
  };

  // handleVote is gone with the polls it served. It only wrote to local state,
  // so a resident's vote on "Should we request a speed breaker near the main
  // gate?" was never recorded anywhere and vanished on the next launch.

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🏢 Townsquare</Text>
          <Text style={styles.subtitle}>Verified neighbors. Real local updates.</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createBtnText}>+ New Post</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        {/* Loading, failure and genuinely-empty are three different states.
            They used to be one, because a seeded array meant the feed was
            never empty and never visibly failed. */}
        {loading || error || posts.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{error ? '⚠️' : '💬'}</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 6, textAlign: 'center' }}>
              {loading ? 'Loading the feed...' : error ? 'Could not load the feed' : 'No posts yet'}
            </Text>
            <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center' }}>
              {loading ? '' : error || 'Be the first to post something for your neighbourhood.'}
            </Text>
            {error ? (
              <TouchableOpacity
                onPress={loadPosts}
                style={{ marginTop: 16, backgroundColor: '#4f46e5', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
        <FlashList
          data={[
            ...posts.filter(p => p.pinned).map(p => ({ ...p, isPinned: true })),
            ...posts.filter(p => !p.pinned)
          ]}
          estimatedItemSize={200}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyExtractor={(item) => `post-${item.id}`}
          getItemType={(item) => (item.isPinned ? 'pinned_post' : 'post')}
          renderItem={({ item }) => {
            const post = item;
            if (post.isPinned) {
              return (
                <View style={[styles.card, { borderColor: '#ef4444', borderWidth: 1, backgroundColor: '#fef2f2' }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.authorRow}>
                      <Text style={styles.avatar}>{post.avatar}</Text>
                      <View>
                        <Text style={styles.author}>{post.author}</Text>
                        <Text style={styles.meta}>{post.society} • {post.time}</Text>
                      </View>
                    </View>
                    <View style={[styles.typeBadge, {backgroundColor: typeStyle(post.type).bg}]}>
                      <Text style={[styles.typeText, {color: typeStyle(post.type).color}]}>📌 PINNED {typeStyle(post.type).label}</Text>
                    </View>
                  </View>
                  <Text style={styles.postContent}>{post.content}</Text>
                </View>
              );
            }

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.authorRow}>
                    <Text style={styles.avatar}>{post.avatar}</Text>
                    <View>
                      <Text style={styles.author}>{post.author}</Text>
                      <Text style={styles.meta}>{post.society} • {post.time}</Text>
                    </View>
                  </View>
                  <View style={[styles.typeBadge, {backgroundColor: typeStyle(post.type).bg}]}>
                    <Text style={[styles.typeText, {color: typeStyle(post.type).color}]}>{typeStyle(post.type).label}</Text>
                  </View>
                </View>
                <Text style={styles.postContent}>{post.content}</Text>
                <View style={styles.postFooter}>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Text style={styles.actionText}>👍 {post.likes} Likes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Text style={styles.actionText}>💬 {post.comments} Comments</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
        )}

      {/* Create Post Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}><Text style={{fontSize: 20}}>❌</Text></TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16, maxHeight: 40}}>
              {Object.keys(typeConfig).map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.catSelect, selectedType === type && {backgroundColor: typeConfig[type].bg, borderColor: typeConfig[type].color}]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.catSelectText, selectedType === type && {color: typeConfig[type].color, fontWeight: 'bold'}]}>
                    {typeConfig[type].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Post Content</Text>
            <TextInput 
              style={styles.postInput} 
              placeholder="What's happening in your neighborhood?" 
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={newPostContent}
              onChangeText={setNewPostContent}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handlePost}>
              <Text style={styles.submitBtnText}>Publish to Community</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  subtitle: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  createBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  content: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { fontSize: 36, marginRight: 12 },
  author: { color: '#0f172a', fontWeight: '800', fontSize: 15, marginBottom: 2 },
  meta: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: '800' },
  
  postContent: { color: '#334155', fontSize: 15, lineHeight: 24, marginBottom: 16 },
  
  postFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, gap: 24 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: { color: '#64748b', fontWeight: '700', fontSize: 14 },

  pollOption: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 10, position: 'relative', backgroundColor: '#fff' },
  pollOptionSelected: { borderColor: '#22c55e' },
  pollBar: { position: 'absolute', top: 0, left: 0, bottom: 0 },
  pollOptionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  pollOptionText: { color: '#0f172a', fontSize: 14, fontWeight: '600', zIndex: 1 },
  pollOptionTextSelected: { color: '#166534', fontWeight: '800' },
  pollPercent: { color: '#64748b', fontSize: 12, fontWeight: '700', zIndex: 1 },
  pollFooter: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12 },
  catSelect: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 10, height: 36, justifyContent: 'center' },
  catSelectText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  postInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 15, color: '#0f172a', minHeight: 120, marginBottom: 24 },
  submitBtn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});

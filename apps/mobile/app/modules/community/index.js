import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { apiGet, apiPost } from '../../../src/lib/api';

/**
 * The seeded POSTS and POLLS arrays are gone; this screen is a near-duplicate
 * of app/(tabs)/community.js and carried the same fabrications, including an
 * "Admin Announcement" road-closure notice no authority had issued.
 *
 * Posts come from GET /feed/posts. POLLS is removed rather than wired: the
 * backend has no multi-option poll -- POST /feed/posts/:id/vote records a
 * single up/down vote against a post -- so the tallies were counting nothing.
 *
 * NOTE: this file and app/(tabs)/community.js render the same feed with
 * different styling. They should be collapsed into one screen; until then any
 * change here needs making there too.
 */

const TYPE_COLORS = {
  alert: { color: '#ef4444', label: 'ALERT', bg: 'rgba(239,68,68,0.2)' },
  event: { color: '#f97316', label: 'EVENT', bg: 'rgba(249,115,22,0.2)' },
  question: { color: '#4f46e5', label: 'QUESTION', bg: 'rgba(79,70,229,0.2)' },
  discussion: { color: '#10b981', label: 'DISCUSSION', bg: 'rgba(16,185,129,0.2)' }
};

export default function CommunityModule() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [likedIds, setLikedIds] = useState([]);
  
  // Post state
  const [postModal, setPostModal] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('discussion');

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/feed/posts');
      const rows = Array.isArray(data) ? data : (data?.rows ?? data?.posts ?? []);
      setPosts(rows.map((row) => {
        const created = row.created_at ? new Date(row.created_at) : null;
        const valid = created && !Number.isNaN(created.getTime());
        return {
          id: row.id,
          author: row.full_name || 'Neighbour',
          avatar: row.avatar_url || '',
          society: row.society_name || '',
          time: valid ? created.toLocaleDateString() : '',
          type: row.post_type || 'discussion',
          content: row.content || '',
          likes: Number(row.upvotes || 0),
          comments: Number(row.comment_count || 0),
          pinned: Boolean(row.is_pinned),
        };
      }));
    } catch (e) {
      setError(e?.message || 'Could not load the community feed.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // A like used to increment local state only, so it vanished on next launch
  // and the author never saw it. It is an upvote on the post server-side.
  const handleLike = async (id) => {
    if (likedIds.includes(id)) return;
    setLikedIds([...likedIds, id]);
    setPosts(posts.map(p => (p.id === id ? { ...p, likes: p.likes + 1 } : p)));
    try {
      await apiPost(`/feed/posts/${id}/vote`, { voteType: 'up' });
    } catch (e) {
      // Roll the optimistic update back rather than leaving a like the server
      // never recorded.
      setLikedIds((prev) => prev.filter((x) => x !== id));
      setPosts((prev) => prev.map(p => (p.id === id ? { ...p, likes: Math.max(0, p.likes - 1) } : p)));
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return Alert.alert('Error', 'Post content cannot be empty');
    try {
      // Previously this only prepended to local state and announced the post
      // had been "broadcasted to the community". Nothing was sent.
      await apiPost('/feed/posts', { content: newPost, postType });
    } catch (e) {
      Alert.alert('Post not published', `${e?.message || 'The post could not be sent.'} Please try again.`);
      return;
    }
    setNewPost('');
    setPostModal(false);
    await loadPosts();
    Alert.alert('Posted', 'Your message is now on the community feed.');
  };

  const filtered = activeFilter === 'all' ? posts : posts.filter(p => p.type === activeFilter);
  const pinned = filtered.filter(p => p.pinned);
  const regular = filtered.filter(p => !p.pinned);
  const displayPosts = [...pinned, ...regular];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>👥 Townsquare</Text>
      </View>

      <View style={styles.filterScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingRight: 20}}>
          {['all', 'alert', 'event', 'discussion', 'question'].map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterBtn, activeFilter === f && styles.activeFilterBtn]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterBtnText, activeFilter === f && styles.activeFilterBtnText]}>
                {f === 'all' ? '📰 All Posts' : f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.createBtn} onPress={() => setPostModal(true)}>
          <View style={{flexDirection:'row', alignItems:'center', gap:15}}>
            <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', justifyContent:'center', alignItems:'center'}}><Text>🧑</Text></View>
            <Text style={{color: '#94a3b8', fontSize: 16}}>What's happening in your area?</Text>
          </View>
        </TouchableOpacity>

        {displayPosts.map(p => {
          // post_type is not constrained to the four keys in TYPE_COLORS, and
          // indexing it directly threw on anything else.
          const typeConf = TYPE_COLORS[p.type] || TYPE_COLORS.discussion;
          return (
            <View key={p.id} style={[styles.postCard, p.pinned && styles.pinnedCard]}>
              {p.pinned && <Text style={styles.pinnedLabel}>📌 PINNED ANNOUNCEMENT</Text>}
              
              <View style={styles.postHeader}>
                <Text style={{fontSize: 30}}>{p.avatar}</Text>
                <View style={{flex:1}}>
                  <Text style={styles.author}>{p.author}</Text>
                  <Text style={styles.meta}>{p.society} • {p.time}</Text>
                </View>
                <View style={[styles.typeTag, {backgroundColor: typeConf.bg}]}>
                  <Text style={[styles.typeText, {color: typeConf.color}]}>{typeConf.label}</Text>
                </View>
              </View>

              <Text style={styles.postContent}>{p.content}</Text>

              <View style={styles.postFooter}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(p.id)}>
                  <Text style={[styles.actionText, likedIds.includes(p.id) && {color:'#f43f5e'}]}>
                    {likedIds.includes(p.id) ? '❤️' : '🤍'} {p.likes}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionText}>💬 {p.comments}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionText}>↗️ Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Create Post Modal */}
      {postModal && (
        <Modal transparent visible animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Post</Text>
              
              <View style={{flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:15}}>
                {Object.keys(TYPE_COLORS).map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.typeSelectBtn, postType === type && {backgroundColor: TYPE_COLORS[type].color}]}
                    onPress={() => setPostType(type)}
                  >
                    <Text style={{color: postType === type ? '#fff' : '#94a3b8', fontWeight:'bold', fontSize:12}}>{TYPE_COLORS[type].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput 
                style={[styles.input, {height:120}]} 
                placeholder="What's happening in your neighborhood?" 
                multiline 
                placeholderTextColor="#64748b" 
                value={newPost} 
                onChangeText={setNewPost} 
              />
              
              <View style={{flexDirection:'row', gap:10}}>
                <TouchableOpacity style={[styles.primaryBtn, {flex:1, backgroundColor:'#334155'}]} onPress={()=>setPostModal(false)}><Text style={{color:'#fff', textAlign:'center'}}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, {flex:2}]} onPress={handlePost}><Text style={{color:'#fff', textAlign:'center', fontWeight:'bold'}}>Post to Community</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  filterScroll: { padding: 16, paddingBottom: 0 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  activeFilterBtn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterBtnText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 },
  activeFilterBtnText: { color: '#fff' },
  content: { padding: 16 },
  
  createBtn: { backgroundColor: '#0d1526', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
  
  pollCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
  pollOpt: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, marginTop: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  pollOptVoted: { borderColor: '#3b82f6' },
  pollBar: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  
  postCard: { backgroundColor: '#0d1526', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
  pinnedCard: { borderColor: '#3b82f6', backgroundColor: '#0a101f' },
  pinnedLabel: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold', marginBottom: 10 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  author: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  meta: { color: '#94a3b8', fontSize: 12 },
  typeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText: { fontSize: 10, fontWeight: 'bold' },
  postContent: { color: '#1e293b', fontSize: 15, lineHeight: 22, marginBottom: 15 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 15 },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionText: { color: '#94a3b8', fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#334155', textAlignVertical: 'top' },
  typeSelectBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  primaryBtn: { padding: 15, borderRadius: 8, backgroundColor: '#3b82f6' }
});

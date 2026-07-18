import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';

const POSTS = [
  { id: 1, author: 'Rohan Joshi', avatar: '👨‍💼', society: 'Goodwill Woodlands', time: '1 hr ago', type: 'question', content: 'Did anyone else experience a power outage in Phase 2 last night? Any updates from the power department on restoration ETA?', likes: 14, comments: 6, pinned: false },
  { id: 2, author: 'Pooja Mehta', avatar: '👩‍🌾', society: 'Pride Aashiyana', time: '3 hrs ago', type: 'event', content: '🧹 Organizing a Neighborhood Clean-Up Drive this Sunday morning. Starting 7:30 AM from the main gate. All volunteers welcome — gloves and bags provided!', likes: 28, comments: 11, pinned: false },
  { id: 3, author: 'Admin Announcement', avatar: '📢', society: 'Dhanori Ward', time: '1 day ago', type: 'alert', content: '⚠️ Notice: Road repair works begin on Tingre Nagar road from Monday 8 AM. Expect delays during peak hours (8–10 AM, 5–8 PM). Use Bhairav Nagar lane as alternate route.', likes: 45, comments: 8, pinned: true },
  { id: 4, author: 'Sunita Bhosale', avatar: '👩‍⚕️', society: 'Ganga Aria', time: '2 days ago', type: 'discussion', content: 'Great news! The Dhanori community health camp is happening next Saturday at Goodwill Clubhouse. Free BP, sugar, and eye checkups. Please spread the word! 🏥', likes: 62, comments: 19, pinned: false },
];

const POLLS = [
  { id: 101, q: 'Should we request a speed breaker near the main gate?', options: [{ l: 'Yes, definitely!', v: 78 }, { l: 'No, not needed', v: 14 }] },
  { id: 102, q: 'Best time for weekly garbage collection?', options: [{ l: 'Morning 6-8 AM', v: 112 }, { l: 'Evening 5-7 PM', v: 43 }] },
];

const typeConfig = {
  alert: { color: '#ef4444', label: 'ALERT', bg: '#fee2e2' },
  event: { color: '#f97316', label: 'EVENT', bg: '#ffedd5' },
  question: { color: '#3b82f6', label: 'QUESTION', bg: '#eff6ff' },
  discussion: { color: '#10b981', label: 'DISCUSSION', bg: '#dcfce7' },
  lostfound: { color: '#8b5cf6', label: 'LOST & FOUND', bg: '#f3e8ff' },
};

export default function CommunityScreen() {
  const [posts, setPosts] = useState(POSTS);
  const [pollVotes, setPollVotes] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedType, setSelectedType] = useState('discussion');

  const handlePost = () => {
    if (!newPostContent.trim()) {
      Alert.alert('Empty Post', 'Please write something before posting.');
      return;
    }
    const post = {
      id: Date.now(),
      author: 'You',
      avatar: '🧑',
      society: 'Dhanori',
      type: selectedType,
      content: newPostContent,
      time: 'Just now',
      likes: 0,
      comments: 0,
      pinned: false
    };
    setPosts([post, ...posts]);
    setNewPostContent('');
    setSelectedType('discussion');
    setShowCreateModal(false);
    Alert.alert('Success', 'Your post is live in the community!');
  };

  const handleVote = (pollId, optIdx) => {
    if (pollVotes[pollId] !== undefined) return;
    setPollVotes({ ...pollVotes, [pollId]: optIdx });
  };

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
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Pinned Posts */}
        {posts.filter(p => p.pinned).map(post => (
          <View key={post.id} style={[styles.card, { borderColor: '#ef4444', borderWidth: 1, backgroundColor: '#fef2f2' }]}>
            <View style={styles.cardHeader}>
              <View style={styles.authorRow}>
                <Text style={styles.avatar}>{post.avatar}</Text>
                <View>
                  <Text style={styles.author}>{post.author}</Text>
                  <Text style={styles.meta}>{post.society} • {post.time}</Text>
                </View>
              </View>
              <View style={[styles.typeBadge, {backgroundColor: typeConfig[post.type].bg}]}>
                <Text style={[styles.typeText, {color: typeConfig[post.type].color}]}>📌 PINNED {typeConfig[post.type].label}</Text>
              </View>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>
          </View>
        ))}

        {/* Active Polls */}
        {POLLS.map(poll => (
          <View key={poll.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#f59e0b' }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              <Text style={{fontSize: 20, marginRight: 8}}>📊</Text>
              <Text style={{color: '#f59e0b', fontWeight: '800', fontSize: 12}}>COMMUNITY POLL</Text>
            </View>
            <Text style={styles.postContent}>{poll.q}</Text>
            
            {poll.options.map((opt, idx) => {
              const totalVotes = poll.options.reduce((sum, o) => sum + o.v, 0);
              const isVotedFor = pollVotes[poll.id] === idx;
              const hasVoted = pollVotes[poll.id] !== undefined;
              const percent = hasVoted ? Math.round((opt.v / totalVotes) * 100) : 0;

              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.pollOption, 
                    isVotedFor && styles.pollOptionSelected,
                    hasVoted && { borderColor: 'transparent' }
                  ]}
                  onPress={() => handleVote(poll.id, idx)}
                  disabled={hasVoted}
                >
                  {hasVoted && (
                    <View style={[styles.pollBar, { width: `${percent}%`, backgroundColor: isVotedFor ? '#dcfce7' : '#f1f5f9' }]} />
                  )}
                  <View style={styles.pollOptionContent}>
                    <Text style={[styles.pollOptionText, isVotedFor && styles.pollOptionTextSelected]}>{opt.l}</Text>
                    {hasVoted && <Text style={styles.pollPercent}>{percent}%</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.pollFooter}>{poll.options.reduce((sum, o) => sum + o.v, 0)} votes total</Text>
          </View>
        ))}

        {/* Regular Feed */}
        {posts.filter(p => !p.pinned).map(post => (
          <View key={post.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.authorRow}>
                <Text style={styles.avatar}>{post.avatar}</Text>
                <View>
                  <Text style={styles.author}>{post.author}</Text>
                  <Text style={styles.meta}>{post.society} • {post.time}</Text>
                </View>
              </View>
              <View style={[styles.typeBadge, {backgroundColor: typeConfig[post.type].bg}]}>
                <Text style={[styles.typeText, {color: typeConfig[post.type].color}]}>{typeConfig[post.type].label}</Text>
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
        ))}

      </ScrollView>

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

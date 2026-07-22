import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';

const POSTS = [
  { id: 1, author: 'Rohan Joshi', avatar: '👨‍💼', society: 'Goodwill Woodlands', time: '1 hr ago', type: 'question', content: 'Did anyone else experience a power outage in Phase 2 last night? Any updates from the power department on restoration ETA?', likes: 14, comments: 6, pinned: false },
  { id: 2, author: 'Pooja Mehta', avatar: '👩‍🌾', society: 'Pride Aashiyana', time: '3 hrs ago', type: 'event', content: '🧹 Organizing a Neighborhood Clean-Up Drive this Sunday morning. Starting 7:30 AM from the main gate. All volunteers welcome — gloves and bags provided!', likes: 28, comments: 11, pinned: false },
  { id: 3, author: 'Admin Announcement', avatar: '📢', society: 'Dhanori Ward', time: '1 day ago', type: 'alert', content: '⚠️ Notice: Road repair works begin on Tingre Nagar road from Monday 8 AM. Expect delays during peak hours (8–10 AM, 5–8 PM). Use Bhairav Nagar lane as alternate route.', likes: 45, comments: 8, pinned: true },
  { id: 4, author: 'Sunita Bhosale', avatar: '👩‍⚕️', society: 'Ganga Aria', time: '2 days ago', type: 'discussion', content: 'Great news! The Dhanori community health camp is happening next Saturday at Goodwill Clubhouse. Free BP, sugar, and eye checkups. Please spread the word! 🏥', likes: 62, comments: 19, pinned: false },
  { id: 5, author: 'Cricket Club', avatar: '🏏', society: 'Dhanori Ground', time: '3 days ago', type: 'event', content: 'Annual LocalSampark Cricket Cup registrations are now open! 12 slots available. Register your team of 11 before July 5th. Prize: ₹5,000 + trophy! 🏆', likes: 89, comments: 34, pinned: false },
];

const POLLS = [
  { q: 'Should we request a speed breaker near the main gate?', options: [{ l: 'Yes, definitely!', v: 78 }, { l: 'No, not needed', v: 14 }] },
  { q: 'Best time for weekly garbage collection?', options: [{ l: 'Morning 6-8 AM', v: 112 }, { l: 'Evening 5-7 PM', v: 43 }] },
];

const TYPE_COLORS = {
  alert: { color: '#ef4444', label: 'ALERT', bg: 'rgba(239,68,68,0.2)' },
  event: { color: '#f97316', label: 'EVENT', bg: 'rgba(249,115,22,0.2)' },
  question: { color: '#4f46e5', label: 'QUESTION', bg: 'rgba(79,70,229,0.2)' },
  discussion: { color: '#10b981', label: 'DISCUSSION', bg: 'rgba(16,185,129,0.2)' }
};

export default function CommunityModule() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(POSTS);
  const [activeFilter, setActiveFilter] = useState('all');
  const [likedIds, setLikedIds] = useState([]);
  const [pollVotes, setPollVotes] = useState({});
  
  // Post state
  const [postModal, setPostModal] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('discussion');

  const handleLike = (id) => {
    if (likedIds.includes(id)) return;
    setLikedIds([...likedIds, id]);
    setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
  };

  const handleVote = (pollIdx, optIdx) => {
    if (pollVotes[pollIdx] !== undefined) return;
    setPollVotes({ ...pollVotes, [pollIdx]: optIdx });
  };

  const handlePost = () => {
    if (!newPost.trim()) return Alert.alert('Error', 'Post content cannot be empty');
    const post = {
      id: Date.now(), author: user?.full_name || 'You', avatar: '🧑', society: 'My Territory',
      time: 'Just now', type: postType, content: newPost, likes: 0, comments: 0, pinned: false
    };
    setPosts([post, ...posts]);
    setNewPost('');
    setPostModal(false);
    Alert.alert('Posted!', 'Your message has been broadcasted to the community.');
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

        {/* Community Polls Section (Only show if viewing 'all' or 'discussion') */}
        {(activeFilter === 'all' || activeFilter === 'discussion') && POLLS.map((poll, pIdx) => (
          <View key={pIdx} style={styles.pollCard}>
            <Text style={{color:'#3b82f6', fontWeight:'bold', fontSize:12, marginBottom:5}}>📊 COMMUNITY POLL</Text>
            <Text style={styles.cardTitle}>{poll.q}</Text>
            {poll.options.map((opt, oIdx) => {
              const voted = pollVotes[pIdx] !== undefined;
              const isMyVote = pollVotes[pIdx] === oIdx;
              const totalVotes = poll.options.reduce((sum, o) => sum + o.v, 0);
              const percent = voted ? Math.round((opt.v / totalVotes) * 100) : 0;
              return (
                <TouchableOpacity 
                  key={oIdx} 
                  style={[styles.pollOpt, isMyVote && styles.pollOptVoted]}
                  onPress={() => handleVote(pIdx, oIdx)}
                  disabled={voted}
                >
                  <View style={{flexDirection:'row', justifyContent:'space-between', zIndex:2}}>
                    <Text style={{color: isMyVote ? '#3b82f6' : '#fff', fontWeight: isMyVote ? 'bold' : 'normal'}}>{opt.l}</Text>
                    {voted && <Text style={{color: '#94a3b8'}}>{percent}%</Text>}
                  </View>
                  {voted && <View style={[styles.pollBar, {width: `${percent}%`}]} />}
                </TouchableOpacity>
              );
            })}
            <Text style={{color:'#64748b', fontSize:12, marginTop:10}}>
              {poll.options.reduce((sum, o) => sum + o.v, 0)} votes total
            </Text>
          </View>
        ))}

        {displayPosts.map(p => {
          const typeConf = TYPE_COLORS[p.type];
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
  postContent: { color: '#e2e8f0', fontSize: 15, lineHeight: 22, marginBottom: 15 },
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

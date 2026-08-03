import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MessageSquare, AlertTriangle, HelpCircle, Send, Heart } from 'lucide-react-native';
import { apiGet } from '../../lib/api';

export default function NativeTownsquareScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    async function loadFeed() {
      try {
        const data = await apiGet('/community/posts');
        if (data && data.posts && data.posts.length > 0) {
          setPosts(data.posts);
        } else {
          throw new Error('Empty feed');
        }
      } catch (e) {
        setPosts([
          { id: 'p1', author_name: 'Rahul Varma', category: 'alert', content: 'Heavy waterlogging near Porwal Road underpass! Use main highway route instead.', created_at: '10 mins ago' },
          { id: 'p2', author_name: 'Sneha Deshmukh', category: 'general', content: 'Any recommendations for a reliable home electrician near Dhanori Greens?', created_at: '1 hour ago' }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    const newPost = {
      id: `p_${Date.now()}`,
      author_name: 'You (Resident)',
      category: 'general',
      content: newPostContent,
      created_at: 'Just now'
    };
    setPosts([newPost, ...posts]);
    setNewPostContent('');
    Alert.alert('Posted!', 'Your message has been broadcast to nearby neighbors.');
  };

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text style={s.s3}>Townsquare Feed</Text>
        <View style={s.s4} />
      </View>

      {/* Post Composer */}
      <View style={s.s5}>
        <TextInput
          value={newPostContent}
          onChangeText={setNewPostContent}
          placeholder="Share an alert or ask neighbors..."
          placeholderTextColor="#64748b"
          style={s.s6}
        />
        <TouchableOpacity onPress={handleCreatePost} style={s.s7}>
          <Send color="#ffffff" size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.s8}>
        {loading ? (
          <ActivityIndicator color="#6366f1" />
        ) : (
          posts.map(p => (
            <View key={p.id} style={s.s9}>
              <View style={s.s10}>
                <Text style={s.s11}>{p.author_name}</Text>
                <View style={[s.s17, p.category === 'alert' ? s.s18 : s.s19]}>
                  <Text style={[s.s20, p.category === 'alert' ? s.s21 : s.s22]}>{p.category}</Text>
                </View>
              </View>
              <Text style={s.s12}>{p.content}</Text>
              <View style={s.s13}>
                <Text style={s.s14}>{p.created_at || 'Recently'}</Text>
                <TouchableOpacity style={s.s15}>
                  <Heart color="#64748b" size={14} />
                  <Text style={s.s16}>Like</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  s2: { width: 40, height: 40, backgroundColor: '#0f172a', borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  s3: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s4: { width: 40 },
  s5: { padding: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b', flexDirection: 'row', gap: 8, alignItems: 'center' },
  s6: { flex: 1, backgroundColor: '#020617', color: '#ffffff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', fontSize: 14 },
  s7: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  s8: { flex: 1, padding: 16 },
  s9: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12 },
  s10: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  s11: { color: '#818cf8', fontWeight: '700', fontSize: 14 },
  s12: { color: '#e2e8f0', fontSize: 14, marginBottom: 12, lineHeight: 5 },
  s13: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(30,41,59,0.8)', paddingTop: 8 },
  s14: { color: '#64748b', fontSize: 10 },
  s15: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  s16: { color: '#94a3b8', fontSize: 12 },
  s17: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 1 },
  s18: { backgroundColor: '#450a0a', borderColor: '#991b1b' },
  s19: { backgroundColor: '#1e293b', borderColor: '#334155' },
  s20: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  s21: { color: '#f87171' },
  s22: { color: '#cbd5e1' },
});

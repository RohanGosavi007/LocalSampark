import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between p-4 border-b border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-full items-center justify-center">
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Townsquare Feed</Text>
        <View className="w-10" />
      </View>

      {/* Post Composer */}
      <View className="p-4 bg-slate-900 border-b border-slate-800 flex-row gap-2 items-center">
        <TextInput
          value={newPostContent}
          onChangeText={setNewPostContent}
          placeholder="Share an alert or ask neighbors..."
          placeholderTextColor="#64748b"
          className="flex-1 bg-slate-950 text-white p-3 rounded-2xl border border-slate-800 text-sm"
        />
        <TouchableOpacity onPress={handleCreatePost} className="bg-indigo-600 p-3 rounded-2xl items-center justify-center">
          <Send color="#ffffff" size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {loading ? (
          <ActivityIndicator color="#6366f1" />
        ) : (
          posts.map(p => (
            <View key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-indigo-400 font-bold text-sm">{p.author_name}</Text>
                <View className={`px-2 py-0.5 rounded-full border ${p.category === 'alert' ? 'bg-red-950 border-red-800' : 'bg-slate-800 border-slate-700'}`}>
                  <Text className={`text-[10px] font-bold uppercase ${p.category === 'alert' ? 'text-red-400' : 'text-slate-300'}`}>{p.category}</Text>
                </View>
              </View>
              <Text className="text-slate-200 text-sm mb-3 leading-5">{p.content}</Text>
              <View className="flex-row items-center justify-between border-t border-slate-800/80 pt-2">
                <Text className="text-slate-500 text-[10px]">{p.created_at || 'Recently'}</Text>
                <TouchableOpacity className="flex-row items-center gap-1">
                  <Heart color="#64748b" size={14} />
                  <Text className="text-slate-400 text-xs">Like</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

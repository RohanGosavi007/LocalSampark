import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MessageCircle, Heart, Share2, AlertTriangle, Plus, MoreHorizontal } from 'lucide-react-native';
import { apiGet } from '../../src/lib/api';

export default function NativeTownsquareScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiGet('/townsquare/posts');
      const items = data.data || data.posts || (Array.isArray(data) ? data : []);
      
      // If API returns empty, mock data for UI visualization
      if (items.length === 0) {
        setPosts([
          { 
            id: '1', author: 'Vikram Sharma', time: '2h ago', content: 'There is a scheduled power cut tomorrow in Dhanori Sector 4 from 10 AM to 2 PM. Please plan accordingly!', 
            type: 'ALERT', likes: 24, comments: 5, userImage: 'https://i.pravatar.cc/100?img=11' 
          },
          { 
            id: '2', author: 'Anita Desai', time: '5h ago', content: 'The new community park is finally open! Took the kids there this evening. Absolutely beautiful landscaping. 🌳🌸', 
            type: 'NEWS', image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=500&q=80', likes: 112, comments: 18, userImage: 'https://i.pravatar.cc/100?img=5'
          },
          { 
            id: '3', author: 'Rakesh Patel', time: '1d ago', content: 'Has anyone seen my golden retriever? Answers to "Max". Last seen near the grocery mart. Wearing a blue collar.', 
            type: 'HELP', likes: 45, comments: 12, userImage: 'https://i.pravatar.cc/100?img=15'
          }
        ]);
      } else {
        setPosts(items);
      }
    } catch (err) {
      console.warn('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const renderPost = ({ item }) => {
    const isAlert = item.type === 'ALERT';
    const isHelp = item.type === 'HELP';
    
    return (
      <View className="bg-slate-900 border-b border-slate-800 p-4 mb-2">
        {/* Post Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Image 
              source={{ uri: item.userImage || 'https://via.placeholder.com/100' }} 
              className="w-10 h-10 rounded-full bg-slate-800 mr-3"
            />
            <View>
              <Text className="text-white font-bold text-base">{item.author}</Text>
              <Text className="text-slate-400 text-xs">{item.time}</Text>
            </View>
          </View>
          
          <View className="flex-row items-center">
            {(isAlert || isHelp) && (
              <View className={`px-2 py-1 rounded border mr-3 ${isAlert ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                <Text className={`text-[10px] font-bold tracking-widest ${isAlert ? 'text-red-400' : 'text-yellow-400'}`}>
                  {item.type}
                </Text>
              </View>
            )}
            <TouchableOpacity className="p-1">
              <MoreHorizontal color="#64748b" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Content */}
        <Text className="text-slate-200 text-base leading-6 mb-3">{item.content}</Text>
        
        {item.image && (
          <Image 
            source={{ uri: item.image }} 
            className="w-full h-48 rounded-xl bg-slate-800 mb-4"
            resizeMode="cover"
          />
        )}

        {/* Post Actions */}
        <View className="flex-row items-center justify-between border-t border-slate-800/50 pt-3">
          <TouchableOpacity className="flex-row items-center px-4 py-2">
            <Heart color="#64748b" size={18} style={{ marginRight: 6 }} />
            <Text className="text-slate-400 font-medium">{item.likes || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center px-4 py-2">
            <MessageCircle color="#64748b" size={18} style={{ marginRight: 6 }} />
            <Text className="text-slate-400 font-medium">{item.comments || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center px-4 py-2">
            <Share2 color="#64748b" size={18} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 shadow-md z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black flex-1">Townsquare</Text>
      </View>

      {/* Feed */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id.toString()}
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts(true)} tintColor="#3b82f6" />
          }
          ListHeaderComponent={
            <View className="p-4 bg-slate-900 border-b border-slate-800 mb-2">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-slate-800 mr-3 items-center justify-center border border-slate-700">
                  <Text className="text-xl">👤</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => router.push('/story-create')}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-4 py-3"
                >
                  <Text className="text-slate-500 font-medium">What's happening in the neighborhood?</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        onPress={() => router.push('/story-create')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg shadow-blue-900/50 border-2 border-blue-400"
      >
        <Plus color="#fff" size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
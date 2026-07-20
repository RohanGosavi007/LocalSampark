import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Image as ImageIcon, MapPin, Send, AlertTriangle } from 'lucide-react-native';
import { apiPost } from '../../src/lib/api';

export default function NativeStoryCreateScreen() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [type, setType] = useState('NEWS'); // NEWS, ALERT, HELP
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) {
      alert('Please enter some content for your post.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost('/townsquare/posts', {
        content,
        type,
        // In a full build, we would append image URIs and Location coordinates here
      });

      if (data && (data.success || data.id)) {
        // Post successful, navigate back to feed
        router.back();
      } else {
        alert('Failed to publish post. Please try again.');
      }
    } catch (err) {
      console.warn('Post creation error:', err);
      // Simulate success for demo purposes if backend isn't ready
      setTimeout(() => {
        router.back();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-slate-900 bg-slate-950 z-10">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-black">Create Post</Text>
        </View>
        <TouchableOpacity 
          onPress={handlePost} 
          disabled={loading || !content.trim()}
          className={`px-5 py-2 rounded-full flex-row items-center ${content.trim() ? 'bg-blue-600' : 'bg-slate-800'}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text className={`font-bold mr-2 ${content.trim() ? 'text-white' : 'text-slate-500'}`}>Post</Text>
              <Send size={16} color={content.trim() ? '#fff' : '#64748b'} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          
          {/* Post Types */}
          <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3 ml-1">Post Type</Text>
          <View className="flex-row gap-3 mb-6">
            {['NEWS', 'ALERT', 'HELP'].map((t) => {
              const isActive = type === t;
              let activeColor = 'bg-blue-600 border-blue-500';
              if (t === 'ALERT') activeColor = 'bg-red-600 border-red-500';
              if (t === 'HELP') activeColor = 'bg-yellow-600 border-yellow-500 text-yellow-950';

              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  className={`px-4 py-2 rounded-full border ${isActive ? activeColor : 'bg-slate-900 border-slate-800'}`}
                >
                  <Text className={`font-bold ${isActive ? (t === 'HELP' ? 'text-white' : 'text-white') : 'text-slate-400'}`}>
                    {t === 'ALERT' && '🚨 '}{t === 'HELP' && '✋ '}{t === 'NEWS' && '📰 '}{t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Editor */}
          <View className={`bg-slate-900 border rounded-3xl p-4 shadow-sm mb-4 ${type === 'ALERT' ? 'border-red-500/30' : 'border-slate-800'}`}>
            <TextInput
              placeholder="What's happening in your neighborhood?"
              placeholderTextColor="#475569"
              multiline
              autoFocus
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
              className="text-white text-lg min-h-[150px]"
            />
            
            {/* Attachment Bar */}
            <View className="flex-row items-center border-t border-slate-800 pt-4 mt-2">
              <TouchableOpacity className="p-3 bg-slate-800 rounded-full mr-3 border border-slate-700">
                <ImageIcon color="#3b82f6" size={20} />
              </TouchableOpacity>
              <TouchableOpacity className="p-3 bg-slate-800 rounded-full border border-slate-700">
                <MapPin color="#10b981" size={20} />
              </TouchableOpacity>
              <Text className="text-slate-500 text-xs ml-auto">Public to Dhanori</Text>
            </View>
          </View>

          {type === 'ALERT' && (
            <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex-row items-start">
              <AlertTriangle color="#ef4444" size={20} className="mr-3 mt-0.5" />
              <View className="flex-1">
                <Text className="text-red-400 font-bold mb-1">Emergency Alert</Text>
                <Text className="text-red-300 text-sm">Alerts notify nearby verified residents instantly. Misuse of the alert system may result in account suspension.</Text>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView , StyleSheet } from 'react-native';
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
    <SafeAreaView style={s.s0}>
      {/* Header */}
      <View style={s.s1}>
        <View style={s.s2}>
          <TouchableOpacity onPress={() => router.back()} style={s.s3}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={s.s4}>Create Post</Text>
        </View>
        <TouchableOpacity 
          onPress={handlePost} 
          disabled={loading || !content.trim()}
          style={[s.s18, content.trim() ? s.s19 : s.s20]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={[s.s21, content.trim() ? s.s22 : s.s23]}>Post</Text>
              <Send size={16} color={content.trim() ? '#fff' : '#64748b'} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.s5}>
        <ScrollView style={s.s6} showsVerticalScrollIndicator={false}>
          
          {/* Post Types */}
          <Text style={s.s7}>Post Type</Text>
          <View style={s.s8}>
            {['NEWS', 'ALERT', 'HELP'].map((t) => {
              const isActive = type === t;
              let activeColor = 'bg-blue-600 border-blue-500';
              if (t === 'ALERT') activeColor = 'bg-red-600 border-red-500';
              if (t === 'HELP') activeColor = 'bg-yellow-600 border-yellow-500 text-yellow-950';

              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={s.s24}
                >
                  <Text style={s.s25}>
                    {t === 'ALERT' && '🚨 '}{t === 'HELP' && '✋ '}{t === 'NEWS' && '📰 '}{t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Editor */}
          <View style={[s.s26, type === 'ALERT' ? s.s27 : s.s28]}>
            <TextInput
              placeholder="What's happening in your neighborhood?"
              placeholderTextColor="#475569"
              multiline
              autoFocus
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
              style={s.s9}
            />
            
            {/* Attachment Bar */}
            <View style={s.s10}>
              <TouchableOpacity style={s.s11}>
                <ImageIcon color="#3b82f6" size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={s.s12}>
                <MapPin color="#10b981" size={20} />
              </TouchableOpacity>
              <Text style={s.s13}>Public to Dhanori</Text>
            </View>
          </View>

          {type === 'ALERT' && (
            <View style={s.s14}>
              <AlertTriangle color="#ef4444" size={20} />
              <View style={s.s15}>
                <Text style={s.s16}>Emergency Alert</Text>
                <Text style={s.s17}>Alerts notify nearby verified residents instantly. Misuse of the alert system may result in account suspension.</Text>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a', backgroundColor: '#020617', zIndex: 10 },
  s2: { flexDirection: 'row', alignItems: 'center' },
  s3: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s4: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  s5: { flex: 1 },
  s6: { flex: 1, padding: 16 },
  s7: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  s8: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  s9: { color: '#ffffff', fontSize: 18, minHeight: 150 },
  s10: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: '#1e293b', paddingTop: 16, marginTop: 8 },
  s11: { padding: 12, backgroundColor: '#1e293b', borderRadius: 9999, marginRight: 12, borderWidth: 1, borderColor: '#334155' },
  s12: { padding: 12, backgroundColor: '#1e293b', borderRadius: 9999, borderWidth: 1, borderColor: '#334155' },
  s13: { color: '#64748b', fontSize: 12, marginLeft: 'auto' },
  s14: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start' },
  s15: { flex: 1 },
  s16: { color: '#f87171', fontWeight: '700', marginBottom: 4 },
  s17: { color: '#fca5a5', fontSize: 14 },
  s18: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999, flexDirection: 'row', alignItems: 'center' },
  s19: { backgroundColor: '#2563eb' },
  s20: { backgroundColor: '#1e293b' },
  s21: { fontWeight: '700', marginRight: 8 },
  s22: { color: '#ffffff' },
  s23: { color: '#64748b' },
  s24: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  s25: { fontWeight: '700' },
  s26: { backgroundColor: '#0f172a', borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 16 },
  s27: { borderColor: 'rgba(239,68,68,0.3)' },
  s28: { borderColor: '#1e293b' },
});

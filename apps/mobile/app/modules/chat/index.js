import React, { useState, useEffect, useCallback } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { apiGet } from '../../../src/lib/api';

/**
 * Message list.
 *
 * Three invented conversations sat here — "Sharma Grocery: Your order is
 * ready.", "Riya (Pet Owner): Thank you for finding Coco!", "LocalSampark
 * Support: Your refund has been processed." A user with a genuine refund
 * pending would have read the third one and believed it. Tapping any of them
 * called `alert('Open chat with ...')`, so there was nothing behind them either.
 *
 * /chat/conversations returns the real threads, derived from the messages table.
 */
function ChatModule() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/chat/conversations');
      const rows = Array.isArray(res) ? res : (res?.data ?? []);
      setChats(
        rows.map((c) => ({
          id: String(c.user_id),
          name: c.name || 'Conversation',
          lastMsg: c.last_message || '',
          time: c.last_message_at ? relativeTime(c.last_message_at) : '',
          unread: Number(c.unread_count) || 0,
        }))
      );
    } catch (err) {
      setChats([]);
      setError(err?.message || 'Could not load your messages.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>💬 Messages</Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}><ActivityIndicator color="#3b82f6" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#3b82f6" />
          }
        >
          {chats.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {error ? 'Could not load your messages' : 'No messages yet'}
              </Text>
              <Text style={styles.stateBody}>
                {error || 'Conversations with shops and neighbours will appear here.'}
              </Text>
              {error ? (
                <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : chats.map(chat => (
            // app/chat/[shopId].js is the only thread screen in the app. The old
            // handler called alert('Open chat with ...'), which opened nothing.
            <TouchableOpacity
              key={chat.id}
              style={styles.chatRow}
              onPress={() => router.push(`/chat/${chat.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(chat.name || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                </View>
                <View style={styles.chatHeader}>
                  <Text style={[styles.chatMsg, chat.unread > 0 && styles.chatMsgUnread]} numberOfLines={1}>
                    {chat.lastMsg}
                  </Text>
                  {chat.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Relative timestamp, rather than the mock's fixed "10:30 AM" / "Yesterday". */
function relativeTime(iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return then.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (hours < 48) return 'Yesterday';
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  // Was #0f172a — near-black on a blue circle.
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  chatTime: { color: '#64748b', fontSize: 12 },
  chatMsg: { color: '#64748b', fontSize: 14, flex: 1, marginRight: 12 },
  chatMsgUnread: { color: '#0f172a', fontWeight: 'bold' },
  unreadBadge: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  // Was #0f172a on red.
  unreadText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', margin: 16 },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});

export default withRoleGuard(ChatModule, 'chat');

import React, { useState } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';

function ChatModule() {
  const [chats] = useState([
    { id: 1, name: 'Sharma Grocery', lastMsg: 'Your order is ready.', time: '10:30 AM', unread: 1 },
    { id: 2, name: 'Riya (Pet Owner)', lastMsg: 'Thank you for finding Coco!', time: 'Yesterday', unread: 0 },
    { id: 3, name: 'LocalSampark Support', lastMsg: 'Your refund has been processed.', time: 'Mon', unread: 0 },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>💬 Messages</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {chats.map(chat => (
          <TouchableOpacity key={chat.id} style={styles.chatRow} onPress={() => alert(`Open chat with ${chat.name}`)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{chat.name.charAt(0)}</Text></View>
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.chatTime}>{chat.time}</Text>
              </View>
              <View style={styles.chatHeader}>
                <Text style={[styles.chatMsg, chat.unread > 0 && styles.chatMsgUnread]} numberOfLines={1}>{chat.lastMsg}</Text>
                {chat.unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{chat.unread}</Text></View>}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  chatTime: { color: '#64748b', fontSize: 12 },
  chatMsg: { color: '#64748b', fontSize: 14, flex: 1, marginRight: 12 },
  chatMsgUnread: { color: '#0f172a', fontWeight: 'bold' },
  unreadBadge: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  unreadText: { color: '#0f172a', fontSize: 10, fontWeight: 'bold' }
});


export default withRoleGuard(ChatModule, 'chat');

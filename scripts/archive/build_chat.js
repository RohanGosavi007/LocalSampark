const fs = require('fs');
const path = require('path');

const content = `import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';
import { io } from 'socket.io-client';

export default function ChatModule() {
  const { authToken } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // contact object
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchContacts();
    
    // Connect Socket
    const s = io('http://10.0.2.2:5000', { auth: { token: authToken } });
    s.on('connect', () => console.log('Chat socket connected'));
    s.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    setSocket(s);

    return () => s.disconnect();
  }, [authToken]);

  const apiFetch = async (endpoint) => {
    try {
      const res = await fetch(\`http://10.0.2.2:5000/api/v1/\${endpoint}\`, {
        headers: { 'Authorization': \`Bearer \${authToken}\`, 'Content-Type': 'application/json' }
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    const json = await apiFetch('chat/contacts');
    if (json.success) setContacts(json.data || []);
    setLoading(false);
  };

  const loadChatHistory = async (contact) => {
    setActiveChat(contact);
    setLoading(true);
    const json = await apiFetch(\`chat/history/\${contact.id}\`);
    if (json.success) setMessages(json.data || []);
    setLoading(false);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if(query.length > 2) {
      const json = await apiFetch(\`chat/search-users?q=\${query}\`);
      if(json.success) setSearchResults(json.data || []);
    } else {
      setSearchResults([]);
    }
  };

  const startNewChat = (user) => {
    setActiveChat(user);
    setMessages([]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeChat) return;
    const msgData = { receiverId: activeChat.id, content: newMessage, sender_id: 'me', created_at: new Date().toISOString() };
    
    // Optimistic UI update
    setMessages([...messages, msgData]);
    setNewMessage('');

    // Emit via socket
    if (socket) {
      socket.emit('send_message', { receiverId: activeChat.id, content: msgData.content });
    }
  };

  const renderContactsList = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>💬 Messages</Text>
      </View>

      <View style={{padding: 15}}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search users to start chatting..." 
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        
        {searchQuery.length > 2 && (
          <View style={styles.searchResults}>
            {searchResults.length === 0 && <Text style={{color:'#94a3b8', padding:10}}>No users found.</Text>}
            {searchResults.map(user => (
              <TouchableOpacity key={user.id} style={styles.contactCard} onPress={() => startNewChat(user)}>
                <View style={styles.avatar}><Text>👤</Text></View>
                <Text style={styles.contactName}>{user.full_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading && <ActivityIndicator size="large" color="#3b82f6" />}
        {!loading && contacts.length === 0 && <Text style={styles.emptyText}>No recent chats. Search for a user above.</Text>}
        {contacts.map(c => (
          <TouchableOpacity key={c.id} style={styles.contactCard} onPress={() => loadChatHistory(c)}>
            <View style={styles.avatar}><Text>👤</Text></View>
            <View style={{flex: 1}}>
              <Text style={styles.contactName}>{c.full_name}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>{c.last_message || 'Tap to chat'}</Text>
            </View>
            {c.unread_count > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{c.unread_count}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderChatRoom = () => (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setActiveChat(null)} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
          <View style={[styles.avatar, {width:35, height:35}]}><Text>👤</Text></View>
          <Text style={styles.title}>{activeChat.full_name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.chatArea}>
        {loading && <ActivityIndicator size="large" color="#3b82f6" />}
        {messages.map((m, i) => {
          const isMe = m.sender_id === 'me';
          return (
            <View key={i} style={[styles.msgBubble, isMe ? styles.myMsg : styles.theirMsg]}>
              <Text style={{color: '#fff'}}>{m.content}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput 
          style={styles.msgInput} 
          placeholder="Type a message..." 
          placeholderTextColor="#64748b"
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={{color:'#fff', fontWeight:'bold'}}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return activeChat ? renderChatRoom() : renderContactsList();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060b18' },
  header: { padding: 16, backgroundColor: '#0d1526', borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  searchInput: { backgroundColor: '#0d1526', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
  searchResults: { backgroundColor: '#0d1526', borderRadius: 8, marginTop: 5, borderWidth: 1, borderColor: '#1e293b', maxHeight: 200 },
  list: { padding: 15 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 20 },
  contactCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#0d1526', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1e293b' },
  avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  contactName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  lastMsg: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  badge: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  chatArea: { padding: 15, paddingBottom: 30, gap: 10 },
  msgBubble: { padding: 12, borderRadius: 16, maxWidth: '80%' },
  myMsg: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirMsg: { backgroundColor: '#1e293b', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  
  inputArea: { flexDirection: 'row', padding: 15, backgroundColor: '#0d1526', borderTopWidth: 1, borderTopColor: '#1e293b', alignItems: 'center', gap: 10 },
  msgInput: { flex: 1, backgroundColor: '#060b18', color: '#fff', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b' },
  sendBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 }
});
`;

const targetPath = path.join(__dirname, 'apps', 'mobile', 'app', 'modules', 'chat', 'index.js');
fs.writeFileSync(targetPath, content);
console.log('Successfully added live Chat APIs to mobile chat module!');

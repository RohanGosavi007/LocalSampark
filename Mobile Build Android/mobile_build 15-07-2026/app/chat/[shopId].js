import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Send, PhoneCall, ArrowLeft } from 'lucide-react-native';

export default function MobileChatScreen() {
  const { shopId, shopName } = useLocalSearchParams();
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hi, is the Paneer Tikka available?', sender: 'me', time: '10:00 AM' },
    { id: '2', text: 'Yes, it is! Would you like to place an order?', sender: 'shop', time: '10:02 AM' }
  ]);
  const [inputText, setInputText] = useState('');

  const sendMessage = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: inputText,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInputText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <ArrowLeft size={24} color="#111827" />
          <View>
            <Text style={styles.shopName}>{shopName || 'Shop Support'}</Text>
            <Text style={styles.onlineStatus}>Online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callBtn}>
          <PhoneCall size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {messages.map(msg => (
            <View key={msg.id} style={[styles.bubble, msg.sender === 'me' ? styles.myBubble : styles.shopBubble]}>
              <Text style={[styles.msgText, msg.sender === 'me' ? {color: '#fff'} : {color: '#111827'}]}>{msg.text}</Text>
              <Text style={[styles.msgTime, msg.sender === 'me' ? {color: '#e0e7ff'} : {color: '#9ca3af'}]}>{msg.time}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  shopName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  onlineStatus: { fontSize: 12, color: '#10b981', fontWeight: '500' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center' },
  
  chatArea: { flex: 1 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  myBubble: { backgroundColor: '#4f46e5', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  shopBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  msgText: { fontSize: 15 },
  msgTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4, fontWeight: 'bold' },
  
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 12 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, backgroundColor: '#f3f4f6', borderRadius: 24, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 15, color: '#111827' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' }
});

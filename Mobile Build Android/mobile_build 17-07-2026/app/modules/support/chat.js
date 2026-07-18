import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

import { API_V1 } from '../../config/api';
export default function MobileSupportChat() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! Welcome to LocalSampark Support. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [needsDetails, setNeedsDetails] = useState(false);
  const scrollViewRef = useRef();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');

    try {
      const payload = needsDetails 
        ? { message: 'details', visitorDetails: userMessage, isFinal: true }
        : { message: userMessage };

      const res = await fetch(`${API_V1}/chatbot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);

      if (data.needsDetails) {
        setNeedsDetails(true);
      } else if (payload.isFinal) {
        setNeedsDetails(false);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, the server is unreachable right now.' }]);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LocalSampark Assistant</Text>
        <Text style={styles.headerSub}>Always online</Text>
      </View>

      <ScrollView 
        style={styles.chatArea} 
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, idx) => (
          <View key={idx} style={msg.role === 'user' ? styles.userBubbleContainer : styles.botBubbleContainer}>
            <View style={msg.role === 'user' ? styles.userBubble : styles.botBubble}>
              <Text style={msg.role === 'user' ? styles.userText : styles.botText}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput 
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={needsDetails ? "Enter your Name & Phone..." : "Type a message..."}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingTop: 50 },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#10b981', fontSize: 12, marginTop: 4 },
  chatArea: { flex: 1, padding: 15 },
  botBubbleContainer: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 15 },
  userBubbleContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 },
  botBubble: { backgroundColor: '#ffffff', padding: 12, borderRadius: 15, borderBottomLeftRadius: 5, maxWidth: '80%', borderWidth: 1, borderColor: '#e2e8f0' },
  userBubble: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 15, borderBottomRightRadius: 5, maxWidth: '80%' },
  botText: { color: '#e2e8f0', fontSize: 15, lineHeight: 22 },
  userText: { color: '#0f172a', fontSize: 15, lineHeight: 22 },
  inputArea: { flexDirection: 'row', padding: 15, backgroundColor: '#ffffff', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f8fafc', color: '#0f172a', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 25, fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  sendBtn: { backgroundColor: '#4f46e5', width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  sendIcon: { color: '#0f172a', fontSize: 18 }
});

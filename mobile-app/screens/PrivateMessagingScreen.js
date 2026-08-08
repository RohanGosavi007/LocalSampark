import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';

const PrivateMessagingScreen = () => {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hi Sunita, wanted to discuss the Diwali catering.', sender: 'me', time: '10:00 AM' },
    { id: '2', text: 'Sure Ramesh, let me know what options you have in mind.', sender: 'other', time: '10:05 AM' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, { id: Date.now().toString(), text: newMessage, sender: 'me', time: 'Now' }]);
      setNewMessage('');
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.sender === 'me' ? styles.myMessage : styles.otherMessage]}>
      <Text style={[styles.messageText, item.sender === 'me' ? styles.myMessageText : styles.otherMessageText]}>
        {item.text}
      </Text>
      <Text style={styles.timeText}>{item.time}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sunita Sharma (B-405)</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFF1' },
  header: { padding: 20, backgroundColor: '#0277BD', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  list: { padding: 15 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 15, marginBottom: 10 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#0288D1', borderBottomRightRadius: 0 },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: 'white', borderBottomLeftRadius: 0 },
  messageText: { fontSize: 15 },
  myMessageText: { color: 'white' },
  otherMessageText: { color: '#333' },
  timeText: { fontSize: 10, color: '#B0BEC5', alignSelf: 'flex-end', marginTop: 5 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#CFD8DC' },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16 },
  sendButton: { marginLeft: 10, backgroundColor: '#0277BD', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 20 },
  sendButtonText: { color: 'white', fontWeight: 'bold' }
});

export default PrivateMessagingScreen;

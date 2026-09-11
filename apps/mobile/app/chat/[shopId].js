import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Send, PhoneCall, ArrowLeft } from 'lucide-react-native';

/**
 * Shop chat.
 *
 * Two fabrications and one broken promise.
 *
 * The screen opened on a conversation that had never happened -- the customer
 * apparently asking "Hi, is the Paneer Tikka available?" and the shop replying
 * "Yes, it is! Would you like to place an order?" -- so a real shop appeared to
 * have confirmed stock it had never been asked about. The header also reported
 * the shop as "Online" unconditionally, with nothing behind it.
 *
 * sendMessage appended the text to local state and cleared the box. It looked
 * exactly like a sent message, and it went nowhere: there is no way to send one.
 * chat.routes.js exposes only reads (/contacts, /conversations,
 * /messages/:userId, /search-users) with no POST, and the socket server handles
 * orders, tokens, inventory and fleet locations -- there is no chat event on it
 * either. Nothing in this app or the backend can deliver a message to a shop.
 *
 * So the composer is disabled rather than left accepting input. A customer
 * asking "is my order ready?" into a box that silently discards it is worse off
 * than one told plainly that messaging is not available yet.
 *
 * Reading history is deliberately not wired either: GET /chat/messages/:userId
 * is keyed by a USER id, and this route carries a shopId. Resolving one to the
 * other needs a decision about which account represents a shop, which is a
 * product question rather than a mechanical fix.
 */
export default function MobileChatScreen() {
  const { shopName } = useLocalSearchParams();
  const messages = [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <ArrowLeft size={24} color="#111827" />
          <View>
            <Text style={styles.shopName}>{shopName || 'Shop Support'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.callBtn}>
          <PhoneCall size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.chatArea} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Messaging is not available yet</Text>
              <Text style={styles.emptyDesc}>
                You cannot message this shop from the app for now. Use the call
                button above to reach them.
              </Text>
            </View>
          ) : messages.map(msg => (
            <View key={msg.id} style={[styles.bubble, msg.sender === 'me' ? styles.myBubble : styles.shopBubble]}>
              <Text style={[styles.msgText, msg.sender === 'me' ? {color: '#fff'} : {color: '#111827'}]}>{msg.text}</Text>
              <Text style={[styles.msgTime, msg.sender === 'me' ? {color: '#e0e7ff'} : {color: '#9ca3af'}]}>{msg.time}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            placeholder="Messaging is not available yet"
            placeholderTextColor="#9ca3af"
            editable={false}
            multiline
          />
          <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
            <Send size={20} color="#fff" />
          </View>
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
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#c7d2fe' },
  inputDisabled: { color: '#9ca3af' },

  emptyState: { paddingVertical: 48, paddingHorizontal: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 }
});

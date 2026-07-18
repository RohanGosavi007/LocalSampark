import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

// Mock Bookings Data
const MOCK_BOOKINGS = {
  'B-1001': { id: 'B-1001', serviceName: 'AC Deep Cleaning', date: 'Oct 24, 2026', time: '11:00 AM', status: 'Confirmed', price: '₹799', provider: 'CoolBreeze Experts', providerPhone: '+91 9876543210', address: 'Flat 402, B Wing, Solitaire Society, Dhanori' },
  'B-1002': { id: 'B-1002', serviceName: 'Plumbing Repair', date: 'Oct 25, 2026', time: '02:00 PM', status: 'Pending', price: '₹450', provider: 'Local Plumbers Co', providerPhone: '+91 9123456789', address: 'Flat 402, B Wing, Solitaire Society, Dhanori' }
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { id: 1, sender: 'provider', text: 'Hi! I have received your booking. Will be there on time.', time: '10:00 AM' }
  ]);

  useEffect(() => {
    // Simulate fetch
    if (id && MOCK_BOOKINGS[id]) {
      setBooking(MOCK_BOOKINGS[id]);
    } else {
      setBooking(MOCK_BOOKINGS['B-1001']); // Fallback
    }
  }, [id]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    const newMessage = {
      id: Date.now(),
      sender: 'user',
      text: chatMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory([...chatHistory, newMessage]);
    setChatMessage('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return '#10b981';
      case 'Pending': return '#f59e0b';
      case 'Completed': return '#3b82f6';
      case 'Cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!booking) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking {booking.id}</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status Tracker */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>{booking.status}</Text>
            <View style={styles.trackerLine} />
            <Text style={styles.trackerText}>Provider will arrive at {booking.time}</Text>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.label}>Service</Text>
                <Text style={styles.value}>{booking.serviceName}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.label}>Total Price</Text>
                <Text style={styles.value}>{booking.price}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.label}>Date & Time</Text>
                <Text style={styles.value}>{booking.date} at {booking.time}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.value}>{booking.address}</Text>
              </View>
            </View>
          </View>

          {/* Provider Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Provider Details</Text>
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <Ionicons name="person" size={24} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{booking.provider}</Text>
                <Text style={styles.providerPhone}>{booking.providerPhone}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn}>
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Chat Section */}
          <View style={styles.chatSection}>
            <Text style={styles.sectionTitle}>Chat with Provider</Text>
            <View style={styles.chatBox}>
              {chatHistory.map(msg => (
                <View key={msg.id} style={[styles.messageBubble, msg.sender === 'user' ? styles.myMessage : styles.theirMessage]}>
                  <Text style={[styles.messageText, msg.sender === 'user' ? styles.myMessageText : {}]}>{msg.text}</Text>
                  <Text style={[styles.messageTime, msg.sender === 'user' ? styles.myMessageTime : {}]}>{msg.time}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Chat Input */}
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            value={chatMessage}
            onChangeText={setChatMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  
  content: { padding: 16, paddingBottom: 24 },
  
  statusContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 8 },
  statusText: { fontSize: 18, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  trackerLine: { height: 1, backgroundColor: '#e2e8f0', width: '100%', marginVertical: 12 },
  trackerText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  
  detailRow: { flexDirection: 'row', marginBottom: 16 },
  detailCol: { flex: 1 },
  label: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 15, color: '#1f2937', fontWeight: '600' },
  
  providerRow: { flexDirection: 'row', alignItems: 'center' },
  providerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  providerName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  providerPhone: { fontSize: 13, color: '#64748b', marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  
  chatSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', flex: 1 },
  chatBox: { minHeight: 200, backgroundColor: '#f8fafc', borderRadius: 8, padding: 12 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  theirMessage: { backgroundColor: '#e2e8f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  myMessage: { backgroundColor: '#3b82f6', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  messageText: { fontSize: 14, color: '#1f2937' },
  myMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#64748b', marginTop: 4, alignSelf: 'flex-end' },
  myMessageTime: { color: '#bfdbfe' },
  
  chatInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  chatInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, marginRight: 12 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }
});

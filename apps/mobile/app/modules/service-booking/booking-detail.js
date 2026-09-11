import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { apiGet } from '../../../src/lib/api';

/**
 * Booking detail.
 *
 * This screen called no API at all. It held a MOCK_BOOKINGS map and, for any id
 * it did not recognise, fell back to showing 'B-1001' regardless -- so opening
 * ANY booking displayed "AC Deep Cleaning, Oct 24, ₹799, CoolBreeze Experts"
 * along with a dialable +91 phone number and a flat address, none of which
 * existed. It also seeded a chat message supposedly from the provider ("Hi! I
 * have received your booking. Will be there on time."), so the screen showed a
 * conversation that had never taken place.
 *
 * The guard in __tests__/noFabricatedData.test.js missed it because its shape
 * scanner only looks at array literals, and MOCK_BOOKINGS was an object map.
 *
 * Bookings now come from GET /services/my-bookings, which returns the caller's
 * own rows from service_bookings; there is no single-booking endpoint, so the
 * row is selected from that list. An id that is not in it is reported as not
 * found rather than silently swapped for a different booking.
 *
 * Note the endpoint choice. /home-services/bookings looks like a match but
 * queries home_service_bookings, a separate table behind a different flow; ids
 * from this screen's sibling list would never have been found in it. The
 * neighbouring list screen asked for /services/bookings, which does not exist at
 * all -- the routes are /services/my-bookings and /services/home-services/bookings
 * -- so that list has been 404ing and showing empty in every release build.
 */
export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  // Starts empty. Any real message history belongs to the messaging API, not to
  // a literal in this file.
  const [chatHistory, setChatHistory] = useState([]);

  const loadBooking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/services/my-bookings');
      const rows = Array.isArray(data) ? data : (data?.rows ?? data?.bookings ?? []);
      const match = rows.find((b) => String(b.id) === String(id));
      if (!match) {
        setBooking(null);
        setError('This booking could not be found.');
        return;
      }
      // scheduled_time carries both halves; split it rather than inventing a
      // separate date, and leave either null when it is absent so the UI can
      // omit the field instead of printing "null at null".
      const when = match.scheduled_time ? new Date(match.scheduled_time) : null;
      const valid = when && !Number.isNaN(when.getTime());
      setBooking({
        id: match.id,
        serviceName: match.service_name || match.serviceName || 'Service',
        date: valid ? when.toLocaleDateString() : null,
        time: valid ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        status: match.status || 'Pending',
        price: match.price != null ? `₹${match.price}` : null,
        provider: match.provider || match.provider_name || null,
        providerPhone: match.provider_phone || match.providerPhone || null,
        address: match.address || null,
      });
    } catch (e) {
      setBooking(null);
      setError(e?.message || 'Could not load this booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadBooking(); }, [loadBooking]);

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

  // Previously `if (!booking) return null`, which was unreachable because a
  // booking was always substituted. Now that a booking can genuinely be absent,
  // returning null would render a blank screen and hide the reason.
  if (loading || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" />
          ) : (
            <>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 6, textAlign: 'center' }}>
                Booking unavailable
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
                {error || 'This booking could not be loaded.'}
              </Text>
              <TouchableOpacity
                onPress={loadBooking}
                style={{ backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

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

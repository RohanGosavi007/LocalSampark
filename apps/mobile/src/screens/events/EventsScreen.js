import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar, MapPin, Ticket, Sparkles, Users } from 'lucide-react-native';
import { apiGet, apiPost } from '../../lib/api';

export default function NativeEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const data = await apiGet('/events');
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.events) ? data.events : (Array.isArray(data) ? data : []));
      setEvents(list);
    } catch (e) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRSVP = (evt) => {
    const isPaid = Number(evt.ticket_price || evt.price || 0) > 0;
    Alert.alert(
      'Book Ticket / RSVP',
      `Confirm 1 ticket for "${evt.title}"? ${isPaid ? `₹${evt.ticket_price || evt.price} will be deducted from your wallet.` : 'This is a free event.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm RSVP',
          onPress: async () => {
            try {
              const res = await apiPost(`/events/${evt.id}/rsvp`, { numTickets: 1, ticket_count: 1 });
              const ref = res?.data?.bookingRef || res?.bookingRef || res?.data?.ticketId || res?.ticketId || 'CONFIRMED';
              Alert.alert('Tickets Booked 🎉', res?.message || `Your booking is confirmed! Reference: ${ref}`);
              loadEvents();
            } catch (err) {
              Alert.alert('Booking Notice', err?.message || 'Could not complete ticket booking.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text style={s.s3}>Local Events & Gatherings</Text>
        <View style={s.s4} />
      </View>

      <ScrollView style={s.s5}>
        <Text style={s.s6}>Upcoming Neighborhood Events</Text>

        {loading ? (
          <ActivityIndicator color="#6366f1" />
        ) : events.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>No Upcoming Events</Text>
            <Text style={s.emptyBody}>There are no community events scheduled in your neighborhood right now. Check back soon!</Text>
          </View>
        ) : (
          events.map(e => (
            <View key={e.id} style={s.s7}>
              <View style={s.s8}>
                <View style={s.s9}>
                  <Text style={s.s10}>{e.category}</Text>
                </View>
                <Text style={s.s11}>{e.ticket_price === 0 ? 'FREE' : `₹${e.ticket_price}`}</Text>
              </View>

              <Text style={s.s12}>{e.title}</Text>

              <View style={s.s13}>
                <View style={s.s14}>
                  <Calendar color="#94a3b8" size={14} />
                  <Text style={s.s15}>{e.event_date} @ {e.event_time}</Text>
                </View>
                <View style={s.s16}>
                  <MapPin color="#94a3b8" size={14} />
                  <Text style={s.s17}>{e.venue}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => handleRSVP(e)} style={s.s18}>
                <Ticket color="#ffffff" size={16} />
                <Text style={s.s19}>Reserve Ticket Pass</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  emptyBox: { backgroundColor: '#0f172a', borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#1e293b', marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  s2: { width: 40, height: 40, backgroundColor: '#0f172a', borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  s3: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s4: { width: 40 },
  s5: { flex: 1, padding: 16 },
  s6: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 },
  s7: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, padding: 20, marginBottom: 16 },
  s8: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  s9: { backgroundColor: '#451a03', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, borderColor: '#92400e' },
  s10: { color: '#fbbf24', fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  s11: { color: '#34d399', fontWeight: '800', fontSize: 16 },
  s12: { color: '#ffffff', fontWeight: '800', fontSize: 18, marginBottom: 12 },
  s13: { gap: 4, marginBottom: 16 },
  s14: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  s15: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  s16: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  s17: { color: '#94a3b8', fontSize: 12 },
  s18: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  s19: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});

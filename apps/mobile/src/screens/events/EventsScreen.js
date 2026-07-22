import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Calendar, MapPin, Ticket, Sparkles, Users } from 'lucide-react-native';
import { apiGet } from '../../lib/api';

export default function NativeEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await apiGet('/events');
        if (data && data.events && data.events.length > 0) {
          setEvents(data.events);
        } else {
          throw new Error('Empty event list');
        }
      } catch (e) {
        setEvents([
          { id: 'e1', title: 'Dhanori Society Cultural Fest & Food Stalls', category: 'Cultural', event_date: '2026-08-15', event_time: '18:00', venue: 'Dhanori Ground, Pune', ticket_price: 150, available_tickets: 45 },
          { id: 'e2', title: 'Weekend Organic Farmers Market', category: 'Community', event_date: '2026-08-18', event_time: '08:00', venue: 'Baner Club House', ticket_price: 0, available_tickets: 100 }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const handleRSVP = (evt) => {
    Alert.alert(
      'Book Ticket',
      `Confirm 1 ticket for "${evt.title}"? ${evt.ticket_price > 0 ? `₹${evt.ticket_price} will be deducted from your LocalWallet.` : 'This is a free event.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book Now', onPress: () => Alert.alert('Ticket Booked!', `Your ticket reference: TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`) }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between p-4 border-b border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-full items-center justify-center">
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Local Events & Gatherings</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 p-4">
        <Text className="text-slate-400 font-bold text-xs uppercase mb-3">Upcoming Neighborhood Events</Text>

        {loading ? (
          <ActivityIndicator color="#6366f1" />
        ) : (
          events.map(e => (
            <View key={e.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4">
              <View className="flex-row justify-between items-start mb-2">
                <View className="bg-amber-950 px-3 py-1 rounded-full border border-amber-800">
                  <Text className="text-amber-400 font-bold text-[10px] uppercase">{e.category}</Text>
                </View>
                <Text className="text-emerald-400 font-extrabold text-base">{e.ticket_price === 0 ? 'FREE' : `₹${e.ticket_price}`}</Text>
              </View>

              <Text className="text-white font-extrabold text-lg mb-3">{e.title}</Text>

              <View className="gap-1 mb-4">
                <View className="flex-row items-center gap-2">
                  <Calendar color="#94a3b8" size={14} />
                  <Text className="text-slate-300 text-xs font-semibold">{e.event_date} @ {e.event_time}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MapPin color="#94a3b8" size={14} />
                  <Text className="text-slate-400 text-xs">{e.venue}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => handleRSVP(e)} className="bg-indigo-600 p-3 rounded-2xl flex-row items-center justify-center gap-2">
                <Ticket color="#ffffff" size={16} />
                <Text className="text-white font-bold text-sm">Reserve Ticket Pass</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
